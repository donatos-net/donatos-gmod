import type { serverApiSchema } from 'api-schema/src';

export type Good = NonNullable<
	serverApiSchema['server:get-config']['output']
>['goods'][number];

export interface GoodVariant {
	id: string;
	price: number;
	duration?: number; // days, 0 = forever, undefined = instant
}

export interface GoodCategory {
	id: number;
	name: string;
}

export type InventoryItem = NonNullable<
	serverApiSchema['server:get-player']['output']
>['inventoryItems'][number];

export type ActiveItem = NonNullable<
	serverApiSchema['server:get-player']['output']
>['activeItems'][number];

export type PlayerData = NonNullable<
	serverApiSchema['server:get-player']['output']
>;

export type ServerConfig = NonNullable<
	serverApiSchema['server:get-config']['output']
>;
