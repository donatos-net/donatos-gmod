import { netMessageToClient } from '@/donatos/net'
import { remoteConfig } from '@/donatos/remote-config'
import { serverApiRequest } from '@/donatos/server-api'
import { sendDonatosMessage } from '@/donatos/server-utils'
import { loadRemoteConfig } from '@/donatos/utils/load-remote-config'
import { donatosHookId } from '@/utils/addon'

let updatesSince: string | undefined = undefined
let serverUpdatedAt: string | undefined = undefined

timer.Create(donatosHookId('timer-updates'), 10, 0, async () => {
  const playerIds: number[] = []
  for (const p of player.GetAll()) {
    const dId = p.Donatos().ID
    if (dId) {
      playerIds.push(dId)
    }
  }
  const { isError, data, error } = await serverApiRequest('server:get-updates', {
    since: updatesSince,
    playerIds,
  })

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
        sendDonatosMessage({ args: [arg, ` задонатил серверу ${order.total} р.`] })
      }
    }

    if (ply) {
      sendDonatosMessage({
        receiver: ply,
        args: [`Вы оплатили заказ #${order.id} на ${order.total} р.`],
      })

      ply.EmitSound('garrysmod/save_load4.wav', 75, 100, 0.25)
      await ply.Donatos()._sLoadRemoteData()
      netMessageToClient(ply, 'openUi', 'inventory')
    }
  }

  for (const up of data.updatedPlayers) {
    const ply = player.GetBySteamID64(up.externalId)
    if (IsValid(ply)) {
      await ply.Donatos()._sLoadRemoteData()
    }
  }

  if (serverUpdatedAt !== data.server.updatedAt || !remoteConfig.value) {
    serverUpdatedAt = data.server.updatedAt
    await loadRemoteConfig()
  }
})

timer.Create(donatosHookId('timer-load-players'), 30, 0, async () => {
  for (const ply of player.GetAll()) {
    if (!ply.IsBot() && !ply.Donatos().IsLoaded) {
      const { isError } = await ply.Donatos()._sLoadRemoteData()
      if (isError) {
        break
      }
      ply.Donatos()._sOnPlayerJoined()
    }
  }
})
