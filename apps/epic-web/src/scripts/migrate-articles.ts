import { db } from '@/db'
import { contentResource } from '@/db/schema'
import { ArticleSchema } from '@/lib/articles'
import { recordResourceContribution } from '@/scripts/contributors-list'
import { writeContributionTypes } from '@/scripts/controbution-types'
import { sanityQuery } from '@/scripts/utils/sanity-client'
import { guid } from '@/utils/guid'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

await writeContributionTypes()

const sanityArticleSchema = z.object({
	contributors: z.array(
		z.object({
			slug: z.object({
				current: z.string(),
			}),
		}),
	),
	_type: z.string(),
	description: z.string(),
	body: z.string(),
	_createdAt: z.string(),
	state: z.string(),
	summary: z.string(),
	image: z.object({
		secure_url: z.string(),
	}),
	ogImage: z.object({
		secure_url: z.string(),
	}),
	_updatedAt: z.string(),
	slug: z.object({
		current: z.string(),
		_type: z.string(),
	}),
	title: z.string(),
	_id: z.string(),
})

type SanityArticle = z.infer<typeof sanityArticleSchema>

export async function migrateArticles() {
	const articles = await sanityQuery<SanityArticle[]>(`*[_type == "article"]{
	...,
	"contributors": contributors[].contributor->{
		...
	}
}`)

	for (const article of articles) {
		const resource = await db.query.contentResource.findFirst({
			where: eq(contentResource.id, article._id),
		})

		if (resource) {
			console.log(article.contributors)
			console.log('resource found', article._id)
		} else {
			const newResourceId = article._id || guid()

			const incomingContributors = article.contributors[0] as any

			const user = await recordResourceContribution({
				contributorSlug: incomingContributors.slug.current,
				resourceId: newResourceId,
			})

			const transformedArticle = ArticleSchema.parse({
				id: newResourceId,
				type: article._type,
				createdById: user?.id ?? '7ee4d72c-d4e8-11ed-afa1-0242ac120002',
				createdAt: new Date(article._createdAt),
				updatedAt: new Date(article._updatedAt),
				deletedAt: null,
				fields: {
					title: article.title,
					body: article.body,
					description: article.description,
					state: article.state,
					visibility: 'public',
					slug: article.slug.current,
					summary: article.summary,
					...(article.image?.secure_url && {
						image: {
							url: article.image?.secure_url,
						},
					}),
					...(article.ogImage?.secure_url && {
						ogImage: {
							url: article.ogImage?.secure_url,
						},
					}),
				},
			})
			console.info('created article', transformedArticle)
			await db.insert(contentResource).values(transformedArticle)
		}
	}
}
