import { persistedVar } from '@/utils/addon'

export const entMeta = persistedVar<Record<string, unknown>>('ent_meta', {})

export function getEntityMetatable(key: string) {
	const t = entMeta[key] || {}
	entMeta[key] = t
	return t
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type EntityMetaTable<T> = Record<
	string,
	((this: T, ...args: any[]) => void) | string | undefined
>
