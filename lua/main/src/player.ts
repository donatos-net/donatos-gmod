import type { serverApiSchema } from 'api-schema/src';
import { donatosItems, invokeDonatosItem, knownSamRanks } from '@/donatos/item';
import { netMessageToClient } from '@/donatos/net';
import { serverApiRequest } from '@/donatos/server-api';
import { sendDonatosMessage } from '@/donatos/server-utils';
import { type Result, result } from '@/utils/lang';
import { log } from '@/utils/log';

type RemoteData = serverApiSchema['server:get-player']['output'];

export class DonatosPlayer {
	_remoteData:
		| { isLoaded: true; data: RemoteData }
		| { isLoaded: false; data: undefined };

	constructor(private readonly _ply: Player) {
		this._remoteData = {
			isLoaded: false,
			data: undefined,
		};
	}

	static fromExisting(p: DonatosPlayer): DonatosPlayer {
		const dp = new DonatosPlayer(p._ply);
		if (p._remoteData !== undefined) {
			dp._remoteData = p._remoteData;
		}
		return dp;
	}

	get IsLoaded() {
		return this._remoteData.isLoaded;
	}

	get ID(): number | undefined {
		return this._remoteData.data?.player.id;
	}

	get Balance(): number {
		return this._remoteData.data?.player.balance || 0;
	}

	get InventoryItems(): NonNullable<RemoteData>['inventoryItems'] {
		return this._remoteData.data?.inventoryItems || [];
	}

	set InventoryItems(items: NonNullable<RemoteData>['inventoryItems']) {
		if (this._remoteData.data) {
			this._remoteData.data.inventoryItems = items;
		}
	}

	get ActiveItems(): NonNullable<RemoteData>['activeItems'] {
		return this._remoteData.data?.activeItems ?? [];
	}

	HasActiveItem(key: string): boolean {
		return (
			this.ActiveItems.find((i) => !i.isFrozen && i.goods.key === key) !==
			undefined
		);
	}

	async _sLoadRemoteData(): Promise<
		Result<serverApiSchema['server:get-player']['output']>
	> {
		if (CLIENT) {
			return result.err('Clientside not supported');
		}

		log.info(
			`Loading data for player ${this._ply.SteamID()} (${this._ply.Nick()})`,
		);

		const apiResult = await serverApiRequest('server:get-player', {
			playerExternalId: this._ply.SteamID64(),
			setName: this._ply.Nick(),
		});

		const { data, isError, error } = apiResult;

		if (isError) {
			log.error(
				`Failed to load data for player ${this._ply.SteamID()} (${this._ply.Nick()}): ${error}`,
			);
			return apiResult;
		}

		log.info(
			`Loaded data for player ${this._ply.SteamID()} (${this._ply.Nick()})`,
		);

		const wasLoaded = this._remoteData.isLoaded;
		const prevBalance = this._remoteData.data?.player?.balance;

		this._remoteData = { isLoaded: true, data };
		netMessageToClient(this._ply, 'syncPlayer', data);

		if (prevBalance && prevBalance < this.Balance) {
			this._sPrint(`Ваш баланс пополнен на ${this.Balance - prevBalance} р.`);
			this._ply.EmitSound('garrysmod/save_load4.wav', 75, 100, 0.25);
		}

		if (!wasLoaded && data) {
			if (data.player.balance > 0) {
				this._sPrint(`Вам доступно ${data.player.balance} р.`);
			}
			if (data.inventoryItems.length > 0) {
				const names = data.inventoryItems.map((i) => i.goods?.name ?? '???');
				this._sPrint(
					`У вас есть неактивированные предметы в инвентаре: ${names.join(', ')}`,
				);
			}
		}

		return apiResult;
	}

	_sSyncPlayer() {
		if (CLIENT) {
			return;
		}

		if (this._remoteData.isLoaded) {
			netMessageToClient(this._ply, 'syncPlayer', this._remoteData.data);
		}
	}

	_sPrint(...args: (string | Player | Color)[]) {
		sendDonatosMessage({ receiver: this._ply, args: args });
	}

	_sOnPlayerJoined() {
		if (!this.IsLoaded) {
			return;
		}

		{
			const ply = this._ply as Player & {
				sam_getrank?: () => string;
				sam_get_nwvar?: (key: string, fallback: string) => string;
				sam_set_rank?: (rank: string) => void;
			};

			if (ply.sam_set_rank) {
				const plySamRank =
					ply.sam_getrank?.() ??
					ply.sam_get_nwvar?.('rank', 'user') ??
					ply.GetUserGroup();
				const purchasedSamRanks: Record<string, true> = {};

				for (const itm of this.ActiveItems) {
					if (itm.isFrozen) {
						continue;
					}
					const donatosItem = donatosItems[itm.goods.key];
					if (donatosItem?.meta?.samRank) {
						purchasedSamRanks[donatosItem.meta.samRank] = true;
					}
				}

				if (knownSamRanks[plySamRank] && !purchasedSamRanks[plySamRank]) {
					log.info(
						`Removing expired SAM rank ${plySamRank} from user ${ply.SteamID()}`,
					);
					ply.sam_set_rank('user');
				}
			}
		}

		for (const itm of this.ActiveItems) {
			if (itm.isFrozen) {
				continue;
			}
			invokeDonatosItem(itm.goods.key, '_onPlayerJoin', this._ply, {
				goods: itm.goods,
			});
		}
	}
}
