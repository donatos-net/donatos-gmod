import { donatosItems, invokeDonatosItem } from '@/donatos/item'
import { type ServerNetHandler, netMessageToClient } from '@/donatos/net'
import { remoteConfig } from '@/donatos/remote-config'
import { serverApiRequest } from '@/donatos/server-api'
import { sendDonatosMessage } from '@/donatos/server-utils'
import { createGiftEnt } from '@/ents/gift'
import colors from '@/utils/colors'
import { log } from '@/utils/log'

const hookRun = hook.Run as (
  eventName: string,
  ...args: unknown[]
) => LuaMultiReturn<[boolean | undefined, string | undefined]>

// client -> server -> client
export const handleServerMessage = {
  requestSync: async (ply, input: undefined) => {
    ply.Donatos()._sSyncPlayer()
    if (remoteConfig.value) {
      netMessageToClient(undefined, 'syncConfig', remoteConfig.value)
    }
  },
  requestRefresh: async (ply, input: undefined) => {
    await ply.Donatos()._sLoadRemoteData()
    if (remoteConfig.value) {
      netMessageToClient(undefined, 'syncConfig', remoteConfig.value)
    }
    return true
  },
  purchaseGoods: async (ply, input: { goodsId: number; variantId: string }) => {
    const playerId = ply.Donatos().ID
    if (!playerId) {
      ply.Donatos()._sPrint('Ошибка: данные игрока не загружены. Попробуйте позднее.')
      return false
    }
    const { isError, data, error } = await serverApiRequest('player:purchase-goods', {
      playerId: playerId,
      goodsId: input.goodsId,
      variantId: input.variantId,
    })

    if (isError) {
      ply.Donatos()._sPrint(`Произошла ошибка: ${error}`)
      return false
    }

    await ply.Donatos()._sLoadRemoteData()

    ply.Donatos()._sPrint(`Вы купили предмет "${data.goods.name}". Перейдите в инвентарь для активации.`)
    ply.EmitSound('garrysmod/content_downloaded.wav', 75, 100, 0.3)

    return data
  },
  activateItem: async (ply, input: { id: number }) => {
    const playerId = ply.Donatos().ID
    if (!playerId) {
      ply.Donatos()._sPrint('Ошибка: данные игрока не загружены. Попробуйте позднее.')
      return false
    }

    const inventoryItem = ply.Donatos().InventoryItems.find((i) => i.id === input.id)
    if (!inventoryItem) {
      return false
    }

    if (inventoryItem.goods && inventoryItem.variant?.duration === undefined) {
      const item = donatosItems[inventoryItem.goods.key]
      if (!item) {
        ply.Donatos()._sPrint('Ошибка: предмет не настроен. Обратитесь к администратору сервера.')
        return false
      }
    }

    const [canActivate, message] = hookRun('donatos:preActivateItem', ply, inventoryItem)
    if (canActivate === false) {
      ply.Donatos()._sPrint(`Вы не можете активировать этот предмет${message ? `: ${message}` : ''}`)
      return false
    }

    const { isError, data, error } = await serverApiRequest('player:activate-item', {
      playerId: playerId,
      itemId: input.id,
    })

    if (isError) {
      ply.Donatos()._sPrint(`Произошла ошибка: ${error}`)
      return false
    }

    const activateResult = invokeDonatosItem(data.goods.key, '_onActivate', ply, data)
    if (activateResult.isError) {
      ply
        .Donatos()
        ._sPrint(
          colors.RED_7,
          'ВОЗНИКЛА ОШИБКА! Предмет настроен неверно, обратитесь к администратору сервера для возврата.',
        )
      return true
    }

    invokeDonatosItem(data.goods.key, '_onPlayerJoin', ply, data)

    // ply.donatos().sPrint(`Вы активировали предмет "${data.goods.name}"`)
    if (!data.order || data.order.isAnonymous === false) {
      sendDonatosMessage({ args: [ply, ` активировал предмет "${data.goods.name}"`] })
    }
    ply.EmitSound('friends/friend_join.wav', 75, 100, 0.2)

    return true
  },
  dropItem: async (ply, input: { id: number }) => {
    const playerId = ply.Donatos().ID
    if (!playerId) {
      ply.Donatos()._sPrint('Ошибка: данные игрока не загружены. Попробуйте позднее.')
      return false
    }

    const { isError, data, error } = await serverApiRequest('player:drop-item', {
      playerId: playerId,
      itemId: input.id,
    })

    if (isError) {
      ply.Donatos()._sPrint(`Произошла ошибка: ${error}`)
      return false
    }

    const tr = util.TraceLine({
      start: ply.EyePos(),
      endpos: ply.EyePos().addOp(ply.EyeAngles().Forward().mulOp(50)),
      filter: ply as Entity,
    } as Trace)

    const gift = createGiftEnt({ pos: tr.HitPos, token: data.token, item: data.item, itemOwner: ply })
    ply.EmitSound(`physics/metal/paintcan_impact_soft${math.random(1, 2)}.wav`, 65, math.random(90, 110), 0.3)
    gift.GetPhysicsObject().SetVelocity(ply.EyeAngles().Forward().mulOp(50))

    return true
  },
  freezeActiveItem: async (ply, input: { id: number }) => {
    const playerId = ply.Donatos().ID
    if (!playerId) {
      ply.Donatos()._sPrint('Ошибка: данные игрока не загружены. Попробуйте позднее.')
      return false
    }

    const { isError, data, error } = await serverApiRequest('player:freeze-active-item', {
      playerId: playerId,
      itemId: input.id,
    })

    if (isError) {
      ply.Donatos()._sPrint(`Произошла ошибка: ${error}`)
      return false
    }

    ply.Donatos()._sPrint('Вы заморозили предмет.')

    await ply.Donatos()._sLoadRemoteData()
    ply.Donatos()._sOnPlayerJoined()

    return true
  },
  unfreezeActiveItem: async (ply, input: { id: number }) => {
    const playerId = ply.Donatos().ID
    if (!playerId) {
      ply.Donatos()._sPrint('Ошибка: данные игрока не загружены. Попробуйте позднее.')
      return false
    }

    const { isError, data, error } = await serverApiRequest('player:unfreeze-active-item', {
      playerId: playerId,
      itemId: input.id,
    })

    if (isError) {
      ply.Donatos()._sPrint(`Произошла ошибка: ${error}`)
      return false
    }

    ply.Donatos()._sPrint('Вы разморозили предмет.')

    await ply.Donatos()._sLoadRemoteData()
    ply.Donatos()._sOnPlayerJoined()

    return true
  },
} satisfies Record<string, ServerNetHandler>

if (SERVER) {
  util.AddNetworkString('donatos')
  net.Receive('donatos', async (len: number, ply: Player) => {
    const nonce = net.ReadUInt(20)
    const [action, data] = util.JSONToTable(net.ReadString()) as [keyof typeof handleServerMessage, unknown]

    try {
      const result = await handleServerMessage[action](ply, data as never)

      netMessageToClient(ply, 'resultFromServer', [nonce, result])
    } catch (e) {
      log.error(`Error in handleServerMessage[${action}]:`)
      print(e)
    }
  })
}
