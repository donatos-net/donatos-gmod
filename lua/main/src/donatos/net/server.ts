import type { DonatosServerActions } from 'api-schema/src/server-actions';
import { donatosItems, invokeDonatosItem } from '@/donatos/item';
import { netMessageToClient, type ServerNetHandler } from '@/donatos/net';
import { remoteConfig } from '@/donatos/remote-config';
import { serverApiRequest } from '@/donatos/server-api';
import { sendDonatosMessage } from '@/donatos/server-utils';
import { createGiftEnt } from '@/ents/gift';
import { log } from '@/utils/log';

type ActionResult<T> =
	| { success: true; data: T }
	| { success: false; error: string };

function ok<T>(data: T): ActionResult<T> {
	return { success: true, data };
}

function err<T>(error: string): ActionResult<T> {
	return { success: false, error };
}

const hookRun = hook.Run as (
	eventName: string,
	...args: unknown[]
) => LuaMultiReturn<[boolean | undefined, string | undefined]>;

// client -> server -> client
type ServerActionHandlers = {
	[K in keyof DonatosServerActions]: ServerNetHandler<
		DonatosServerActions[K]['input'],
		DonatosServerActions[K]['output']
	>;
};

export const handleServerMessage = {
	requestSync: async (ply, input: undefined) => {
		ply.Donatos()._sSyncPlayer();
		if (remoteConfig.value) {
			netMessageToClient(undefined, 'syncConfig', remoteConfig.value);
		}
		return ok(true);
	},
	requestRefresh: async (ply, input: undefined) => {
		await ply.Donatos()._sLoadRemoteData();
		if (remoteConfig.value) {
			netMessageToClient(undefined, 'syncConfig', remoteConfig.value);
		}
		return ok(true);
	},
	purchaseGoods: async (ply, input: { goodsId: number; variantId: string }) => {
		const playerId = ply.Donatos().ID;
		if (!playerId) {
			return err('Ошибка: данные игрока не загружены. Попробуйте позднее.');
		}
		const { isError, data, error } = await serverApiRequest(
			'player:purchase-goods',
			{
				playerId: playerId,
				goodsId: input.goodsId,
				variantId: input.variantId,
			},
		);

		if (isError) {
			return err(`Произошла ошибка: ${error}`);
		}

		await ply.Donatos()._sLoadRemoteData();

		ply.EmitSound('garrysmod/content_downloaded.wav', 75, 100, 0.3);

		return ok(data);
	},
	activateItem: async (ply, input: { id: number }) => {
		const playerId = ply.Donatos().ID;
		if (!playerId) {
			return err('Ошибка: данные игрока не загружены. Попробуйте позднее.');
		}

		const inventoryItem = ply
			.Donatos()
			.InventoryItems.find((i) => i.id === input.id);
		if (!inventoryItem) {
			return err('Ошибка: предмет не найден в инвентаре.');
		}

		if (inventoryItem.goods && inventoryItem.variant?.duration === undefined) {
			const item = donatosItems[inventoryItem.goods.key];
			if (!item) {
				return err(
					'Ошибка: предмет не настроен. Обратитесь к администратору сервера.',
				);
			}
		}

		const [canActivate, message] = hookRun(
			'donatos:preActivateItem',
			ply,
			inventoryItem,
		);
		if (canActivate === false) {
			return err(
				`Вы не можете активировать этот предмет${message ? `: ${message}` : ''}`,
			);
		}

		const { isError, data, error } = await serverApiRequest(
			'player:activate-item',
			{
				playerId: playerId,
				itemId: input.id,
			},
		);

		if (isError) {
			return err(`Произошла ошибка: ${error}`);
		}

		const activateResult = invokeDonatosItem(
			data.goods.key,
			'_onActivate',
			ply,
			data,
		);
		if (activateResult.isError) {
			return err(
				'ВОЗНИКЛА ОШИБКА! Предмет настроен неверно, обратитесь к администратору сервера для возврата.',
			);
		}

		invokeDonatosItem(data.goods.key, '_onPlayerJoin', ply, data);

		// ply.donatos().sPrint(`Вы активировали предмет "${data.goods.name}"`)
		if (!data.order || data.order.isAnonymous === false) {
			sendDonatosMessage({
				args: [ply, ` активировал предмет "${data.goods.name}"`],
			});
		}
		ply.EmitSound('friends/friend_join.wav', 75, 100, 0.2);

		return ok(true);
	},
	dropItem: async (ply, input: { id: number }) => {
		const playerId = ply.Donatos().ID;
		if (!playerId) {
			return err('Ошибка: данные игрока не загружены. Попробуйте позднее.');
		}

		const { isError, data, error } = await serverApiRequest(
			'player:drop-item',
			{
				playerId: playerId,
				itemId: input.id,
			},
		);

		if (isError) {
			return err(`Произошла ошибка: ${error}`);
		}

		const tr = util.TraceLine({
			start: ply.EyePos(),
			endpos: ply.EyePos().addOp(ply.EyeAngles().Forward().mulOp(50)),
			filter: ply as Entity,
		} as Trace);

		const gift = createGiftEnt({
			pos: tr.HitPos,
			token: data.token,
			item: data.item,
			itemOwner: ply,
		});
		ply.EmitSound(
			`physics/metal/paintcan_impact_soft${math.random(1, 2)}.wav`,
			65,
			math.random(90, 110),
			0.3,
		);
		gift.GetPhysicsObject().SetVelocity(ply.EyeAngles().Forward().mulOp(50));

		return ok(true);
	},
	freezeActiveItem: async (ply, input: { id: number }) => {
		const playerId = ply.Donatos().ID;
		if (!playerId) {
			return err('Ошибка: данные игрока не загружены. Попробуйте позднее.');
		}

		const { isError, data, error } = await serverApiRequest(
			'player:freeze-active-item',
			{
				playerId: playerId,
				itemId: input.id,
			},
		);

		if (isError) {
			return err(`Произошла ошибка: ${error}`);
		}

		await ply.Donatos()._sLoadRemoteData();
		ply.Donatos()._sOnPlayerJoined();

		return ok(true);
	},
	unfreezeActiveItem: async (ply, input: { id: number }) => {
		const playerId = ply.Donatos().ID;
		if (!playerId) {
			return err('Ошибка: данные игрока не загружены. Попробуйте позднее.');
		}

		const { isError, data, error } = await serverApiRequest(
			'player:unfreeze-active-item',
			{
				playerId: playerId,
				itemId: input.id,
			},
		);

		if (isError) {
			return err(`Произошла ошибка: ${error}`);
		}

		await ply.Donatos()._sLoadRemoteData();
		ply.Donatos()._sOnPlayerJoined();

		return ok(true);
	},
} satisfies ServerActionHandlers;

if (SERVER) {
	util.AddNetworkString('donatos');
	net.Receive('donatos', async (len: number, ply: Player) => {
		const nonce = net.ReadUInt(20);
		const [action, data] = util.JSONToTable(net.ReadString()) as [
			keyof typeof handleServerMessage,
			unknown,
		];

		try {
			const result = await handleServerMessage[action](ply, data as never);

			netMessageToClient(ply, 'resultFromServer', [nonce, result]);
		} catch (e) {
			log.error(`Error in handleServerMessage[${action}]:`);
			print(e);
		}
	});
}
