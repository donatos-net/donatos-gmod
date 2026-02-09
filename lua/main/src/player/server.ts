import { invokeDonatosItem } from '@/donatos/item'
import { netMessageToClient } from '@/donatos/net'
import { serverApiRequest } from '@/donatos/server-api'
import { sendDonatosMessage } from '@/donatos/server-utils'
import { DonatosSharedPlayer, type RemoteData } from '@/player/shared'
import type { Result } from '@/utils/lang'
import { log } from '@/utils/log'
import { donatosState } from '@/utils/state'

export class DonatosServerPlayer extends DonatosSharedPlayer {
	async loadRemoteData(): Promise<Result<RemoteData>> {
		log.info(
			`Loading data for player ${this._ply.SteamID()} (${this._ply.Nick()})`,
		)

		const apiResult = await serverApiRequest('server:get-player', {
			playerExternalId: this._ply.SteamID64(),
			setName: this._ply.Nick(),
		})

		const { data, isError, error } = apiResult

		if (isError) {
			log.error(
				`Failed to load data for player ${this._ply.SteamID()} (${this._ply.Nick()}): ${error}`,
			)
			return apiResult
		}

		log.info(
			`Loaded data for player ${this._ply.SteamID()} (${this._ply.Nick()})`,
		)

		const wasLoaded = this._remoteData.isLoaded
		const prevBalance = this._remoteData.data?.player?.balance

		this._remoteData = { isLoaded: true, data }
		netMessageToClient(this._ply, 'syncPlayer', data)

		if (prevBalance && prevBalance < this.GetBalance()) {
			this.print(`Ваш баланс пополнен на ${this.GetBalance() - prevBalance}`)
			this._ply.EmitSound('garrysmod/save_load4.wav', 75, 100, 0.25)
		}

		if (!wasLoaded && data) {
			if (data.player.balance > 0) {
				this.print(`Вам доступно ${data.player.balance} р.`)
			}
			if (data.inventoryItems.length > 0) {
				const names = data.inventoryItems.map((i) => i.goods?.name ?? '???')
				this.print(
					`У вас есть неактивированные предметы в инвентаре: ${names.join(', ')}`,
				)
			}
		}

		return apiResult
	}

	sync() {
		if (this._remoteData.isLoaded) {
			netMessageToClient(this._ply, 'syncPlayer', this._remoteData.data)
		}
	}

	print(...args: (string | Player | Color)[]) {
		sendDonatosMessage({ receiver: this._ply, args: args })
	}

	onPlayerJoined() {
		if (!this.IsLoaded()) {
			return
		}

		{
			const ply = this._ply as Player & {
				sam_getrank?: () => string
				sam_get_nwvar?: (key: string, fallback: string) => string
				sam_set_rank?: (rank: string) => void
			}

			if (ply.sam_set_rank) {
				const plySamRank =
					ply.sam_getrank?.() ??
					ply.sam_get_nwvar?.('rank', 'user') ??
					ply.GetUserGroup()
				const purchasedSamRanks: Record<string, true> = {}

				for (const itm of this.GetActiveItems()) {
					if (itm.isFrozen) {
						continue
					}
					const donatosItem = donatosState.items[itm.goods.key]
					if (donatosItem?.meta?.samRank) {
						purchasedSamRanks[donatosItem.meta.samRank] = true
					}
				}

				if (
					donatosState.knownSamRanks[plySamRank] &&
					!purchasedSamRanks[plySamRank]
				) {
					log.info(
						`Removing expired SAM rank ${plySamRank} from user ${ply.SteamID()}`,
					)
					ply.sam_set_rank('user')
				}
			}
		}

		for (const itm of this.GetActiveItems()) {
			if (itm.isFrozen) {
				continue
			}
			invokeDonatosItem(itm.goods.key, '_onPlayerJoin', this._ply, {
				goods: itm.goods,
			})
		}
	}
}

export function donatosPlayerServer(p: Player): DonatosServerPlayer {
	return p.Donatos() as DonatosServerPlayer
}
