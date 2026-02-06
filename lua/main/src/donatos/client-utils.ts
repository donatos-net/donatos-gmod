import colors from '@/utils/colors'
import { ui } from '@/utils/ui'

/*export function formatVariantDuration(duration: number | undefined): string {
  return duration === undefined ? 'одноразовый' : duration === 0 ? 'навсегда' : `${duration} дн.`
}*/

export function descriptionMarkup(text: string, width: number, color: Color) {
	return markup.Parse(
		`<color=${markup.Color(color)}><font=${ui.fonts.roboto.xs}>${markup.Escape(text) || ''}</font></color>`,
		width,
	)
}

export function donatosAddText(...args: unknown[]) {
	chat.AddText(colors.BLUE_6, '[Donatos] ', colors.BLUE_1, ...args)
}
