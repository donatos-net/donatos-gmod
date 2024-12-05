import { persistedVar } from '@/utils/addon'
import { ThemedUi, type ThemedUiConfig } from '@/utils/themed-ui'
import { cAlpha, ui } from '@/utils/ui'
import px = ui.px

donatos.UpdateTheme = () => {
  updateThemedUi()
}

// https://ui.shadcn.com/colors#colors
const zincDark: ThemedUiConfig['colors'] = {
  background: Color(24, 24, 27), // zinc-900
  foreground: Color(250, 250, 250),
  card: Color(39, 39, 42), // zinc-800
  cardForeground: Color(244, 244, 245),
  primary: Color(228, 228, 231), // zinc-200
  primaryForeground: Color(39, 39, 42),
  secondary: Color(63, 63, 70), // zinc-700
  secondaryForeground: Color(212, 212, 216),
  muted: Color(82, 82, 91), // zinc-600
  mutedForeground: Color(161, 161, 170), // zinc-400
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
