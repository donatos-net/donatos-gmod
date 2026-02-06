import colors from '@/utils/colors'

export function donatosAddText(...args: unknown[]) {
	chat.AddText(colors.BLUE_6, '[Donatos] ', colors.BLUE_1, ...args)
}
