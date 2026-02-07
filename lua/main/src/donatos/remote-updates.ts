import { netMessageToClient } from '@/donatos/net'
import { serverApiRequest } from '@/donatos/server-api'
import { sendDonatosMessage } from '@/donatos/server-utils'
import { loadRemoteConfig } from '@/donatos/utils/load-remote-config'
import { donatosPlayerServer } from '@/player/server'
import { donatosHookId, donatosState } from '@/utils/state'

let updatesSince: string | undefined
let serverUpdatedAt: string | undefined

timer.Create(donatosHookId('timer-updates'), 10, 0, async () => {
	const playerExternalIds: string[] = []
	for (const p of player.GetAll()) {
		playerExternalIds.push(p.SteamID64())
	}
	const { isError, data, error } = await serverApiRequest(
		'server:get-updates:v2',
		{
			since: updatesSince,
			playerExternalIds,
		},
	)

	if (isError) {
		return
	}

	if (updatesSince === undefined) {
		updatesSince = data.ts
		return
	}

	updatesSince = data.ts

	for (const order of data.newOrders) {
		const ply = player.GetBySteamID64(order.playerExternalId) as Player | false

		if (!order.isAnonymous) {
			const arg = ply || order.playerName
			if (arg) {
				sendDonatosMessage({
					args: [arg, ` задонатил серверу ${order.total} р.`],
				})
			}
		}

		if (ply) {
			sendDonatosMessage({
				receiver: ply,
				args: [`Вы оплатили заказ #${order.id} на ${order.total} р.`],
			})

			ply.EmitSound('garrysmod/save_load4.wav', 75, 100, 0.25)
			await donatosPlayerServer(ply).loadRemoteData()
			netMessageToClient(ply, 'openUi', 'inventory')
		}
	}

	for (const up of data.updatedPlayers) {
		const ply = player.GetBySteamID64(up.externalId)
		if (IsValid(ply)) {
			await donatosPlayerServer(ply).loadRemoteData()
		}
	}

	if (
		serverUpdatedAt !== data.server.updatedAt ||
		!donatosState.remoteConfig.value
	) {
		serverUpdatedAt = data.server.updatedAt
		await loadRemoteConfig()
	}
})

timer.Create(donatosHookId('timer-load-players'), 30, 0, async () => {
	for (const ply of player.GetAll()) {
		if (!ply.IsBot() && !ply.Donatos().IsLoaded()) {
			const dp = donatosPlayerServer(ply)
			const { isError } = await dp.loadRemoteData()
			if (isError) {
				break
			}
			dp.onPlayerJoined()
		}
	}
})
