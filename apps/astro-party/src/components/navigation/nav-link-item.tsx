import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { track } from '@/utils/analytics'
import { cn } from '@/utils/cn'
import { z } from 'zod'

const NavLinkItemSchema = z.object({
	href: z.string(),
	label: z.union([z.string(), z.any()]),
	onClick: z.function().optional(),
	className: z.string().optional(),
})

export type NavLinkItem = z.infer<typeof NavLinkItemSchema>

export const NavLinkItem: React.FC<NavLinkItem> = ({
	href,
	label,
	onClick,
	className,
}) => {
	const LinkOrButton = href ? Link : 'button'
	const pathname = usePathname()
	const isActive = pathname === href.replace(/\/$/, '')
	return (
		<li className="flex items-stretch">
			<LinkOrButton
				href={href}
				className={cn(
					'hover:bg-muted font-rounded flex h-full items-center px-4 text-base font-medium transition',
					{
						underline: isActive,
					},
					className,
				)}
				onClick={() => {
					track('nav-link-clicked', { label, href })
					onClick && onClick()
				}}
			>
				{label}
			</LinkOrButton>
		</li>
	)
}
