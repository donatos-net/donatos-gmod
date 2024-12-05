import { descriptionMarkup } from '@/donatos/client-utils'
import { netMessageToServer } from '@/donatos/net'
import { remoteConfig } from '@/donatos/remote-config'
import { customizedColor, themedUi } from '@/ui/ui-utils'
import { cluster } from '@/utils/lang'
import { type PaintExt, cAlpha, ui } from '@/utils/ui'
import px = ui.px

export function tabShop(container: DPanel, selectedCategoryId: number | undefined) {
  container.Clear()

  const allCategories: { id: number; name: string; goods: NonNullable<(typeof remoteConfig)['value']>['goods'] }[] =
    remoteConfig.value?.goodsCategories.map((c) => ({ id: c.id, name: c.name, goods: [] })) ?? []
  allCategories.push({ id: -1, name: 'Разное', goods: [] })

  for (const item of remoteConfig.value?.goods || []) {
    allCategories.find((c) => c.id === (item.categoryId ?? -1))?.goods.push(item)
  }

  const filteredCategories = allCategories.filter((c) => (selectedCategoryId ? selectedCategoryId === c.id : true))

  if ((remoteConfig.value?.goods?.length ?? 0) === 0) {
    const empty = themedUi().label({
      parent: container,
      color: themedUi().theme.colors.foreground,
      text: 'Владелец сервера ещё не добавил товары.',
      size: 'md',
    })
    empty.Dock(DOCK.FILL)
    empty.SetContentAlignment(5)
    return
  }

  {
    const navbarContainer = themedUi().panel({ parent: container, color: Color(0, 0, 0, 0) })
    navbarContainer.Dock(DOCK.TOP)
    navbarContainer.DockMargin(0, 0, 0, px(5))
    navbarContainer.SetTall(px(30))

    const navbar = themedUi().panel({ parent: navbarContainer, color: themedUi().theme.colors.card })
    navbar.Dock(DOCK.FILL)
    navbar.DockPadding(px(5), px(5), px(5), px(5))

    const navBtn = (categoryId: number | undefined, name: string) => {
      const btn = themedUi().btn({ parent: navbar, variant: 'secondary', size: 'sm' })
      btn.Dock(DOCK.LEFT)
      btn.DockMargin(0, 0, px(5), 0)
      btn.SetText(name)
      btn.SetEnabled(selectedCategoryId !== categoryId)
      btn.DoClick = () => tabShop(container, categoryId)
      btn.SizeToContentsX(px(15))
      btn.SizeToContentsY()
    }

    navBtn(undefined, 'Все товары')

    for (const c of allCategories) {
      navBtn(c.id, c.name)
    }
  }

  const scrollContainer = themedUi().scrollPanel({ parent: container })
  scrollContainer.Dock(DOCK.FILL)

  container.InvalidateLayout(true)

  const itemCols: DPanel[] = []

  for (const group of filteredCategories) {
    if (group.goods.length === 0) {
      continue
    }

    {
      const headerContainer = themedUi().panel({
        parent: scrollContainer,
        color: themedUi().theme.colors.secondary,
      })
      headerContainer.Dock(DOCK.TOP)
      headerContainer.DockMargin(0, 0, px(5), px(5))
      headerContainer.DockPadding(px(8), px(2), px(5), px(2))

      const label = themedUi().label({
        parent: headerContainer,
        text: group.name,
        size: 'md',
        color: themedUi().theme.colors.secondaryForeground,
      })
      label.Dock(DOCK.TOP)

      headerContainer.InvalidateLayout(true)
      headerContainer.SizeToChildren(false, true)
    }

    const goodsContainer = themedUi().panel({
      parent: scrollContainer,
      color: Color(0, 0, 0, 0),
    })
    goodsContainer.Dock(DOCK.TOP)
    goodsContainer.DockMargin(0, 0, px(5), px(10))

    const leftGoods = themedUi().panel({
      parent: goodsContainer,
      color: Color(0, 0, 0, 0),
    })
    leftGoods.Dock(DOCK.LEFT)
    leftGoods.SetWide(scrollContainer.GetWide() / 2 - px(5))

    const rightGoods = themedUi().panel({
      parent: goodsContainer,
      color: Color(0, 0, 0, 0),
    })
    rightGoods.Dock(DOCK.RIGHT)
    rightGoods.SetWide(scrollContainer.GetWide() / 2 - px(5))

    itemCols.push(leftGoods)
    itemCols.push(rightGoods)

    const itemCardColor = customizedColor(donatos.uiConfig?.components?.shopItem, 'secondary')

    for (const [i1, i2] of cluster(group.goods)) {
      const m1 = descriptionMarkup(i1?.description || '', leftGoods.GetWide(), cAlpha(itemCardColor.foreground, 150))
      const m2 = descriptionMarkup(i2?.description || '', rightGoods.GetWide(), cAlpha(itemCardColor.foreground, 150))

      const maxDescriptionHeight = math.max(m1.GetHeight(), m2?.GetHeight() || 0)

      if (i1) {
        itemCard(i1, leftGoods, m1, maxDescriptionHeight)
      }
      if (i2) {
        itemCard(i2, rightGoods, m2, maxDescriptionHeight)
      }
    }

    leftGoods.InvalidateLayout(true)
    rightGoods.InvalidateLayout(true)

    leftGoods.SizeToChildren(false, true)
    rightGoods.SizeToChildren(false, true)

    goodsContainer.SizeToChildren(false, true)
  }

  scrollContainer.GetCanvas().InvalidateLayout(true)
  scrollContainer.InvalidateLayout(true)

  const scrollBar = scrollContainer.GetVBar() as DPanel & { Enabled: boolean }
  const scrollBarEnabled = scrollBar.Enabled

  // TODO: fix margin when scroll bar is disabled
  for (const col of itemCols) {
    const width = scrollBarEnabled
      ? (scrollContainer.GetWide() - scrollBar.GetWide()) / 2
      : scrollContainer.GetWide() / 2
    col.SetWide(width - px(5))
  }
}

function buyItem(id: number, variant: { id: string; price: number; duration?: number }) {
  if (LocalPlayer().Donatos().Balance >= variant.price) {
    netMessageToServer('purchaseGoods', { goodsId: id, variantId: variant.id })
  } else {
    const payUrl = remoteConfig.value?.payUrl
    if (payUrl) gui.OpenURL(`${string.Replace(payUrl, '{id}', LocalPlayer().SteamID64())}&openCart=${id}-${variant.id}`)
  }
}

export function itemCard(
  item: { id: number; name: string; variants?: { id: string; price: number; duration?: number }[] },
  panel: DPanel,
  descriptionMarkup: MarkupObject,
  descriptionHeight: number,
) {
  const componentColor = customizedColor(donatos.uiConfig?.components?.shopItem, 'secondary')

  const itemContainer = themedUi().panel({
    parent: panel,
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
        options:
          item.variants && item.variants.length > 1
            ? [
                {
                  text: 'Купить',
                  options:
                    item.variants?.map((v) => ({
                      text: `На ${v.duration}`,
                      onClick: () => buyItem(item.id, v),
                    })) || [],
                },
              ]
            : [
                {
                  text: 'Купить',
                  onClick: async () => {
                    const v = item.variants?.[0]
                    if (v) {
                      buyItem(item.id, v)
                    }
                  },
                },
              ],
      })
      .Open(/*gui.MouseX() + px(15), gui.MouseY() - px(5)*/)
  }
  itemContainer.DoRightClick = itemContainer.DoClick

  panel.InvalidateLayout(true)

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
      text: item.name || '',
      size: 'sm',
      color: componentColor.foreground,
    })
    name.Dock(DOCK.LEFT)
    name.SizeToContentsX()
    name.InvalidateLayout(true)

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
  }

  const description = vgui.Create('DLabel', itemContainer) as DLabel & PaintExt<DLabel>
  description.SetText('')
  description.Dock(DOCK.TOP)
  description.SetTall(descriptionHeight)
  description.Paint = () => descriptionMarkup.Draw(0, 0)

  const firstVariant = item.variants?.[0]

  if (item.variants && firstVariant) {
    const durationText =
      firstVariant.duration !== undefined
        ? firstVariant.duration === 0
          ? ' / навсегда'
          : ` / ${firstVariant.duration} дн.`
        : ''

    const price = themedUi().label({
      parent: itemContainer,
      text: `${item.variants.length > 1 ? 'от ' : ''}${firstVariant.price} р.${durationText}`,
      size: 'sm',
      color: componentColor.foreground,
    })
    price.Dock(DOCK.TOP)
    price.DockMargin(0, px(4), 0, 0)
  }

  itemContainer.InvalidateLayout(true)
  itemContainer.SizeToChildren(false, true)
}
