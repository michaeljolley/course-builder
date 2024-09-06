import * as React from 'react'
import { User } from '@auth/core/types'
import { type UseFormReturn } from 'react-hook-form'
import { Schema, z } from 'zod'

import type { ContentResource } from '@coursebuilder/core/schemas'

import { ResizableHandle } from '../primitives/resizable'
import { EditResourcesActionBar } from './edit-resources-action-bar'
import {
	EditResourcesToolPanel,
	ResourceTool,
} from './edit-resources-tool-panel'
import { EditResourcePanelGroup } from './panels/edit-resource-panel-group'
import { EditResourcesBodyPanel } from './panels/edit-resources-body-panel'
import { EditResourcesMetadataPanel } from './panels/edit-resources-metadata-panel'

/**
 * This is a form that is used to create or edit a resource.
 *
 * @param resource @type {ContentResource}
 * @param getResourcePath
 * @param resourceSchema
 * @param children
 * @param form
 * @param updateResource
 * @param availableWorkflows
 * @param onSave
 * @param sendResourceChatMessage
 * @param hostUrl @type {string} - the host url of the Partykit
 * @param user
 * @param tools
 * @param theme
 * @constructor
 */
export function EditResourcesFormDesktop({
	resource,
	getResourcePath,
	resourceSchema,
	children,
	form,
	updateResource,
	availableWorkflows,
	onSave,
	sendResourceChatMessage,
	hostUrl,
	user,
	tools = [],
	theme = 'light',
}: {
	onSave: (resource: ContentResource) => Promise<void>
	onPublish?: (resource: ContentResource) => Promise<void>
	onArchive?: (resource: ContentResource) => Promise<void>
	onUnPublish?: (resource: ContentResource) => Promise<void>
	resource: ContentResource & {
		fields: {
			body?: string | null
			title?: string | null
			slug: string
		}
	}
	getResourcePath: (slug?: string) => string
	resourceSchema: Schema
	children?: React.ReactNode
	form: UseFormReturn<z.infer<typeof resourceSchema>>
	updateResource: (
		values: z.infer<typeof resourceSchema>,
		action?: string,
	) => Promise<any>
	availableWorkflows?: { value: string; label: string; default?: boolean }[]
	sendResourceChatMessage: (options: {
		resourceId: string
		messages: any[]
		selectedWorkflow?: string
	}) => Promise<void>
	hostUrl: string
	user?: User | null
	tools?: ResourceTool[]
	theme?: string
}) {
	const onSubmit = async (
		values: z.infer<typeof resourceSchema>,
		action: 'save' | 'publish' | 'archive' | 'unpublish' = 'save',
	) => {
		const updatedResource = await updateResource(values, action)
		if (updatedResource) {
			return await onSave(updatedResource)
		}
	}

	return (
		<>
			<EditResourcesActionBar
				resource={resource}
				resourcePath={getResourcePath(resource.fields?.slug)}
				onSubmit={async () => {
					await onSubmit(form.getValues(), 'save')
				}}
				onPublish={async () => {
					form.setValue('fields.state', 'published')
					await onSubmit(form.getValues(), 'publish')
				}}
				onArchive={async () => {
					form.setValue('fields.state', 'archived')
					await onSubmit(form.getValues(), 'archive')
				}}
				onUnPublish={async () => {
					form.setValue('fields.state', 'draft')
					await onSubmit(form.getValues(), 'unpublish')
				}}
			/>
			<EditResourcePanelGroup>
				<EditResourcesMetadataPanel form={form} onSubmit={onSubmit}>
					{children}
				</EditResourcesMetadataPanel>
				<ResizableHandle />
				<EditResourcesBodyPanel
					user={user}
					partykitUrl={hostUrl}
					resource={resource}
					form={form}
					theme={theme}
				/>
				<ResizableHandle />
				<EditResourcesToolPanel
					resource={{ ...resource, ...form.getValues() }}
					availableWorkflows={availableWorkflows}
					sendResourceChatMessage={sendResourceChatMessage}
					hostUrl={hostUrl}
					user={user}
					tools={tools}
				/>
			</EditResourcePanelGroup>
		</>
	)
}
