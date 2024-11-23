import { donatosItems, invokeDonatosItem, knownSamRanks } from '@/donatos/item'
import { netMessageToClient } from '@/donatos/net'
import { serverApiRequest } from '@/donatos/server-api'
import { sendDonatosMessage } from '@/donatos/server-utils'
import { type Result, result } from '@/utils/lang'
import { log } from '@/utils/log'
import type { serverApiSchema } from 'api-schema/src'

type RemoteData = serverApiSchema['server:get-player']['output']

export class DonatosPlayer {
  private _RemoteData: { isLoaded: true; data: RemoteData } | { isLoaded: false; data: undefined } = {
    isLoaded: false,
    data: undefined,
  }
  constructor(private readonly _ply: Player) {}

  static fromExisting(p: DonatosPlayer): DonatosPlayer {
    const dp = new DonatosPlayer(p._ply)
    dp._RemoteData = p._RemoteData
    return dp
  }

  get IsLoaded() {
    return this._RemoteData.isLoaded
  }

  set RemoteData(remoteData: RemoteData) {
    this._RemoteData = { isLoaded: true, data: remoteData }
  }

  get ID(): number | undefined {
    return this._RemoteData.data?.player.id
  }

  get Balance(): number {
    return this._RemoteData.data?.player.balance || 0
  }

  get InventoryItems(): NonNullable<RemoteData>['inventoryItems'] {
    return this._RemoteData.data?.inventoryItems || []
  }

  set InventoryItems(items: NonNullable<RemoteData>['inventoryItems']) {
    if (this._RemoteData.data) {
      this._RemoteData.data.inventoryItems = items
    }
  }

  get ActiveItems(): NonNullable<RemoteData>['activeItems'] {
    return this._RemoteData.data?.activeItems ?? []
  }

  HasActiveItem(key: string): boolean {
    return this.ActiveItems.find((i) => !i.isFrozen && i.key === key) !== undefined
  }

  async _sLoadRemoteData(): Promise<Result<serverApiSchema['server:get-player']['output']>> {
    if (CLIENT) {
      return result.err('Clientside not supported')
    }

    log.info(`Loading data for player ${this._ply.SteamID()} (${this._ply.Nick()})`)

    const apiResult = await serverApiRequest('server:get-player', {
      playerExternalId: this._ply.SteamID64(),
      setName: this._ply.Nick(),
    })

    const { data, isError, error } = apiResult

    if (isError) {
      log.error(`Failed to load data for player ${this._ply.SteamID()} (${this._ply.Nick()}): ${error}`)
      return apiResult
    }

    log.info(`Loaded data for player ${this._ply.SteamID()} (${this._ply.Nick()})`)

    const wasLoaded = this._RemoteData.isLoaded
    const prevBalance = this._RemoteData.data?.player?.balance

    this._RemoteData = { isLoaded: true, data }
    netMessageToClient(this._ply, 'syncPlayer', data)

    if (prevBalance && prevBalance < this.Balance) {
      this._sPrint(`Ваш баланс пополнен на ${this.Balance - prevBalance} р.`)
      this._ply.EmitSound('garrysmod/save_load4.wav', 75, 100, 0.25)
    }

    if (!wasLoaded && data && data.player.balance > 0) {
      this._sPrint(`Вам доступно ${data.player.balance} р.`)
    }

    return apiResult
  }

  _sSyncPlayer() {
    if (CLIENT) {
      return
    }

    if (this._RemoteData.isLoaded) {
      netMessageToClient(this._ply, 'syncPlayer', this._RemoteData.data)
    }
  }

  _sPrint(...args: (string | Player | Color)[]) {
    sendDonatosMessage({ receiver: this._ply, args: args })
  }

  _sOnPlayerJoined() {
    if (!this.IsLoaded) {
      return
    }

    {
      const ply = this._ply as Player & { sam_getrank?: () => string; sam_set_rank?: (rank: string) => void }

      if (ply.sam_getrank && ply.sam_set_rank) {
        const plySamRank = ply.sam_getrank()
        const purchasedSamRanks: Record<string, true> = {}

        for (const itm of this.ActiveItems) {
          if (itm.isFrozen) {
            continue
          }
          const donatosItem = donatosItems[itm.key]
          if (donatosItem?.meta?.samRank) {
            purchasedSamRanks[donatosItem.meta.samRank] = true
          }
        }

        if (knownSamRanks[plySamRank] && !purchasedSamRanks[plySamRank]) {
          log.info(`Removing expired SAM rank ${plySamRank} from user ${ply.SteamID()}`)
          ply.sam_set_rank('user')
        }
      }
    }

    for (const itm of this.ActiveItems) {
      if (itm.isFrozen) {
        continue
      }
      invokeDonatosItem(itm.key, '_onPlayerJoin', this._ply)
    }
  }
}
