import * as React from 'react'
import { Suspense } from 'react'
import { type Metadata, type ResolvingMetadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Contributor } from '@/app/_components/contributor'
// import { PricingWidget } from '@/app/_components/home-pricing-widget'
import { Code } from '@/components/codehike/code'
import Scrollycoding from '@/components/codehike/scrollycoding'
import { PlayerContainerSkeleton } from '@/components/player-skeleton'
import { PrimaryNewsletterCta } from '@/components/primary-newsletter-cta'
import { Share } from '@/components/share'
import Spinner from '@/components/spinner'
import { courseBuilderAdapter } from '@/db'
import type { List } from '@/lib/lists'
import {
	getAllLists,
	getListForPost,
	getMinimalListForNavigation,
} from '@/lib/lists-query'
import { type Post } from '@/lib/posts'
import { getAllPosts, getPost } from '@/lib/posts-query'
// import { getPricingProps } from '@/lib/pricing-query'
import { getServerAuthSession } from '@/server/auth'
import { cn } from '@/utils/cn'
import { generateGridPattern } from '@/utils/generate-grid-pattern'
import { getOGImageUrlForResource } from '@/utils/get-og-image-url-for-resource'
import { recmaCodeHike, remarkCodeHike } from 'codehike/mdx'
import { compileMDX, MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'

import { Button } from '@coursebuilder/ui'
import { VideoPlayerOverlayProvider } from '@coursebuilder/ui/hooks/use-video-player-overlay'

import PostNextUpFromListPagination from '../_components/post-next-up-from-list-pagination'
import ListPage from '../lists/[slug]/_page'
import { PostPlayer } from '../posts/_components/post-player'
import { PostNewsletterCta } from '../posts/_components/post-video-subscribe-form'
import PostProgressToggle from './_components/post-progress-toggle'

export const experimental_ppr = true

type Props = {
	params: Promise<{ post: string }>
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateStaticParams() {
	const posts = await getAllPosts()
	const lists = await getAllLists()

	const resources = [...posts, ...lists]

	return resources
		.filter((resource) => Boolean(resource.fields?.slug))
		.map((resource) => ({
			post: resource.fields?.slug,
		}))
}

export async function generateMetadata(
	props: Props,
	parent: ResolvingMetadata,
): Promise<Metadata> {
	const params = await props.params
	let resource

	resource = await getPost(params.post)

	if (!resource) {
		resource = await getMinimalListForNavigation(params.post)
	}

	if (!resource) {
		return parent as Metadata
	}

	return {
		title: resource.fields.title,
		description: resource.fields.description,
		openGraph: {
			images: [
				getOGImageUrlForResource({
					fields: { slug: resource.fields.slug },
					id: resource.id,
					updatedAt: resource.updatedAt,
				}),
			],
		},
	}
}

async function PostActionBar({ post }: { post: Post | null }) {
	const { session, ability } = await getServerAuthSession()

	return (
		<>
			{post && ability.can('update', 'Content') ? (
				<Button asChild size="sm" className="absolute right-0 top-0 z-50">
					<Link href={`/posts/${post.fields?.slug || post.id}/edit`}>Edit</Link>
				</Button>
			) : null}
		</>
	)
}

async function Post({ post }: { post: Post | null }) {
	if (!post) {
		return null
	}

	if (!post.fields.body) {
		return null
	}

	const { content } = await compileMDX({
		source: post.fields.body,
		// @ts-expect-error
		components: { Code, Scrollycoding },
		options: {
			mdxOptions: {
				remarkPlugins: [
					remarkGfm,
					[
						remarkCodeHike,
						{
							components: { code: 'Code' },
						},
					],
				],
				recmaPlugins: [
					[
						recmaCodeHike,
						{
							components: { code: 'Code' },
						},
					],
				],
			},
		},
	})

	return (
		<article className="prose sm:prose-lg lg:prose-xl prose-p:max-w-4xl prose-headings:max-w-4xl prose-ul:max-w-4xl prose-table:max-w-4xl prose-pre:max-w-4xl mt-10 max-w-none [&_[data-pre]]:max-w-4xl">
			{content}
		</article>
	)
}

async function PostTitle({ post }: { post: Post | null }) {
	return (
		<h1 className="fluid-3xl mb-4 inline-flex font-bold">
			{post?.fields?.title}
		</h1>
	)
}

export default async function PostPage(props: {
	params: Promise<{ post: string }>
	searchParams: Promise<{ [key: string]: string | undefined }>
}) {
	const searchParams = await props.searchParams
	const params = await props.params

	const listSlugFromParam = searchParams.list

	const post = await getPost(params.post)

	if (!post) {
		return (
			<ListPage
				params={{ slug: params.post } as any}
				searchParams={searchParams as any}
			/>
		)
	}

	// const listLoader = listSlugFromParam
	// 	? getMinimalListForNavigation(listSlugFromParam)
	// 	: getListForPost(post.id)

	if (!post) {
		notFound()
	}

	const squareGridPattern = generateGridPattern(
		post.fields.title,
		1000,
		800,
		0.8,
		false,
	)

	const hasVideo = post?.resources?.find(
		({ resource }) => resource.type === 'videoResource',
	)

	return (
		<div className="flex w-full">
			<main className="w-full">
				{hasVideo && <PlayerContainer post={post} />}
				<div
					className={cn(
						'container relative max-w-screen-xl pb-16 sm:pb-24 md:px-10 lg:px-16',
						{
							'pt-16': !hasVideo,
						},
					)}
				>
					<div
						className={cn('absolute right-0 w-full', {
							'-top-10': hasVideo,
							'top-0': !hasVideo,
						})}
					>
						<img
							src={squareGridPattern}
							className="h-[400px] w-full overflow-hidden object-cover object-right-top opacity-[0.15] saturate-0"
						/>
						<div
							className="to-background via-background absolute left-0 top-0 z-10 h-full w-full bg-gradient-to-bl from-transparent"
							aria-hidden="true"
						/>
					</div>
					<div className="relative z-50 flex w-full items-center justify-between">
						{!listSlugFromParam ? (
							<Link
								href="/posts"
								className="text-foreground/75 hover:text-foreground mb-3 inline-flex text-sm transition duration-300 ease-in-out"
							>
								← Posts
							</Link>
						) : (
							<div />
						)}
						<div className="flex items-center gap-3">
							<Suspense fallback={null}>
								<PostActionBar post={post} />
							</Suspense>
						</div>
					</div>
					<div className="relative z-10">
						<article className="flex h-full flex-col gap-5">
							<PostTitle post={post} />
							<Contributor className="flex [&_img]:w-8" />
							<Post post={post} />
							{/* {listSlugFromParam && (
								<PostProgressToggle
									className="flex w-full items-center justify-center"
									postId={post.id}
								/>
							)} */}
							<PostNextUpFromListPagination postId={post.id} />
							<div className="mx-auto mt-10 flex w-full max-w-[290px] flex-col gap-1">
								<strong className="w-full text-center text-lg font-semibold">
									Share
								</strong>
								<Share
									className="bg-background w-full"
									title={post?.fields.title}
								/>
							</div>
						</article>
					</div>
				</div>
				{/* {ckSubscriber && product && allowPurchase && pricingDataLoader ? (
					<section id="buy">
						<h2 className="fluid-2xl mb-10 text-balance px-5 text-center font-bold">
							Get Really Good At Node.js
						</h2>
						<div className="flex items-center justify-center border-y">
							<div className="bg-background flex w-full max-w-md flex-col border-x p-8">
								<PricingWidget
									quantityAvailable={-1}
									pricingDataLoader={pricingDataLoader}
									commerceProps={{ ...commerceProps }}
									product={product}
								/>
							</div>
						</div>
					</section>
				) : hasVideo ? null : ( */}
				{!hasVideo && <PrimaryNewsletterCta className="pt-20" />}
				{/* )} */}
			</main>
		</div>
	)
}

async function PlayerContainer({ post }: { post: Post | null }) {
	if (!post) {
		notFound()
	}

	const resource = post.resources?.[0]?.resource.id

	const videoResource = await courseBuilderAdapter.getVideoResource(resource)

	return videoResource ? (
		<VideoPlayerOverlayProvider>
			<Suspense
				fallback={
					<PlayerContainerSkeleton className="h-full max-h-[75vh] w-full bg-black" />
				}
			>
				<section
					aria-label="video"
					className="mb-10 flex flex-col items-center justify-center border-b bg-black"
				>
					<PostPlayer
						title={post.fields?.title}
						thumbnailTime={post.fields?.thumbnailTime || 0}
						postId={post.id}
						className="aspect-video h-full max-h-[75vh] w-full overflow-hidden"
						videoResource={videoResource}
					/>
					<PostNewsletterCta />
				</section>
			</Suspense>
		</VideoPlayerOverlayProvider>
	) : null
}
