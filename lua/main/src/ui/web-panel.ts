export type DonatosUiTab = 'shop' | 'inventory' | 'activeItems' | 'profile'

import { netMessageToServer } from '@/donatos/net'
import { log } from '@/utils/log'
import { delay, donatosHookId, donatosState } from '@/utils/state'

const html = '__DONATOS_HTML__'

const webPanelState = donatosState.webPanel

destroyPanel()

let webPanelLastUsedAt = RealTime()

function markWebPanelUsed() {
	webPanelLastUsedAt = RealTime()
}

function isPanelValid(panel?: DHTML): panel is DHTML {
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

	pushState(webPanelState.panel, key, value)
}

export function getPanelInstance() {
	return isPanelValid(webPanelState.panel)
		? (webPanelState.panel as DHTML)
		: undefined
}

function destroyPanel() {
	if (IsValid(webPanelState.panel)) {
		webPanelState.panel?.Remove()
	}
	webPanelState.panel = undefined
}

function createPanel() {
	destroyPanel()

	const panel = vgui.Create('DHTML') as DHTML
	webPanelState.panel = panel

	// panel.SetPos(0, 0);
	panel.SetSize(math.min(2000, ScrW() / 2), ScrH() / 2)
	panel.SetKeyboardInputEnabled(true)
	panel.SetMouseInputEnabled(true)
	panel.Center()

	type LoadingOverlayPanel = DPanel & {
		Paint?: (this: DPanel, w: number, h: number) => void
	}
	let loadingOverlay: LoadingOverlayPanel | undefined = vgui.Create(
		'DPanel',
		panel,
	) as LoadingOverlayPanel

	loadingOverlay.SetPos(0, 0)
	loadingOverlay.SetSize(panel.GetWide(), panel.GetTall())
	loadingOverlay.SetAlpha(0)
	loadingOverlay.AlphaTo(255, 0.1)
	loadingOverlay.SetZPos(32767)
	loadingOverlay.Paint = function (this: DPanel, w: number, h: number) {
		draw.RoundedBox(w * 0.01, 0, 0, w, h, Color(10, 12, 14, 254))

		const barWidth = math.min(420, w * 0.7)
		const barHeight = math.min(10, w * 0.005)
		const barX = (w - barWidth) / 2
		const barY = h / 2 - barHeight / 2
		const chunkWidth = barWidth * 0.28
		const travel = barWidth - chunkWidth
		const speed = 600
		const tick = (RealTime() * speed) % (travel * 2)
		const chunkOffset = tick > travel ? travel * 2 - tick : tick

		draw.RoundedBox(
			w * 0.01,
			barX,
			barY,
			barWidth,
			barHeight,
			Color(255, 255, 255, 28),
		)
		draw.RoundedBox(
			w * 0.01,
			barX + chunkOffset,
			barY,
			chunkWidth,
			barHeight,
			Color(255, 255, 255, 235),
		)
	}

	const removeLoadingOverlay = () => {
		if (!loadingOverlay || !IsValid(loadingOverlay)) {
			return
		}

		loadingOverlay.Stop()

		loadingOverlay.AlphaTo(0, 0.5, 0, (_, targetPanel: Panel) => {
			loadingOverlay = undefined
			if (IsValid(targetPanel)) {
				targetPanel.Remove()
			}
		})
	}

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
		markWebPanelUsed()
		panel.SetVisible(false)
	})
	panel.AddFunction('donatosLua', 'uiReady', () => {
		removeLoadingOverlay()
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
	markWebPanelUsed()

	if (donatos.dev?.enabled) {
		createPanel()
	}

	const panel = getPanelInstance() ?? createPanel()

	// Show and focus panel
	panel.SetVisible(true)
	panel.MakePopup()

	if (tab) {
		log.debug(`Web UI opened with tab: ${tab}`)
	}

	return panel
}

hook.Add('GUIMousePressed', donatosHookId('web_ui'), () => {
	getPanelInstance()?.SetVisible(false)
})

function performGc() {
	const panelRef = webPanelState.panel
	if (!panelRef) {
		return
	}

	if (!IsValid(panelRef)) {
		webPanelState.panel = undefined
		return
	}

	if (panelRef.IsVisible() || RealTime() - webPanelLastUsedAt < 5 * 60) {
		return
	}

	destroyPanel()
}

async function scheduleGc() {
	await delay(60)
	performGc()
	void scheduleGc()
}

void scheduleGc()
