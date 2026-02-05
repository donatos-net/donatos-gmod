import type { serverApiSchema } from './index'

export type DonatosServerActions = {
  requestSync: {
    input: undefined
    output: void
  }
  requestRefresh: {
    input: undefined
    output: boolean
  }
  purchaseGoods: {
    input: { goodsId: number; variantId: string }
    output: serverApiSchema['player:purchase-goods']['output'] | false
  }
  activateItem: {
    input: { id: number }
    output: boolean
  }
  dropItem: {
    input: { id: number }
    output: boolean
  }
  freezeActiveItem: {
    input: { id: number }
    output: boolean
  }
  unfreezeActiveItem: {
    input: { id: number }
    output: boolean
  }
}
