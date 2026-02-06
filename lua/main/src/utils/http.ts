import { type Result, result } from '@/utils/lang'

interface HttpRequest {
	url: string
	method?: string
	parameters?: Record<string, string>
	headers?: Record<string, string>
	body?: unknown
	type?: string
	timeout?: number
}

interface HttpResponse {
	code: number
	body: string
	headers: Record<string, string>
}

// TODO: timeouts
export function httpRequest(
	parameters: HttpRequest,
): Promise<Result<HttpResponse, string>> {
	return new Promise((resolve) => {
		// @ts-expect-error
		HTTP({
			...parameters,
			method: parameters.method ?? 'GET',
			success: (code: number, body: string, headers: Record<string, string>) =>
				resolve(result.ok({ code, body, headers })),
			failed: (reason: string) => resolve(result.err(reason)),
		})
	})
}
