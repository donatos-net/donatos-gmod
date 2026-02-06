import {
	type ButtonExt,
	type PaintExt,
	type PerformLayoutExt,
	cAlpha,
	ui,
} from '@/utils/ui'

export type ThemedUiConfig = {
	colors: {
		background: Color
		foreground: Color
		primary: Color
		primaryForeground: Color
		card: Color
		cardForeground: Color
		secondary: Color
		secondaryForeground: Color
		muted: Color
		mutedForeground: Color
	}
	radius: number
}

export interface ButtonParams {
	variant?: 'default' | 'secondary'
	size?: keyof typeof ui.fontSizes
	radius?: BorderRadiusVariant
	round?: {
		topLeft?: boolean
		topRight?: boolean
		bottomLeft?: boolean
		bottomRight?: boolean
	}
}

type ButtonVariant = 'default' | 'secondary' | 'muted'
type BorderRadiusVariant = 'lg' | 'md' | 'sm' | 'xs'

type DermaMenuOption =
	| { text: string; onClick: () => void; options?: undefined }
	| { text: string; onClick?: undefined; options: DermaMenuOption[] }

export class ThemedUi {
	readonly btnVariants: Record<ButtonVariant, { bg: Color; text: Color }>
	readonly borderRadius: Record<BorderRadiusVariant, number>

	constructor(readonly theme: ThemedUiConfig) {
		this.btnVariants = {
			default: {
				bg: this.theme.colors.primary,
				text: this.theme.colors.primaryForeground,
			},
			secondary: {
				bg: this.theme.colors.secondary,
				text: this.theme.colors.secondaryForeground,
			},
			muted: {
				bg: this.theme.colors.muted,
				text: this.theme.colors.mutedForeground,
			},
		}
		this.borderRadius = {
			lg: theme.radius,
			md: math.max(theme.radius - ui.px(2), 0),
			sm: math.max(theme.radius - ui.px(4), 0),
			xs: math.max(theme.radius - ui.px(6), 0),
		}
	}

	btn({
		parent,
		name,
		variant,
		size,
		radius,
		round,
	}: {
		parent?: Panel
		name?: string
	} & ButtonParams = {}) {
		const btn = vgui.Create('DButton', parent, name) as DButton & ButtonExt
		return this.stylizeBtn(btn, { variant, size, round, radius })
	}

	stylizeBtn(
		button: DButton & PaintExt<DButton>,
		{
			variant,
			size,
			round,
			radius,
		}: {
			variant?: ButtonVariant
			size?: keyof typeof ui.fontSizes
			radius?: BorderRadiusVariant
			round?: {
				topLeft?: boolean
				topRight?: boolean
				bottomLeft?: boolean
				bottomRight?: boolean
			}
		},
	) {
		button.SetFont(ui.fonts.roboto[size || 'md'])
		button.SetHeight(ui.fontSizes[size || 'md'])

		const btnSkin = this.btnVariants[variant || 'default']
		const r = this.borderRadius[radius || 'sm']

		const bg = btnSkin.bg
		const bgDisabled = cAlpha(bg, 170)
		const bgHover = cAlpha(bg, 230)

		const ro = {
			topLeft: round?.topLeft ?? true,
			topRight: round?.topRight ?? true,
			bottomLeft: round?.bottomLeft ?? true,
			bottomRight: round?.bottomRight ?? true,
		}

		button.Paint = function (this: DButton, w: number, h: number) {
			let drawColor: Color
			if (!this.IsEnabled()) {
				drawColor = bgDisabled
			} else if (this.IsHovered()) {
				drawColor = bgHover
			} else {
				drawColor = bg
			}
			draw.RoundedBoxEx(
				r,
				0,
				0,
				w,
				h,
				drawColor,
				ro.topLeft,
				ro.topRight,
				ro.bottomLeft,
				ro.bottomRight,
			)
		}
		button.UpdateColours = function (this: DButton) {
			if (!this.IsEnabled()) {
				return this.SetTextStyleColor(cAlpha(btnSkin.text, 170))
			}
			/*if (this.IsDown() || this.m_bSelected) {
        return this.SetTextStyleColor(btnSkin.text)
      }
      if (this.Hovered) {
        return this.SetTextStyleColor(btnSkin.text)
      }*/

			return this.SetTextStyleColor(btnSkin.text)
		}
		return button
	}

	frame({
		color,
		extraPaint,
		radius,
		closeOnEsc,
	}: {
		color?: Color
		extraPaint?: (this: Frame, w: number, h: number) => void
		radius?: BorderRadiusVariant
		closeOnEsc?: boolean
	} = {}) {
		const frame = vgui.Create('DFrame') as DFrame & PaintExt<Frame>
		const bg = color || this.theme.colors.background
		const r = this.borderRadius[radius || 'sm']

		frame.Paint = function (this: Frame, w: number, h: number) {
			if (closeOnEsc && gui.IsGameUIVisible()) {
				gui.HideGameUI()
				this.Remove()
				return
			}

			draw.RoundedBox(r, 0, 0, w, h, bg)
			extraPaint?.bind(this)(w, h)
		}

		return frame
	}

	panel({
		parent,
		classname,
		color,
		radius,
	}: {
		parent?: Panel
		classname?: string
		color?: Color
		radius?: BorderRadiusVariant
	} = {}) {
		const panel = vgui.Create(classname || 'DPanel', parent) as DPanel &
			PaintExt<DPanel>
		const bg = color || this.theme.colors.card
		const r = this.borderRadius[radius || 'sm']
		panel.Paint = function (this, w, h) {
			draw.RoundedBox(r, 0, 0, w, h, bg)
		}
		return panel
	}

	scrollPanel({
		parent,
		color,
		radius,
	}: {
		parent?: Panel
		color?: Color
		radius?: BorderRadiusVariant
	} = {}) {
		const panel = vgui.Create('DScrollPanel', parent) as DScrollPanel

		const r = this.borderRadius[radius || 'sm']
		const barColor = cAlpha(this.theme.colors.secondary, 50)
		const gripColor = this.theme.colors.secondary

		const vBar = panel.GetVBar() as DVScrollBar &
			PaintExt<DVScrollBar> & { btnGrip: PaintExt<Panel> }
		vBar.SetHideButtons(true)
		vBar.SetWide(ui.px(5))
		vBar.Paint = function (this, w, h) {
			draw.RoundedBox(r, 0, 0, w, h, barColor)
		}
		vBar.btnGrip.Paint = function (this, w, h) {
			draw.RoundedBox(r, 0, 0, w, h, gripColor)
		}

		return panel
	}

	label({
		parent,
		text,
		size,
		color,
		font,
	}: {
		parent?: Panel
		text: string
		size?: keyof typeof ui.fontSizes
		color?: Color
		font?: keyof typeof ui.fonts
	}) {
		const panel = vgui.Create('DLabel', parent) as DLabel
		panel.SetFont(ui.fonts[font || 'roboto'][size || 'sm'])
		panel.SetColor(color)
		panel.SetText(text)
		panel.SetTall(ui.fontSizes[size || 'sm'])
		return panel
	}

	dermaMenu({
		variant,
		size,
		options,
	}: {
		variant?: ButtonVariant
		size?: keyof typeof ui.fontSizes
		options: DermaMenuOption[]
	}) {
		const menu = this.stylizeDermaMenu(
			DermaMenu() as DMenu & DScrollPanel & PaintExt<DMenu & DScrollPanel>,
			{
				variant,
			},
		)

		const addOptions = (menu: DMenu, list: typeof options) => {
			for (let i = 0; i < list.length; i++) {
				const optionDef = list[i]
				if (!optionDef) {
					continue
				}

				let opt: DMenuOption & PerformLayoutExt<DMenuOption>
				if (optionDef.options) {
					const [sub, option] = menu.AddSubMenu(optionDef.text)
					this.stylizeDermaMenu(sub as DMenu, { variant })
					addOptions(sub as DMenu, optionDef.options)
					opt = option as DMenuOption & PerformLayoutExt<DMenuOption>
				} else {
					opt = menu.AddOption(
						optionDef.text,
						optionDef.onClick,
					) as DMenuOption & PerformLayoutExt<DMenuOption>
				}

				const perf = opt.PerformLayout
				opt.PerformLayout = function (this, w, h) {
					perf.bind(this)(w, h)
					this.SizeToContentsY(ui.px(5))
				}

				this.stylizeBtn(opt, {
					variant,
					size,
					round: {
						topLeft: i === 0,
						topRight: i === 0,
						bottomLeft: i === list.length - 1,
						bottomRight: i === list.length - 1,
					},
				})
			}
		}

		addOptions(menu, options)

		return menu
	}

	stylizeDermaMenu(
		menu: DMenu & DScrollPanel & PaintExt<DMenu & DScrollPanel>,
		{
			variant,
			radius,
		}: { variant?: ButtonVariant; radius?: BorderRadiusVariant },
	) {
		const bg = this.btnVariants[variant || 'default'].text
		const menuRadius = this.borderRadius[radius || 'sm']
		menu.Paint = (w, h) => {
			draw.RoundedBox(menuRadius, 0, 0, w, h, bg)
		}
		return menu
	}
}
