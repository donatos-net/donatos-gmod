import type { serverApiSchema } from 'api-schema/src'
import type { DonatosItem } from '@/donatos/item'

if (!_donatos) {
	_donatos = { _state: {} }
}
if (!_donatos._state) {
	_donatos._state = {}
}

export function stateSlot<T>(key: string, defaultValue: T): T {
	const state = _donatos._state
	if (state[key] === undefined) {
		state[key] = defaultValue
	}
	return state[key] as T
}

export const donatosState = {
	items: stateSlot<Record<string, DonatosItem>>('items', {}),
	knownSamRanks: stateSlot<Record<string, true>>('knownSamRanks', {}),
	clientNonce: stateSlot<{
		value: number
		handlers: ((data: unknown) => void)[]
	}>('clientNonce', {
		value: 1,
		handlers: [],
	}),
	remoteConfig: stateSlot<{
		value: undefined | serverApiSchema['server:get-config']['output']
	}>('remoteConfig', { value: undefined }),
	webPanel: stateSlot<{ panel?: DHTML }>('webPanel', { panel: undefined }),
} as const

export function donatosHookId(name: string) {
	return `donatos_${name}`
}

_donatos._timersUuid = CurTime().toString()

export function delay(seconds: number): Promise<void> {
	const uuid = _donatos._timersUuid
	return new Promise((resolve) =>
		timer.Simple(seconds, () => {
			if (uuid === _donatos._timersUuid) {
				resolve()
			}
		}),
	)
}
