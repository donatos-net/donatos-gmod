import { descriptionMarkup } from '@/donatos/client-utils'
import { netMessageToServer } from '@/donatos/net'
import { customizedColor, destroyUi, themedUi } from '@/ui/ui-utils'
import { cluster } from '@/utils/lang'
import { type PaintExt, cAlpha, ui } from '@/utils/ui'
import type { serverApiSchema } from 'api-schema/src'
import px = ui.px

export function tabInventory(container: DPanel) {
  container.Clear()

  if (LocalPlayer().Donatos().InventoryItems.length === 0) {
    const empty = themedUi().label({
      parent: container,
      color: themedUi().theme.colors.foreground,
      text: 'Инвентарь пуст :(',
      size: 'md',
    })
    empty.Dock(DOCK.FILL)
    empty.SetContentAlignment(5)
    return
  }

  const scrollContainer = themedUi().scrollPanel({ parent: container })
  scrollContainer.Dock(DOCK.FILL)

  container.InvalidateLayout(true)

  const itemsContainer = themedUi().panel({
    parent: scrollContainer,
    color: Color(0, 0, 0, 0),
  })
  itemsContainer.Dock(DOCK.TOP)
  // itemsContainer.DockMargin(0, 0, px(5), px(10))

  const itemCols: DPanel[] = []

  {
    const leftGoods = themedUi().panel({
      parent: itemsContainer,
      color: Color(0, 0, 0, 0),
    })
    leftGoods.Dock(DOCK.LEFT)
    leftGoods.SetWide(scrollContainer.GetWide() / 2 - px(5))

    const rightGoods = themedUi().panel({
      parent: itemsContainer,
      color: Color(0, 0, 0, 0),
    })
    rightGoods.Dock(DOCK.RIGHT)
    rightGoods.SetWide(scrollContainer.GetWide() / 2 - px(5))

    itemCols.push(leftGoods)
    itemCols.push(rightGoods)

    const itemCardColor = customizedColor(donatos.uiConfig?.components?.shopItem, 'secondary')

    for (const [i1, i2] of cluster(LocalPlayer().Donatos().InventoryItems)) {
      const m1 = descriptionMarkup(
        i1?.goods?.description || '',
        leftGoods.GetWide(),
        cAlpha(itemCardColor.foreground, 150),
      )
      const m2 = descriptionMarkup(
        i2?.goods?.description || '',
        rightGoods.GetWide(),
        cAlpha(itemCardColor.foreground, 150),
      )

      const maxDescriptionHeight = math.max(m1.GetHeight(), m2?.GetHeight() || 0)

      if (i1) {
        itemCard({
          item: i1,
          parentPanel: leftGoods,
          descriptionMarkup: m1,
          descriptionHeight: maxDescriptionHeight,
          invalidateLayout: () => tabInventory(container),
        })
      }
      if (i2) {
        itemCard({
          item: i2,
          parentPanel: rightGoods,
          descriptionMarkup: m2,
          descriptionHeight: maxDescriptionHeight,
          invalidateLayout: () => tabInventory(container),
        })
      }
    }

    leftGoods.InvalidateLayout(true)
    rightGoods.InvalidateLayout(true)

    leftGoods.SizeToChildren(false, true)
    rightGoods.SizeToChildren(false, true)

    itemsContainer.SizeToChildren(false, true)
  }

  scrollContainer.GetCanvas().InvalidateLayout(true)
  scrollContainer.InvalidateLayout(true)

  const scrollBar = scrollContainer.GetVBar() as DPanel & { Enabled: boolean }
  const scrollBarEnabled = scrollBar.Enabled

  itemsContainer.DockMargin(0, 0, scrollBarEnabled ? px(5) : 0, px(10))

  for (const col of itemCols) {
    const width = scrollBarEnabled
      ? (scrollContainer.GetWide() - scrollBar.GetWide()) / 2
      : scrollContainer.GetWide() / 2
    col.SetWide(scrollBarEnabled ? width : width - px(2.5))
  }
}

function itemCard({
  item,
  parentPanel,
  descriptionMarkup,
  descriptionHeight,
  invalidateLayout,
}: {
  item: NonNullable<serverApiSchema['server:get-player']['output']>['inventoryItems'][0]
  parentPanel: DPanel
  descriptionMarkup: MarkupObject
  descriptionHeight: number
  invalidateLayout: () => void
}) {
  const componentColor = customizedColor(donatos.uiConfig?.components?.shopItem, 'secondary')

  const itemContainer = themedUi().panel({
    parent: parentPanel,
    classname: 'DButton',
    color: componentColor.background,
  }) as unknown as DButton
  itemContainer.SetText('')
  itemContainer.Dock(DOCK.TOP)
  itemContainer.DockMargin(0, 0, 0, px(5))
  itemContainer.DockPadding(px(6), px(6), px(6), px(6))

  itemContainer.DoClick = () => {
    themedUi()
      .dermaMenu({
        variant: 'default',
        size: 'sm',
        options: [
          {
            text: 'Активировать',
            onClick: async () => {
              if (await netMessageToServer('activateItem', { id: item.id })) {
                LocalPlayer().Donatos().InventoryItems = LocalPlayer()
                  .Donatos()
                  .InventoryItems.filter((i) => i.id !== item.id)
                invalidateLayout()
                await netMessageToServer('requestRefresh', undefined)
                invalidateLayout()
              }
            },
          },
          {
            text: 'Выбросить',
            onClick: async () => {
              if (await netMessageToServer('dropItem', { id: item.id })) {
                destroyUi()
              }
            },
          },
        ],
      })
      .Open(/*gui.MouseX() + px(15), gui.MouseY() - px(5)*/)
  }
  itemContainer.DoRightClick = itemContainer.DoClick

  parentPanel.InvalidateLayout(true)

  const durationText =
    item.variant?.duration !== undefined
      ? item.variant.duration === 0
        ? ' (навсегда)'
        : ` (${item.variant.duration} дн.)`
      : ''

  {
    const nameContainer = themedUi().panel({
      parent: itemContainer,
      classname: 'DLabel',
      color: Color(0, 0, 0, 0),
    }) as unknown as DLabel
    nameContainer.SetText('')
    nameContainer.Dock(DOCK.TOP)
    nameContainer.DockMargin(0, 0, 0, px(2))

    const name = themedUi().label({
      parent: nameContainer,
      text: `${item.goods?.name || 'Удалённый предмет'}${durationText}`,
      size: 'sm',
      color: componentColor.foreground,
    })
    name.Dock(DOCK.LEFT)
    name.SizeToContentsX()

    // workaround
    nameContainer.SetTall(name.GetTall())

    const actions = themedUi().label({
      parent: nameContainer,
      size: 'xl',
      text: '⋯',
      color: componentColor.foreground,
      font: 'robotoBold',
    })
    actions.Dock(DOCK.RIGHT)
    actions.SizeToContentsX()
    actions.SetContentAlignment(2)
    actions.SetContentAlignment(2)
  }

  const description = vgui.Create('DLabel', itemContainer) as DLabel & PaintExt<DLabel>
  description.SetText('')
  description.Dock(DOCK.TOP)
  description.SetTall(descriptionHeight)
  description.Paint = () => descriptionMarkup.Draw(0, 0)

  const price = themedUi().label({
    parent: itemContainer,
    text: `Куплено за ${item.amountPaid} р.`,
    size: 'xs',
    color: componentColor.foreground,
  })
  price.Dock(DOCK.TOP)
  price.DockMargin(0, px(4), 0, 0)

  itemContainer.InvalidateLayout(true)
  itemContainer.SizeToChildren(false, true)
}
