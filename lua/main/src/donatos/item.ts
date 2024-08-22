import { persistedVar } from '@/utils/addon'
import { type Result, result } from '@/utils/lang'
import { log } from '@/utils/log'

interface DonatosItem {
  key: string
  _onActivate: ((ply: Player) => void)[]
  _onPlayerJoin: ((ply: Player) => void)[]

  OnActivate: (func: (ply: Player) => void) => this
  OnPlayerJoin: (func: (ply: Player) => void) => this

  SetSAMGroup: (group: string) => this
  SetDarkRPMoney: (amount: number) => this

  meta: {
    samRank?: string
  }
}

export const donatosItems = persistedVar<Record<string, DonatosItem>>('items', {})
export const knownSamRanks = persistedVar<Record<string, true>>('known_sam_ranks', {})

export function donatosItem(key: string) {
  const itm: DonatosItem = {
    key,
    _onActivate: [],
    _onPlayerJoin: [],
    OnActivate: function (this, func) {
      this._onActivate.push(func)
      return this
    },
    OnPlayerJoin: function (this, func) {
      this._onPlayerJoin.push(func)
      return this
    },

    SetSAMGroup: function (this, rank: string) {
      this.meta.samRank = rank
      knownSamRanks[rank] = true
      return this.OnPlayerJoin((ply) => {
        ;(ply as Player & { sam_set_rank: (rank: string) => void }).sam_set_rank(rank)
      })
    },
    SetDarkRPMoney: function (this, amount) {
      return this.OnActivate((ply) => {
        ;(ply as Player & { addMoney: (amount: number, reason: string) => void }).addMoney(amount, 'Donatos')
      })
    },

    meta: {},
  }

  donatosItems[key] = itm
  return itm
}

export function invokeDonatosItem(
  key: string,
  handlerType: '_onActivate' | '_onPlayerJoin',
  ply: Player,
): Result<boolean, undefined> {
  const item = donatosItems[key]
  if (!item || !IsValid(ply)) {
    return result.ok(false)
  }

  const handlers = item[handlerType]

  let errored = false
  for (const handler of handlers) {
    if (!isfunction(handler)) {
      continue
    }

    const [success, err] = pcall(handler, ply)
    if (!success) {
      log.error(`Failed to invoke item handler (${key} ${handlerType}) for player ${ply.SteamID()}`)
      print(err)
      errored = true
    }
  }

  return errored ? result.err(undefined) : result.ok(true)
}
