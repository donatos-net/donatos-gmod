import type { serverApiSchema } from 'api-schema/src'
import { httpRequest } from '@/utils/http'
import { type Result, result } from '@/utils/lang'
import { log } from '@/utils/log'

export async function serverApiRequest<T extends keyof serverApiSchema>(
	action: T,
	data: serverApiSchema[T]['input'],
): Promise<Result<serverApiSchema[T]['output'], string>> {
	if (!donatos.config?.apiToken) {
		return result.err('Секретный ключ не задан')
	}

	const {
		isError,
		data: response,
		error,
	} = await httpRequest({
		url:
			donatos.config.apiEndpoint || 'https://donatos.net/api/game-server/gmod',
		method: 'POST',
		headers: {
			Authorization: `Bearer ${donatos.config.apiToken}`,
		},
		body: util.TableToJSON({ action, input: data }),
	})

	if (isError) {
		log.warn(`Server API request failed with error ${error}`)
		return result.err(error)
	}

	if (response.code !== 200 && response.code !== 400) {
		log.warn(
			`Server API request "${action}" failed with code ${response.code}: ${response.body} `,
		)
		return result.err(`HTTP error ${response.code}`)
	}

	const body:
		| { success: false; error: string }
		| { success: true; data: serverApiSchema[T]['output'] } = util.JSONToTable(
		response.body,
	)

	return body.success ? result.ok(body.data) : result.err(body.error)
}
