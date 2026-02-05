import type { DonatosServerActions } from '../../../api-schema/src/server-actions';

type CallbackEntry = {
	reject: (error: unknown) => void;
	resolve: (value: unknown) => void;
};

let callbackIdCounter = 0;
const callbackMap = new Map<number, CallbackEntry>();
const stateCallbacks: Record<string, (value: unknown) => void> = {};

export function installGmodBridge() {
	if (window.donatosNative) {
		return;
	}

	window.donatosNative = {
		_resolveCallback(callbackId: number, result: unknown) {
			const callback = callbackMap.get(callbackId);
			if (callback) {
				callback.resolve(result);
				callbackMap.delete(callbackId);
			}
		},

		_rejectCallback(callbackId: number, error: unknown) {
			const callback = callbackMap.get(callbackId);
			if (callback) {
				callback.reject(error);
				callbackMap.delete(callbackId);
			}
		},

		setState(key: string, value: unknown) {
			const callback = stateCallbacks[key];
			if (callback) callback(value);
		},
	};
}

export function netMessageToServer<T extends keyof DonatosServerActions>(
	action: T,
	data: DonatosServerActions[T]['input'],
): Promise<DonatosServerActions[T]['output']> {
	return new Promise((resolve, reject) => {
		if (!window.donatosLua?.netMessageToServer) {
			reject(new Error('donatosLua.netMessageToServer is not available'));
			return;
		}

		const callbackId = callbackIdCounter++;
		callbackMap.set(callbackId, {
			reject,
			resolve: resolve as (value: unknown) => void,
		});

		const dataJson = JSON.stringify(data);
		window.donatosLua.netMessageToServer(callbackId, action, dataJson);
	});
}

export function registerStateCallbacks(
	callbacks: Record<string, (value: unknown) => void>,
) {
	Object.assign(stateCallbacks, callbacks);
}

export function isInGame(): boolean {
	return typeof window.donatosLua !== 'undefined';
}

export function isMockEnvironment(): boolean {
	return window.__donatosMock === true;
}

export function openExternalUrl(url: string) {
	if (window.donatosLua?.openUrl) {
		window.donatosLua.openUrl(url);
		return;
	}

	window.open(url, '_blank');
}

export function closeUi() {
	if (window.donatosLua?.closeUi) {
		window.donatosLua.closeUi();
		return;
	}

	window.close();
}

export function requestStateSync() {
	if (window.donatosLua?.requestStateSync) {
		window.donatosLua.requestStateSync();
	}
}
