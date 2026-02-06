import colors from '@/utils/colors'

export namespace log {
	export function debug(str: string) {
		MsgC(colors.BLUE_3, '[Donatos] [DEBUG] ', str, '\n')
	}
	export function info(str: string) {
		MsgC(colors.BLUE_6, '[Donatos] [INFO] ', str, '\n')
	}
	export function warn(str: string) {
		MsgC(colors.ORANGE_6, '[Donatos] [WARN] ', str, '\n')
	}
	export function error(str: string) {
		MsgC(colors.RED_6, '[Donatos] [ERROR] ', str, '\n')
	}
}
