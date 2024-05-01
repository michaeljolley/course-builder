'use server'

import { cookies } from 'next/headers'
import { courseBuilderAdapter } from '@/db'
import { LESSON_COMPLETED_EVENT } from '@/inngest/events/lesson-completed'
import { inngest } from '@/inngest/inngest.server'
import { SubscriberSchema } from '@/schemas/subscriber'
import { getServerAuthSession } from '@/server/auth'

export async function addProgress({ resourceId }: { resourceId: string }) {
	const { session } = await getServerAuthSession()
	const user = session?.user

	const { findOrCreateUser, completeLessonProgressForUser } =
		courseBuilderAdapter
	console.log('adding progress')
	try {
		if (user) {
			await completeLessonProgressForUser({
				userId: user.id,
				lessonId: resourceId,
			})
			return await sendInngestProgressEvent({
				user: user,
				lessonId: resourceId,
			})
		} else {
			const subscriberCookie = cookies().get('ck_subscriber')

			if (!subscriberCookie) {
				console.debug('no subscriber cookie')
				return { error: 'no subscriber found' }
			}

			const subscriber = SubscriberSchema.parse(
				JSON.parse(subscriberCookie.value),
			)

			if (!subscriber?.email_address) {
				console.debug('no subscriber cookie')
				return { error: 'no subscriber found' }
			}

			console.log({ subscriber })

			const { user } = await findOrCreateUser(
				subscriber.email_address,
				subscriber.first_name,
			)

			console.log({ user })

			return await completeLessonProgressForUser({
				userId: user.id,
				lessonId: resourceId,
			})
		}
	} catch (error) {
		console.error(error)
		let message = 'Unknown Error'
		if (error instanceof Error) message = error.message
		return { error: message }
	}
}

export async function sendInngestProgressEvent({
	user,
	lessonId,
	lessonSlug,
}: {
	user: any
	lessonId: string
	lessonSlug?: string
}) {
	// TODO: execute a function that will email after a debounce to encourage
	await inngest.send({
		name: LESSON_COMPLETED_EVENT,
		data: {
			lessonId: lessonId,
		},
		user,
	})
}

export async function getModuleProgressForUser(moduleIdOrSlug: string) {
	const { session } = await getServerAuthSession()
	if (session) {
		const moduleProgress = await courseBuilderAdapter.getModuleProgressForUser(
			session.user.id,
			moduleIdOrSlug,
		)
		return moduleProgress
	}

	const subscriberCookie = cookies().get('ck_subscriber')

	if (!subscriberCookie) {
		console.error('no subscriber cookie')
		return []
	}

	const subscriber = SubscriberSchema.parse(JSON.parse(subscriberCookie.value))

	if (!subscriber?.email_address) {
		console.error('no subscriber cookie')
		return []
	}
	const moduleProgress = await courseBuilderAdapter.getModuleProgressForUser(
		subscriber.email_address,
		moduleIdOrSlug,
	)
	return moduleProgress
}