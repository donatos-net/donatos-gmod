import { netMessageToServer, netMessageToServerCallback } from '@/donatos/net'
import { donatosWebUi } from '@/ui/web-panel'
import { donatosHookId } from '@/utils/state'

const openUi = (tab?: Parameters<typeof donatosWebUi>[0]) => {
	return donatosWebUi(tab)
}

donatos.OpenUI = openUi
donatos.NetMessageToServer = netMessageToServerCallback

netMessageToServer('requestSync', undefined)

hook.Add(
	'PlayerButtonDown',
	donatosHookId('keybind'),
	(ply: Player, key: KEY) => {
		if (
			key === (donatos.config?.menuKeyBind ?? KEY.KEY_F6) &&
			IsFirstTimePredicted()
		) {
			// netMessageToServer('requestSync', undefined)
			openUi()
		}
	},
)

hook.Add('InitPostEntity', donatosHookId('postEntity'), () => {
	netMessageToServer('requestSync', undefined)
})

list.Set('DesktopWindows', 'donatos', {
	title: 'Автодонат',
	icon: 'icon16/money_add.png',
	init: () => openUi(),
})

concommand.Add('donatos', () => openUi(), undefined, 'Открыть донат-меню')
