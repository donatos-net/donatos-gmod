export function formatDuration(duration?: number): string {
	if (duration === undefined) return '';
	if (duration === 0) return 'навсегда';
	if (duration === 1) return '1 день';
	return `${duration} дн.`;
}

export function formatDurationShort(duration?: number): string {
	if (duration === undefined) return '';
	if (duration === 0) return '∞';
	return `${duration} дн.`;
}

export function formatDurationInParens(duration?: number): string {
	const formatted = formatDuration(duration);
	return formatted ? ` (${formatted})` : '';
}
