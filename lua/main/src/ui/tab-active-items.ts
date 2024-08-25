import { themedUi } from '@/ui/ui-utils'
import { ui } from '@/utils/ui'
import px = ui.px

export function tabActiveItems(container: DPanel) {
  container.Clear()

  if (LocalPlayer().Donatos().ActiveItems.length === 0) {
    const empty = themedUi().label({ parent: container, text: 'У вас нет активных предметов :(', size: 'md' })
    empty.Dock(DOCK.FILL)
    empty.SetContentAlignment(5)
    return
  }

  const scrollContainer = themedUi().scrollPanel({ parent: container })
  scrollContainer.Dock(DOCK.FILL)

  container.InvalidateLayout(true)

  const itemPanels: DPanel[] = []
  const itemsSorted = LocalPlayer()
    .Donatos()
    .ActiveItems.sort((a, b) => {
      if (a.expires || b.expires) {
        if (!a.expires) {
          return 1
        }
        if (!b.expires) {
          return -1
        }
        return a.expires.inS / a.expires.durationS - b.expires.inS / b.expires.durationS
      }
      return 0
    })

  for (const i of itemsSorted) {
    const panel = themedUi().panel({ parent: scrollContainer, color: themedUi().theme.colors.secondary })
    panel.Dock(DOCK.TOP)
    panel.DockMargin(0, 0, 0, px(5))
    panel.DockPadding(px(5), px(5), px(5), px(5))

    itemPanels.push(panel)

    const name = themedUi().label({
      parent: panel,
      text: i.name,
      size: 'md',
      color: themedUi().theme.colors.secondaryForeground,
    })
    name.Dock(DOCK.TOP)
    name.DockMargin(0, 0, 0, px(2))
    name.SizeToContentsX()

    if (i.expires) {
      const exp = themedUi().label({
        parent: panel,
        text: `истекает ${i.expires.in}`,
        size: 'xs',
        color: themedUi().theme.colors.mutedForeground,
      })
      exp.Dock(DOCK.TOP)
      exp.DockMargin(0, 0, 0, px(2))

      const progressBar = themedUi().panel({
        parent: panel,
        color: themedUi().theme.colors.primaryForeground,
      })
      progressBar.Dock(DOCK.TOP)
      progressBar.SetTall(px(8))

      const r = px(3)
      const ratio = i.expires.inS / i.expires.durationS
      const bg = themedUi().theme.colors.muted
      const bgFill = themedUi().theme.colors.mutedForeground
      progressBar.Paint = function (this, w, h) {
        draw.RoundedBox(r, 0, 0, w, h, bg)
        draw.RoundedBox(r, 0, 0, w * ratio, h, bgFill)
      }
    } else {
      const exp = themedUi().label({
        parent: panel,
        text: 'навсегда',
        size: 'xs',
        color: themedUi().theme.colors.mutedForeground,
      })
      exp.Dock(DOCK.TOP)
    }

    panel.InvalidateLayout(true)
    panel.SizeToChildren(false, true)
  }

  scrollContainer.GetCanvas().InvalidateLayout(true)
  scrollContainer.InvalidateLayout(true)

  const scrollBar = scrollContainer.GetVBar() as DPanel & { Enabled: boolean }
  const scrollBarEnabled = scrollBar.Enabled

  if (scrollBarEnabled) {
    for (const col of itemPanels) {
      col.DockMargin(0, 0, px(5), px(5))
    }
  }
}
