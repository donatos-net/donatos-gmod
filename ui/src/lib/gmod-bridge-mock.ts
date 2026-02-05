import { mockPlayerData, mockServerConfig } from '@/lib/mock-data';

type MockResponse = {
	action: string;
	data: unknown;
};

export function installMockBridge() {
	if (window.donatosLua) {
		return;
	}

	window.__donatosMock = true;

	window.donatosLua = {
		netMessageToServer(callbackId, action, dataJson) {
			const payload: MockResponse = { action, data: JSON.parse(dataJson) };
			console.log('[MockBridge] netMessageToServer', payload);

			setTimeout(() => {
				window.donatosNative?._resolveCallback(callbackId, {
					success: true,
					data: true,
				});
			}, 250);
		},
		openUrl(url) {
			window.open(url, '_blank');
		},
		closeUi() {
			window.close();
		},
		requestStateSync() {},
	};

	window.donatosNative?.setState('serverConfig', mockServerConfig);
	window.donatosNative?.setState('playerData', mockPlayerData);
}
