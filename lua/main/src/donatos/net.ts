import type { handleClientMessage } from '@/donatos/net/client'
import type { handleServerMessage } from '@/donatos/net/server'
import { donatosState } from '@/utils/state'

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type ServerNetHandler<I = any, O = any> = (
	ply: Player,
	input: I,
) => Promise<O>
export type InferServerNetHandler<T extends ServerNetHandler> = {
	in: Parameters<T>[1]
	out: Awaited<ReturnType<T>>
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type ClientNetHandler<I = any> = (input: I) => void
export type InferClientNetHandler<T extends ClientNetHandler> = {
	in: Parameters<T>[0]
}

export const clientNonce = donatosState.clientNonce

export function netMessageToServer<T extends keyof typeof handleServerMessage>(
	action: T,
	data: InferServerNetHandler<(typeof handleServerMessage)[T]>['in'],
): Promise<InferServerNetHandler<(typeof handleServerMessage)[T]>['out']> {
	return new Promise((resolve) => {
		net.Start('donatos')
		net.WriteUInt(clientNonce.value, 20)
		net.WriteString(util.TableToJSON([action, data]))
		net.SendToServer()
		clientNonce.handlers[clientNonce.value] = (data: unknown) =>
			resolve(
				data as InferServerNetHandler<(typeof handleServerMessage)[T]>['out'],
			)
		clientNonce.value += 1
	})
}

export function netMessageToServerCallback<
	T extends keyof typeof handleServerMessage,
>(
	action: T,
	data: InferServerNetHandler<(typeof handleServerMessage)[T]>['in'],
	callback: (
		data: InferServerNetHandler<(typeof handleServerMessage)[T]>['out'],
	) => void,
) {
	netMessageToServer(action, data).then((data) => callback(data))
}

export function netMessageToClient<T extends keyof typeof handleClientMessage>(
	ply: Player | undefined,
	action: T,
	data: InferClientNetHandler<(typeof handleClientMessage)[T]>['in'],
) {
	if (ply && !IsValid(ply)) {
		return
	}

	net.Start('donatos')
	net.WriteString(util.TableToJSON([action, data]))

	if (ply) {
		net.Send(ply)
	} else {
		net.Broadcast()
	}
}
