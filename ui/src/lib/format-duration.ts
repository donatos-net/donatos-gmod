export function formatDuration(duration?: number): string {
	if (duration === undefined) return '' // одноразовый
	if (duration === 0) return 'навсегда'
	if (duration === 1) return '1 день'
	return `${duration} дн.`
}

export function formatDurationInParens(duration?: number): string {
	const formatted = formatDuration(duration)
	return formatted ? ` (${formatted})` : ''
}
