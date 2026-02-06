function codes(str: string) {
	return utf8.codes(str) as unknown as LuaIterable<
		LuaMultiReturn<[number, number]>
	>
}

const lowercaseCodes = [...codes('абвгдеёжзийклмнопрстуфхцчшщъыьэюя')].map(
	(c) => c[1],
)
const uppercaseCodes = [...codes('АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ')].map(
	(c) => c[1],
)

const upperToLower = Object.fromEntries(
	uppercaseCodes.map((v, idx) => [v, lowercaseCodes[idx]]),
)

export function utf8Lower(str: string): string {
	const chars: string[] = [...codes(str)].map(([idx, code]) => {
		const replacement = upperToLower[code]
		if (replacement) {
			return utf8.char(replacement)
		}
		return string.lower(utf8.char(code))
	})
	return table.concat(chars)
}
