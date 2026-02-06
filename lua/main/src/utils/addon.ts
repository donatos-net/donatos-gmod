if (!_donatos) {
	_donatos = { _persistedVars: {} }
}
if (!_donatos._persistedVars) {
	_donatos._persistedVars = {}
}

export function persistedVar<T>(key: string, initialValue: T): T {
	if (!_donatos._persistedVars[key]) {
		_donatos._persistedVars[key] = initialValue
	}
	return _donatos._persistedVars[key] as T
}

export function setPersistedVar(key: string, value: unknown) {
	_donatos._persistedVars[key] = value
}

export function donatosHookId(name: string) {
	return `donatos_${name}`
}

_donatos._timersUuid = CurTime().toString()
const uuid = _donatos._timersUuid

export function shouldStopTimer() {
	return uuid !== _donatos._timersUuid
}

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
