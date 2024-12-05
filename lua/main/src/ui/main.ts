import { donatosAddText } from '@/donatos/client-utils'
import { remoteConfig } from '@/donatos/remote-config'
import { tabActiveItems } from '@/ui/tab-active-items'
import { tabInventory } from '@/ui/tab-inventory'
import { tabShop } from '@/ui/tab-shop'
import { destroyUi, themedUi, uiPersistedVar } from '@/ui/ui-utils'
import { cAlpha, ui } from '@/utils/ui'
import px = ui.px

destroyUi()

export type DonatosUiTab = 'shop' | 'inventory' | 'activeItems' | 'profile'

export function donatosUi(tab?: DonatosUiTab) {
  destroyUi()

  if (!remoteConfig.value) {
    donatosAddText('Данные не загружены. Попробуйте немного позднее.')
    return
  }

  const frame = themedUi().frame({
    color: cAlpha(themedUi().theme.colors.background, 250),
    closeOnEsc: false,
  })
  frame.SetSize(px(600), px(400))
  frame.MakePopup()
  frame.SetTitle('')
  frame.Center()
  frame.ShowCloseButton(false)
  frame.DockPadding(px(5), px(5), px(5), px(5))

  uiPersistedVar.frame = frame

  const mainPan = themedUi().panel({ parent: frame, color: Color(0, 0, 0, 0) })
  mainPan.Dock(DOCK.FILL)
  // mainPan.DockPadding(px(5), 0, px(5), px(5))

  frame.InvalidateLayout(true)

  function content(tab: DonatosUiTab) {
    mainPan.Clear()

    const navbar = themedUi().panel({ parent: mainPan, color: themedUi().theme.colors.muted })
    navbar.SetSize(0, px(30))
    navbar.Dock(DOCK.TOP)
    navbar.DockMargin(0, 0, 0, px(7))
    navbar.DockPadding(px(5), px(5), px(5), px(5))

    const navBtn = (key: typeof tab, name: string) => {
      const btn = themedUi().btn({ parent: navbar, ...donatos.uiConfig?.components?.headerNavBtn })
      btn.Dock(DOCK.LEFT)
      btn.DockMargin(0, 0, px(5), 0)
      btn.SetText(name)
      btn.SetEnabled(tab !== key)
      btn.DoClick = () => content(key)
      btn.SizeToContentsX(px(20))
    }

    navBtn('shop', 'Магазин')
    navBtn('inventory', 'Инвентарь')
    navBtn('activeItems', 'Активные предметы')
    // navBtn('profile', 'Профиль')

    {
      const close = themedUi().btn({ parent: navbar, variant: 'secondary' })
      close.Dock(DOCK.RIGHT)
      close.SetText('×')
      close.SizeToContentsX(px(15))
      close.DoClick = () => frame.Close()
    }

    if (LocalPlayer().Donatos().Balance > 0) {
      const points = themedUi().btn({ parent: navbar, variant: 'secondary', size: 'sm' })
      points.Dock(DOCK.RIGHT)
      points.DockMargin(0, 0, px(5), 0)
      points.SetText(`Бонусы: ${LocalPlayer().Donatos().Balance} р.`)
      points.SizeToContentsX(px(15))
    }

    const container = themedUi().panel({ parent: mainPan, color: Color(0, 0, 0, 0) })
    container.Dock(DOCK.FILL)
    mainPan.InvalidateLayout(true)

    if (tab === 'shop') {
      tabShop(container, undefined)
    } else if (tab === 'inventory') {
      tabInventory(container)
    } else if (tab === 'activeItems') {
      tabActiveItems(container)
    }
  }

  content(tab ?? 'shop')

  /*const footer = themedUi().label({ parent: frame, text: `Баланс: ${LocalPlayer().donatos().balance} р.` })
  footer.Dock(DOCK.BOTTOM)
  footer.DockMargin(px(5), px(5), 0, 0)*/

  return frame
}
