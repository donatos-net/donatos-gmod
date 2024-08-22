import { persistedVar } from '@/utils/addon'
import { ThemedUi, type ThemedUiConfig } from '@/utils/themed-ui'
import { cAlpha, ui } from '@/utils/ui'
import px = ui.px

donatos.UpdateTheme = () => {
  updateThemedUi()
}

const zincDark: ThemedUiConfig['colors'] = {
  background: Color(9, 9, 11),
  foreground: Color(250, 250, 250),
  card: Color(9, 9, 11),
  cardForeground: Color(250, 250, 250),
  primary: Color(37, 99, 235),
  primaryForeground: Color(248, 250, 252),
  secondary: Color(241, 245, 249),
  secondaryForeground: Color(15, 23, 42),
  muted: Color(39, 39, 42),
  mutedForeground: Color(161, 161, 170),
}

let _themedUi = createThemedUi()

export function themedUi() {
  return _themedUi
}

function createThemedUi() {
  return new ThemedUi({
    colors: { ...zincDark, ...donatos.uiConfig?.theme?.colors },
    radius: px(donatos.uiConfig?.theme?.radius ?? 8),
  })
}

export function updateThemedUi() {
  _themedUi = createThemedUi()
}

export function customizedColor(
  config: ColorConfig | undefined,
  defaultType: 'background' | 'card' | 'primary' | 'secondary' | 'muted',
) {
  const colorType = config?.color ?? defaultType

  const background = cAlpha(themedUi().theme.colors[colorType], config?.alpha ?? 255)
  const foreground =
    colorType === 'background'
      ? cAlpha(themedUi().theme.colors.foreground, config?.alpha ?? 255)
      : cAlpha(themedUi().theme.colors[`${colorType}Foreground`], config?.alpha ?? 255)
  return { background, foreground }
}

export type ColorConfig = {
  color?: 'background' | 'card' | 'primary' | 'secondary' | 'muted'
  alpha?: number
}

export const uiPersistedVar = persistedVar<{ frame?: DFrame }>('ui', {})

export function destroyUi() {
  if (uiPersistedVar.frame && IsValid(uiPersistedVar.frame)) {
    uiPersistedVar.frame.Remove()
    uiPersistedVar.frame = undefined
  }
}
