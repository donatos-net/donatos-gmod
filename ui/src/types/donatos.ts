export interface Good {
  id: number
  name: string
  order?: number
  category?: string
  categoryId?: number
  key: string
  description?: string
  variants?: GoodVariant[]
}

export interface GoodVariant {
  id: string
  price: number
  duration?: number // days, 0 = forever, undefined = instant
}

export interface GoodCategory {
  id: number
  name: string
}

export interface InventoryItem {
  id: number
  goodsId?: number
  goods?: {
    name: string
    description?: string
    key: string
  }
  variantId?: string
  variant?: GoodVariant
  amountPaid?: string
}

export interface ActiveItem {
  id: number
  activatedAt: number
  expires?: {
    at: number
    in: string
    inS: number
    durationS: number
  }
  isFrozen: boolean
  frozenAt?: number
  freezeCounter?: number
  goods: {
    key: string
    meta?: string
    name: string
  }
  variant?: GoodVariant
}

export interface PlayerData {
  player: {
    id: number
    externalId: string
    balance: number
  }
  inventoryItems: InventoryItem[]
  activeItems: ActiveItem[]
}

export interface ServerConfig {
  name: string
  updatedAt: Date
  payUrl: string
  goods: Good[]
  goodsCategories: GoodCategory[]
}
