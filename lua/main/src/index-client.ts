import { netMessageToServer } from '@/donatos/net'
import { donatosUi } from '@/ui/main'
import { donatosHookId } from '@/utils/addon'

donatos.UI = donatosUi

hook.Add('PlayerButtonDown', donatosHookId('keybind'), (ply: Player, key: KEY) => {
  if (key === (donatos.config?.menuKeyBind ?? KEY.KEY_F6) && IsFirstTimePredicted()) {
    // netMessageToServer('requestSync', undefined)
    donatosUi()
  }
})

hook.Add('InitPostEntity', donatosHookId('postEntity'), () => {
  netMessageToServer('requestSync', undefined)
})

list.Set('DesktopWindows', 'donatos', {
  title: 'Автодонат',
  icon: 'icon16/money_add.png',
  init: () => donatosUi(),
})
