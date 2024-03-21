import * as React from 'react'
import type { UseFormReturn } from 'react-hook-form'

import {
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	Input,
} from '@coursebuilder/ui'

export function MetadataFieldTitle({ form }: { form: UseFormReturn<any> }) {
	return (
		<FormField
			control={form.control}
			name="title"
			render={({ field }) => (
				<FormItem className="px-5">
					<FormLabel>Title</FormLabel>
					<FormDescription>
						A title should summarize the tip and explain what it is about
						clearly.
					</FormDescription>
					<Input {...field} />
					<FormMessage />
				</FormItem>
			)}
		/>
	)
}