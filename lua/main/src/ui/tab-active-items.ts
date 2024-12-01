import { netMessageToServer } from '@/donatos/net'
import { themedUi } from '@/ui/ui-utils'
import { cAlpha, ui } from '@/utils/ui'
import px = ui.px

export function tabActiveItems(container: DPanel) {
  const invalidateLayout = () => tabActiveItems(container)

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
    const isButton = i.isFrozen || i.expires

    const panel = themedUi().panel({
      parent: scrollContainer,
      color: themedUi().theme.colors.secondary,
      classname: isButton ? 'DButton' : undefined,
    })
    panel.Dock(DOCK.TOP)
    panel.DockMargin(0, 0, 0, px(5))
    panel.DockPadding(px(5), px(5), px(5), px(5))

    itemPanels.push(panel)

    panel.InvalidateLayout(true)

    {
      const nameContainer = themedUi().panel({
        parent: panel,
        classname: 'DLabel',
        color: Color(0, 0, 0, 0),
      }) as unknown as DLabel
      nameContainer.SetText('')
      nameContainer.Dock(DOCK.TOP)
      nameContainer.DockMargin(0, 0, 0, px(2))

      const name = themedUi().label({
        parent: nameContainer,
        text: i.goods.name,
        size: 'md',
        color: themedUi().theme.colors.secondaryForeground,
      })
      name.Dock(DOCK.LEFT)
      name.SizeToContentsX()
      name.InvalidateLayout(true)

      // workaround
      nameContainer.SetTall(name.GetTall())

      if (isButton) {
        const actions = themedUi().label({
          parent: nameContainer,
          size: 'xl',
          text: '⋯',
          color: Color(255, 255, 255),
          font: 'robotoBold',
        })
        actions.Dock(DOCK.RIGHT)
        actions.SizeToContentsX()
        actions.SetContentAlignment(2)
      }
    }

    if (isButton) {
      const btn = panel as unknown as DButton
      btn.SetText('')
      btn.DoClick = () => {
        themedUi()
          .dermaMenu({
            variant: 'default',
            size: 'sm',
            options: i.isFrozen
              ? [
                  {
                    text: 'Разморозить',
                    onClick: async () => {
                      if (await netMessageToServer('unfreezeActiveItem', { id: i.id })) {
                        invalidateLayout()
                      }
                    },
                  },
                ]
              : [
                  {
                    text: 'Заморозить',
                    onClick: async () => {
                      askFreezeActiveItem({ id: i.id, invalidateLayout: () => invalidateLayout() })
                      /*if (await netMessageToServer('freezeActiveItem', { id: i.id })) {
                        invalidateLayout()
                      }*/
                    },
                  },
                ],
          })
          .Open()
      }
      btn.DoRightClick = btn.DoClick
    }

    if (i.isFrozen) {
      const exp = themedUi().label({
        parent: panel,
        text: 'заморожен',
        size: 'xs',
        color: themedUi().theme.colors.mutedForeground,
      })
      exp.Dock(DOCK.TOP)
      exp.DockMargin(0, 0, 0, px(2))
    } else if (i.expires) {
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

function askFreezeActiveItem(params: { id: number; invalidateLayout: () => void }) {
  const frame = themedUi().frame({
    color: cAlpha(themedUi().theme.colors.muted, 230),
  })
  frame.SetSize(px(330), px(120))
  frame.MakePopup()
  frame.SetTitle('')
  frame.Center()
  frame.ShowCloseButton(false)
  frame.DockPadding(px(5), px(5), px(5), px(5))

  frame.InvalidateLayout(true)

  const exp = themedUi().label({
    parent: frame,
    size: 'md',
    text: 'Заморозить активный предмет можно только 1 раз. Продолжить?',
    color: themedUi().theme.colors.secondaryForeground,
  })
  exp.SetContentAlignment(7)
  exp.SetWrap(true)
  exp.Dock(DOCK.FILL)
  exp.DockMargin(0, 0, 0, px(2))

  const yes = themedUi().btn({ parent: frame, size: 'sm', variant: 'default' })
  yes.Dock(DOCK.BOTTOM)
  yes.SetText('Заморозить')
  yes.DoClick = async () => {
    frame.Remove()
    if (await netMessageToServer('freezeActiveItem', { id: params.id })) {
      params.invalidateLayout()
    }
  }

  const no = themedUi().btn({ parent: frame, size: 'sm', variant: 'secondary' })
  no.Dock(DOCK.BOTTOM)
  no.SetText('Отмена')
  no.DockMargin(0, 0, 0, px(4))
  no.DoClick = () => frame.Remove()
}
