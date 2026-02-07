import type { serverApiSchema } from 'api-schema/src'

export type RemoteData = serverApiSchema['server:get-player']['output']

export class DonatosSharedPlayer {
	_remoteData:
		| { isLoaded: true; data: RemoteData }
		| { isLoaded: false; data: undefined }

	constructor(protected readonly _ply: Player) {
		this._remoteData = {
			isLoaded: false,
			data: undefined,
		}
	}

	IsLoaded() {
		return this._remoteData.isLoaded
	}

	GetID(): number | undefined {
		return this._remoteData.data?.player.id
	}

	GetBalance(): number {
		return this._remoteData.data?.player.balance || 0
	}

	GetInventoryItems(): NonNullable<RemoteData>['inventoryItems'] {
		return this._remoteData.data?.inventoryItems || []
	}

	_setInventoryItems(items: NonNullable<RemoteData>['inventoryItems']) {
		if (this._remoteData.data) {
			this._remoteData.data.inventoryItems = items
		}
	}

	GetActiveItems(): NonNullable<RemoteData>['activeItems'] {
		return this._remoteData.data?.activeItems ?? []
	}

	HasActiveItem(key: string): boolean {
		const items = this._remoteData.data?.activeItems
		if (!items) {
			return false
		}
		return items.find((i) => !i.isFrozen && i.goods.key === key) !== undefined
	}
}
