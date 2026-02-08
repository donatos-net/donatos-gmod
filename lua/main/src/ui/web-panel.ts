export type DonatosUiTab = 'shop' | 'inventory' | 'activeItems' | 'profile'

import { netMessageToServer } from '@/donatos/net'
import { log } from '@/utils/log'
import { donatosState } from '@/utils/state'

const html = '__DONATOS_HTML__'

const webPanelState = donatosState.webPanel

createPanel()

function isPanelValid(panel?: DHTML) {
	return panel !== undefined && IsValid(panel)
}

function queueJsonCallback(
	panel: DHTML,
	fnName: string,
	callbackId: number,
	value: unknown,
) {
	const payload = util.TableToJSON({ value })
	const safePayload = string.JavascriptSafe(payload ?? '{}')
	const js = `window.donatosNative.${fnName}(${callbackId}, JSON.parse('${safePayload}').value)`
	panel.QueueJavascript(js)
}

function pushState(panel: DHTML, key: string, value: unknown) {
	const payload = util.TableToJSON({ value })
	const safeKey = string.JavascriptSafe(key)
	const safePayload = string.JavascriptSafe(payload ?? '{}')
	const js = `window.donatosNative.setState?.('${safeKey}', JSON.parse('${safePayload}').value)`
	panel.QueueJavascript(js)
}

export function pushWebUiState(key: string, value: unknown) {
	if (!isPanelValid(webPanelState.panel)) {
		return
	}

	pushState(webPanelState.panel as DHTML, key, value)
}

export function getPanelInstance() {
	return isPanelValid(webPanelState.panel)
		? (webPanelState.panel as DHTML)
		: undefined
}

function createPanel() {
	const old = getPanelInstance()
	if (old) {
		old.Remove()
	}

	const panel = vgui.Create('DHTML') as DHTML
	webPanelState.panel = panel

	// panel.SetPos(0, 0);
	panel.SetSize(ScrW() / 2, ScrH() / 2)
	panel.SetKeyboardInputEnabled(true)
	panel.SetMouseInputEnabled(true)
	panel.Center()
	panel.SetVisible(false) // Create in background

	panel.AddFunction(
		'donatosLua',
		'netMessageToServer',
		(callbackId: number, action: string, dataJson: string) => {
			const data = util.JSONToTable(dataJson)
			if (data === undefined) {
				queueJsonCallback(panel, '_rejectCallback', callbackId, {
					error: 'Invalid JSON payload',
				})
				return
			}

			netMessageToServer(action as never, data as never)
				.then((result) => {
					queueJsonCallback(panel, '_resolveCallback', callbackId, result)
				})
				.catch((error) => {
					queueJsonCallback(panel, '_rejectCallback', callbackId, {
						error: tostring(error),
					})
				})
		},
	)
	panel.AddFunction('donatosLua', 'openUrl', (url: string) => {
		gui.OpenURL(url)
	})
	panel.AddFunction('donatosLua', 'closeUi', () => {
		panel.SetVisible(false)
	})
	panel.AddFunction('donatosLua', 'requestStateSync', () => {
		pushState(panel, 'serverConfig', donatosState.remoteConfig.value)
		const localPlayer = LocalPlayer()
		if (IsValid(localPlayer)) {
			pushState(panel, 'playerExternalId', localPlayer.SteamID64())
			const remoteData = localPlayer.Donatos()._remoteData
			if (remoteData.isLoaded) {
				pushState(panel, 'playerData', remoteData.data)
			}
		}
	})

	panel.OnDocumentReady = () => {
		const zoom = math.min(ScrW() / 1920, ScrH() / 1080)
		if (zoom > 1) {
			panel.QueueJavascript(`document.documentElement.style.zoom = '${zoom}'`)
		}
	}

	const devUrl = donatos.dev?.enabled ? donatos.dev?.webUiUrl : undefined
	if (devUrl && devUrl.length > 0) {
		panel.OpenURL(devUrl)
	} else {
		panel.SetHTML(html)
	}

	return panel
}

export function donatosWebUi(tab?: string) {
	// Create panel if not exists
	if (!isPanelValid(webPanelState.panel) || donatos.dev?.enabled) {
		createPanel()
	}

	const panel = webPanelState.panel as DHTML

	// Show and focus panel
	panel.SetVisible(true)
	panel.MakePopup()

	if (tab) {
		log.debug(`Web UI opened with tab: ${tab}`)
	}

	return panel
}

hook.Add('GUIMousePressed', 'donatos_web_ui', () => {
	if (isPanelValid(webPanelState.panel)) {
		webPanelState.panel?.SetVisible(false)
	}
})
