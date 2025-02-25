import { sql } from 'drizzle-orm'
import {
	index,
	int,
	MySqlTableFn,
	primaryKey,
	timestamp,
	unique,
	varchar,
} from 'drizzle-orm/mysql-core'

export function getMerchantProductSchema(mysqlTable: MySqlTableFn) {
	return mysqlTable(
		'MerchantProduct',
		{
			id: varchar('id', { length: 191 }).notNull(),
			organizationId: varchar('organizationId', { length: 191 }),
			merchantAccountId: varchar('merchantAccountId', {
				length: 191,
			}).notNull(),
			productId: varchar('productId', { length: 191 }).notNull(),
			status: int('status').default(0).notNull(),
			identifier: varchar('identifier', { length: 191 }),
			createdAt: timestamp('createdAt', { mode: 'date', fsp: 3 })
				.default(sql`CURRENT_TIMESTAMP(3)`)
				.notNull(),
		},
		(table) => {
			return {
				merchantProductId: primaryKey({
					columns: [table.id],
					name: 'MerchantProduct_id',
				}),
				merchantProductIdentifierKey: unique(
					'MerchantProduct_identifier_key',
				).on(table.identifier),
				organizationIdIdx: index('organizationId_idx').on(table.organizationId),
			}
		},
	)
}
