import type { serverApiSchema } from './index'

export type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string }

export type DonatosServerActions = {
	requestSync: {
		input: undefined
		output: ActionResult<true>
	}
	requestRefresh: {
		input: undefined
		output: ActionResult<true>
	}
	purchaseGoods: {
		input: { goodsId: number; variantId: string }
		output: ActionResult<serverApiSchema['player:purchase-goods']['output']>
	}
	activateItem: {
		input: { id: number }
		output: ActionResult<true>
	}
	giftItem: {
		input: { id: number; gifteeExternalId: string }
		output: ActionResult<serverApiSchema['player:gift-item']['output']>
	}
	freezeActiveItem: {
		input: { id: number }
		output: ActionResult<true>
	}
	unfreezeActiveItem: {
		input: { id: number }
		output: ActionResult<true>
	}
	createIgsPaymentUrl: {
		input: { sum: number }
		output: ActionResult<
			serverApiSchema['server:igs-create-payment-url']['output']
		>
	}
	getOnlinePlayers: {
		input: undefined
		output: ActionResult<
			Array<{
				externalId: string
				name: string
				avatarUrl?: string
			}>
		>
	}
}
