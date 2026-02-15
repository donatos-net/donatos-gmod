import type { DonatosServerActions } from 'api-schema/src/server-actions'
import { invokeDonatosItem } from '@/donatos/item'
import { netMessageToClient, type ServerNetHandler } from '@/donatos/net'
import { serverApiRequest } from '@/donatos/server-api'
import { sendDonatosMessage } from '@/donatos/server-utils'
import { donatosPlayerServer } from '@/player/server'
import { log } from '@/utils/log'
import { donatosState } from '@/utils/state'

type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string }

function ok<T>(data: T): ActionResult<T> {
	return { success: true, data }
}

function err<T>(error: string): ActionResult<T> {
	return { success: false, error }
}

const hookRun = hook.Run as (
	eventName: string,
	...args: unknown[]
) => LuaMultiReturn<[boolean | undefined, string | undefined]>

// client -> server -> client
type ServerActionHandlers = {
	[K in keyof DonatosServerActions]: ServerNetHandler<
		DonatosServerActions[K]['input'],
		DonatosServerActions[K]['output']
	>
}

export const handleServerMessage = {
	requestSync: async (ply, input: undefined) => {
		donatosPlayerServer(ply).sync()
		if (donatosState.remoteConfig.value) {
			netMessageToClient(
				undefined,
				'syncConfig',
				donatosState.remoteConfig.value,
			)
		}
		return ok(true)
	},
	requestRefresh: async (ply, input: undefined) => {
		await donatosPlayerServer(ply).loadRemoteData()
		if (donatosState.remoteConfig.value) {
			netMessageToClient(
				undefined,
				'syncConfig',
				donatosState.remoteConfig.value,
			)
		}
		return ok(true)
	},
	createIgsPaymentUrl: async (ply, input: { sum: number }) => {
		const { isError, data, error } = await serverApiRequest(
			'server:igs-create-payment-url',
			{
				playerExternalId: ply.SteamID64(),
				sum: input.sum,
			},
		)

		if (isError) {
			return err(error)
		}

		return ok(data)
	},
	purchaseGoods: async (ply, input: { goodsId: number; variantId: string }) => {
		const playerId = ply.Donatos().GetID()
		if (!playerId) {
			return err('Ошибка: данные игрока не загружены. Попробуйте позднее.')
		}
		const { isError, data, error } = await serverApiRequest(
			'player:purchase-goods',
			{
				playerId: playerId,
				goodsId: input.goodsId,
				variantId: input.variantId,
			},
		)

		if (isError) {
			return err(error)
		}

		await donatosPlayerServer(ply).loadRemoteData()

		ply.EmitSound('garrysmod/content_downloaded.wav', 75, 100, 0.3)

		return ok(data)
	},
	activateItem: async (ply, input: { id: number }) => {
		const playerId = ply.Donatos().GetID()
		if (!playerId) {
			return err('Ошибка: данные игрока не загружены. Попробуйте позднее.')
		}

		const inventoryItem = ply
			.Donatos()
			.GetInventoryItems()
			.find((i) => i.id === input.id)
		if (!inventoryItem) {
			return err('Ошибка: предмет не найден в инвентаре.')
		}

		if (inventoryItem.goods && inventoryItem.variant?.duration === undefined) {
			const item = donatosState.items[inventoryItem.goods.key]
			if (!item) {
				return err(
					'Ошибка: предмет не настроен. Обратитесь к администратору сервера.',
				)
			}
		}

		const [canActivate, message] = hookRun(
			'donatos:preActivateItem',
			ply,
			inventoryItem,
		)
		if (canActivate === false) {
			return err(
				`Вы не можете активировать этот предмет${message ? `: ${message}` : ''}`,
			)
		}

		const { isError, data, error } = await serverApiRequest(
			'player:activate-item',
			{
				playerId: playerId,
				itemId: input.id,
			},
		)

		if (isError) {
			return err(error)
		}

		const activateResult = invokeDonatosItem(
			data.goods.key,
			'_onActivate',
			ply,
			data,
		)
		if (activateResult.isError) {
			return err(
				'ВОЗНИКЛА ОШИБКА! Предмет настроен неверно, обратитесь к администратору сервера для возврата.',
			)
		}

		invokeDonatosItem(data.goods.key, '_onPlayerJoin', ply, data)

		// ply.donatos().sPrint(`Вы активировали предмет "${data.goods.name}"`)
		if (!data.order || data.order.isAnonymous === false) {
			sendDonatosMessage({
				args: [ply, ` активировал предмет "${data.goods.name}"`],
			})
		}
		ply.EmitSound('friends/friend_join.wav', 75, 100, 0.2)

		void donatosPlayerServer(ply).loadRemoteData()

		return ok(true)
	},
	giftItem: async (ply, input: { id: number; gifteeExternalId: string }) => {
		const playerId = ply.Donatos().GetID()
		if (!playerId) {
			return err('Ошибка: данные игрока не загружены. Попробуйте позднее.')
		}

		const inventoryItem = ply
			.Donatos()
			.GetInventoryItems()
			.find((i) => i.id === input.id)
		if (!inventoryItem) {
			return err('Ошибка: предмет не найден в инвентаре.')
		}

		if (input.gifteeExternalId === ply.SteamID64()) {
			return err('Нельзя подарить предмет самому себе.')
		}

		const giftee = player
			.GetAll()
			.find((target) => target.SteamID64() === input.gifteeExternalId)
		if (!giftee) {
			return err('Игрок не найден на сервере.')
		}

		const { isError, data, error } = await serverApiRequest('player:gift-item', {
			playerId: playerId,
			itemId: input.id,
			gifteeExternalId: input.gifteeExternalId,
		})

		if (isError) {
			return err(error)
		}

		void donatosPlayerServer(ply).loadRemoteData()
		void donatosPlayerServer(giftee).loadRemoteData()

		sendDonatosMessage({
			receiver: ply,
			args: [
				`Вы подарили предмет "${inventoryItem.goods?.name ?? 'предмет'}" игроку `,
				giftee,
				'.',
			],
		})

		sendDonatosMessage({
			receiver: giftee,
			args: [ply, ` подарил вам предмет "${inventoryItem.goods?.name ?? 'предмет'}".`],
		})

		return ok(data)
	},
	freezeActiveItem: async (ply, input: { id: number }) => {
		const playerId = ply.Donatos().GetID()
		if (!playerId) {
			return err('Ошибка: данные игрока не загружены. Попробуйте позднее.')
		}

		const { isError, data, error } = await serverApiRequest(
			'player:freeze-active-item',
			{
				playerId: playerId,
				itemId: input.id,
			},
		)

		if (isError) {
			return err(error)
		}

		const dp = donatosPlayerServer(ply)
		await dp.loadRemoteData()
		dp.onPlayerJoined()

		return ok(true)
	},
	unfreezeActiveItem: async (ply, input: { id: number }) => {
		const playerId = ply.Donatos().GetID()
		if (!playerId) {
			return err('Ошибка: данные игрока не загружены. Попробуйте позднее.')
		}

		const { isError, data, error } = await serverApiRequest(
			'player:unfreeze-active-item',
			{
				playerId: playerId,
				itemId: input.id,
			},
		)

		if (isError) {
			return err(error)
		}

		const dp = donatosPlayerServer(ply)
		await dp.loadRemoteData()
		dp.onPlayerJoined()

		return ok(true)
	},
	getOnlinePlayers: async (ply, input: undefined) => {
		const players = player.GetAll()
		const onlinePlayers: Array<{
			externalId: string
			name: string
			avatarUrl?: string
		}> = []

		for (const target of players) {
			const externalId = target.SteamID64()
			if (
				target === ply ||
				!externalId ||
				externalId.length === 0 ||
				externalId === '0'
			) {
				continue
			}

			const avatarUrl =
				target.Donatos()._remoteData.data?.player.externalMeta?.avatarUrl ??
				undefined

			onlinePlayers.push({
				externalId,
				name: target.Nick(),
				avatarUrl,
			})
		}

		onlinePlayers.sort((a, b) => {
			if (a.name < b.name) {
				return -1
			}
			if (a.name > b.name) {
				return 1
			}
			return 0
		})

		return ok(onlinePlayers)
	},
} satisfies ServerActionHandlers

if (SERVER) {
	util.AddNetworkString('donatos')
	net.Receive('donatos', async (len: number, ply: Player) => {
		const nonce = net.ReadUInt(20)
		const [action, data] = util.JSONToTable(net.ReadString()) as [
			keyof typeof handleServerMessage,
			unknown,
		]

		try {
			const handler = handleServerMessage[action]
			if (!handler) {
				netMessageToClient(ply, 'resultFromServer', [
					nonce,
					err('Unknown action'),
				])
				return
			}

			const result = await handler(ply, data as never)

			netMessageToClient(ply, 'resultFromServer', [nonce, result])
		} catch (e) {
			log.error(`Error in handleServerMessage[${action}]:`)
			print(e)
			netMessageToClient(ply, 'resultFromServer', [
				nonce,
				err('Внутренняя ошибка сервера. Повторите попытку позже.'),
			])
		}
	})
}
