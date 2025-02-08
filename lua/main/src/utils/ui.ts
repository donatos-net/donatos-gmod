export namespace ui {
  function registerFont(name: string, weight?: number): Record<keyof typeof ui.fontSizes, string> {
    const entries = (Object.entries(ui.fontSizes) as [keyof typeof ui.fontSizes, number][]).map(([objKey, size]) => {
      const fontName = `${name}[${size}]${weight ? weight.toString() : ''}`
      surface.CreateFont(fontName, { font: name, size: size, extended: true, antialias: true, weight })
      return [objKey, fontName]
    })

    return Object.fromEntries(entries)
  }

  const scrW = math.max(ScrW(), 1920)

  export function px(value: number) {
    return math.Round((scrW / 1920) * value)
  }

  export const fontSizes = {
    xs: px(13),
    sm: px(14),
    md: px(16),
    lg: px(18),
    xl: px(24),
    xxl: px(40),
  }
  export const fonts = {
    roboto: registerFont('Roboto'),
    robotoBold: registerFont('Roboto', 600),
  }
  /*export const radius = {
    xs: px(2),
    sm: px(4),
    md: px(8),
    lg: px(16),
    xl: px(32),
  }*/
}
export type ButtonExt = {
  m_bSelected: boolean
  Hovered: boolean
  UpdateColours: (this: DButton & ButtonExt) => void
} & PaintExt<DButton>
export type PaintExt<T> = {
  Paint?: (this: T, w: number, h: number) => void
}
export type PerformLayoutExt<T> = {
  PerformLayout: (this: T, w: number, h: number) => void
}

export function cAlpha(c: Color, a: number) {
  return Color(c.r, c.g, c.b, (c.a ?? 255) * (a / 255))
}
