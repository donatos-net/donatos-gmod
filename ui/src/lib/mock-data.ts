import type { PlayerData, ServerConfig } from '@/types/donatos';

export const mockServerConfig: ServerConfig = {
	name: 'Demo Server',
	updatedAt: new Date(),
	payUrl: 'https://example.com/pay/{id}',
	goodsCategories: [
		{ id: 1, name: 'VIP Ranks' },
		{ id: 2, name: 'Weapons' },
		{ id: 3, name: 'Cosmetics' },
		{ id: 4, name: 'Abilities' },
	],
	goods: [
		{
			id: 1,
			name: 'VIP Silver',
			key: 'vip_silver',
			categoryId: 1,
			order: 1,
			description: 'Access to VIP lounge, special weapons, and priority join',
			variants: [
				{ id: 'vip_silver_7d', price: 100, duration: 7 },
				{ id: 'vip_silver_30d', price: 350, duration: 30 },
				{ id: 'vip_silver_forever', price: 1000, duration: 0 },
			],
		},
		{
			id: 2,
			name: 'VIP Gold',
			key: 'vip_gold',
			categoryId: 1,
			order: 2,
			description: 'All Silver benefits plus exclusive skins and double XP',
			variants: [
				{ id: 'vip_gold_7d', price: 200, duration: 7 },
				{ id: 'vip_gold_30d', price: 700, duration: 30 },
				{ id: 'vip_gold_forever', price: 2000, duration: 0 },
			],
		},
		{
			id: 3,
			name: 'Golden AK-47',
			key: 'weapon_ak47_gold',
			categoryId: 2,
			order: 3,
			description: 'Permanent golden AK-47 with improved accuracy',
			variants: [{ id: 'ak47_gold_forever', price: 200, duration: 0 }],
		},
		{
			id: 4,
			name: 'AWP Sniper Rifle',
			key: 'weapon_awp',
			categoryId: 2,
			order: 4,
			description: 'Powerful sniper rifle for long-range combat',
			variants: [
				{ id: 'awp_7d', price: 150, duration: 7 },
				{ id: 'awp_30d', price: 500, duration: 30 },
			],
		},
		{
			id: 5,
			name: 'Rainbow Trail',
			key: 'cosmetic_rainbow_trail',
			categoryId: 3,
			order: 5,
			description: 'Leave a colorful rainbow trail as you move',
			variants: [
				{ id: 'rainbow_trail_30d', price: 100, duration: 30 },
				{ id: 'rainbow_trail_forever', price: 300, duration: 0 },
			],
		},
		{
			id: 6,
			name: 'Neon Wings',
			key: 'cosmetic_neon_wings',
			categoryId: 3,
			order: 6,
			description: 'Glowing neon wings that pulse with energy',
			variants: [{ id: 'neon_wings_forever', price: 400, duration: 0 }],
		},
		{
			id: 7,
			name: 'Speed Boost',
			key: 'ability_speed',
			categoryId: 4,
			order: 7,
			description: 'Run 50% faster for the duration',
			variants: [
				{ id: 'speed_7d', price: 80, duration: 7 },
				{ id: 'speed_30d', price: 250, duration: 30 },
			],
		},
		{
			id: 8,
			name: 'Double Jump',
			key: 'ability_double_jump',
			categoryId: 4,
			order: 8,
			description: 'Jump twice in mid-air',
			variants: [
				{ id: 'double_jump_7d', price: 120, duration: 7 },
				{ id: 'double_jump_forever', price: 500, duration: 0 },
			],
		},
	],
};

export const mockPlayerData: PlayerData = {
	player: {
		id: 1,
		externalId: '76561198000000000',
		balance: 500,
	},
	inventoryItems: [
		{
			id: 1,
			goodsId: 3,
			goods: {
				name: 'Golden AK-47',
				key: 'weapon_ak47_gold',
				description: 'Permanent golden AK-47 with improved accuracy',
			},
			variantId: 'ak47_gold_forever',
			variant: { id: 'ak47_gold_forever', price: 200, duration: 0 },
			amountPaid: '200',
		},
		{
			id: 2,
			goodsId: 7,
			goods: {
				name: 'Speed Boost',
				key: 'ability_speed',
				description: 'Run 50% faster for the duration',
			},
			variantId: 'speed_7d',
			variant: { id: 'speed_7d', price: 80, duration: 7 },
			amountPaid: '80',
		},
	],
	activeItems: [
		{
			id: 1,
			activatedAt: Date.now() - 86400000, // 1 day ago
			expires: {
				at: Date.now() + 518400000, // 6 days from now
				in: '6 days',
				inS: 518400,
				durationS: 604800, // 7 days total
			},
			isFrozen: false,
			goods: {
				key: 'vip_silver',
				name: 'VIP Silver',
			},
			variant: { id: 'vip_silver_7d', price: 100, duration: 7 },
		},
		{
			id: 2,
			activatedAt: Date.now() - 2592000000, // 30 days ago
			expires: {
				at: Date.now() + 86400000, // 1 day from now
				in: '1 day',
				inS: 86400,
				durationS: 2592000, // 30 days total
			},
			isFrozen: false,
			goods: {
				key: 'cosmetic_rainbow_trail',
				name: 'Rainbow Trail',
			},
			variant: { id: 'rainbow_trail_30d', price: 100, duration: 30 },
		},
		{
			id: 3,
			activatedAt: Date.now() - 172800000, // 2 days ago
			isFrozen: true,
			frozenAt: Date.now() - 86400000, // frozen 1 day ago
			freezeCounter: 1,
			goods: {
				key: 'ability_double_jump',
				name: 'Double Jump',
			},
			variant: { id: 'double_jump_7d', price: 120, duration: 7 },
		},
		{
			id: 4,
			activatedAt: Date.now() - 604800000, // 7 days ago
			isFrozen: false,
			goods: {
				key: 'weapon_ak47_gold',
				name: 'Golden AK-47',
			},
			variant: { id: 'ak47_gold_forever', price: 200, duration: 0 },
		},
	],
};
