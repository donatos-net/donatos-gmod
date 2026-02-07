const BLUE_1 = Color(231, 245, 255)
const BLUE_3 = Color(165, 216, 255)
const BLUE_6 = Color(51, 154, 240)
const ORANGE_6 = Color(255, 146, 43)
const RED_6 = Color(255, 107, 107)

export function donatosAddText(...args: unknown[]) {
	chat.AddText(BLUE_6, '[Donatos] ', BLUE_1, ...args)
}

export namespace log {
	export function debug(str: string) {
		MsgC(BLUE_3, '[Donatos] [DEBUG] ', str, '\n')
	}
	export function info(str: string) {
		MsgC(BLUE_6, '[Donatos] [INFO] ', str, '\n')
	}
	export function warn(str: string) {
		MsgC(ORANGE_6, '[Donatos] [WARN] ', str, '\n')
	}
	export function error(str: string) {
		MsgC(RED_6, '[Donatos] [ERROR] ', str, '\n')
	}
}
