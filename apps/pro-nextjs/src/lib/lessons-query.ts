'use server'

import { courseBuilderAdapter, db } from '@/db'
import { contentResource, contentResourceResource } from '@/db/schema'
import { env } from '@/env.mjs'
import { LessonSchema } from '@/lib/lessons'
import type { TipUpdate } from '@/lib/tips'
import { getServerAuthSession } from '@/server/auth'
import { guid } from '@/utils/guid'
import slugify from '@sindresorhus/slugify'
import { Redis } from '@upstash/redis'
import { and, asc, eq, like, or, sql } from 'drizzle-orm'
import { last } from 'lodash'

import type { ContentResourceResource } from '@coursebuilder/core/types'

const redis = Redis.fromEnv()

export const addVideoResourceToLesson = async ({
	videoResourceId,
	lessonId,
}: {
	videoResourceId: string
	lessonId: string
}) => {
	const { session, ability } = await getServerAuthSession()
	const user = session?.user

	if (!user || !ability.can('create', 'Content')) {
		throw new Error('Unauthorized')
	}

	const videoResource = await db.query.contentResource.findFirst({
		where: and(
			eq(contentResource.id, videoResourceId),
			eq(contentResource.type, 'videoResource'),
		),
		with: {
			resources: true,
		},
	})

	const lesson = await db.query.contentResource.findFirst({
		where: and(
			like(contentResource.id, `%${last(lessonId.split('-'))}%`),
			eq(contentResource.type, 'lesson'),
		),
		with: {
			resources: true,
		},
	})

	if (!lesson) {
		throw new Error(`Lesson with id ${lessonId} not found`)
	}

	if (!videoResource) {
		throw new Error(`Video Resource with id ${videoResourceId} not found`)
	}

	await db.insert(contentResourceResource).values({
		resourceOfId: lesson.id,
		resourceId: videoResource.id,
		position: lesson.resources.length,
	})

	return db.query.contentResourceResource.findFirst({
		where: and(
			eq(contentResourceResource.resourceOfId, lesson.id),
			eq(contentResourceResource.resourceId, videoResource.id),
		),
		with: {
			resource: true,
		},
	})
}

export async function getLesson(lessonSlugOrId: string) {
	const start = new Date().getTime()

	const cachedLesson = await redis.get(
		`lesson:${env.NEXT_PUBLIC_APP_NAME}:${lessonSlugOrId}`,
	)

	const lesson = cachedLesson
		? cachedLesson
		: await db.query.contentResource.findFirst({
				where: and(
					or(
						eq(
							sql`JSON_EXTRACT (${contentResource.fields}, "$.slug")`,
							lessonSlugOrId,
						),
						eq(contentResource.id, lessonSlugOrId),
					),
					or(
						eq(contentResource.type, 'lesson'),
						eq(contentResource.type, 'exercise'),
						eq(contentResource.type, 'solution'),
					),
				),
				with: {
					resources: {
						with: {
							resource: true,
						},
						orderBy: asc(contentResourceResource.position),
					},
				},
			})

	const parsedLesson = LessonSchema.safeParse(lesson)
	if (!parsedLesson.success) {
		console.error('Error parsing lesson', lesson, parsedLesson.error)
		return null
	}

	if (!cachedLesson) {
		await redis.set(
			`lesson:${env.NEXT_PUBLIC_APP_NAME}:${lessonSlugOrId}`,
			lesson,
			{ ex: 10 },
		)
	}

	console.log('getLesson end', { lessonSlugOrId }, new Date().getTime() - start)

	return parsedLesson.data
}

export async function getExerciseSolution(lessonSlugOrId: string) {
	const lesson = await db.query.contentResource.findFirst({
		where: and(
			or(
				eq(
					sql`JSON_EXTRACT (${contentResource.fields}, "$.slug")`,
					lessonSlugOrId,
				),
				eq(contentResource.id, lessonSlugOrId),
			),
			or(
				eq(contentResource.type, 'lesson'),
				eq(contentResource.type, 'exercise'),
				eq(contentResource.type, 'solution'),
			),
		),
		with: {
			resources: {
				with: {
					resource: {
						with: {
							resources: {
								with: {
									resource: true,
								},
							},
						},
					},
				},
				orderBy: asc(contentResourceResource.position),
			},
		},
	})

	const parsedLesson = LessonSchema.safeParse(lesson)
	if (!parsedLesson.success) {
		console.error('Error parsing lesson', lesson)
		return null
	}

	const solution = parsedLesson.data?.resources?.find(
		(resource: ContentResourceResource) =>
			resource.resource.type === 'solution',
	)?.resource

	const parsedSolution = LessonSchema.safeParse(solution)
	if (!parsedSolution.success) {
		console.error('Error parsing solution', solution)
		return null
	}
	return parsedSolution.data
}

export async function updateLesson(input: TipUpdate) {
	const { session, ability } = await getServerAuthSession()
	const user = session?.user
	if (!user || !ability.can('update', 'Content')) {
		throw new Error('Unauthorized')
	}

	const currentLesson = await getLesson(input.id)

	if (!currentLesson) {
		throw new Error(`Tip with id ${input.id} not found.`)
	}

	let lessonSlug = currentLesson.fields.slug

	if (input.fields.title !== currentLesson.fields.title) {
		const splitSlug = currentLesson?.fields.slug.split('~') || ['', guid()]
		lessonSlug = `${slugify(input.fields.title)}~${splitSlug[1] || guid()}`
	}

	return courseBuilderAdapter.updateContentResourceFields({
		id: currentLesson.id,
		fields: {
			...currentLesson.fields,
			...input.fields,
			slug: lessonSlug,
		},
	})
}
