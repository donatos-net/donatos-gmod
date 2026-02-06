export type Result<DATA, ERR = unknown> =
	| { isError: false; data: DATA; error: undefined }
	| { isError: true; data: undefined; error: ERR }

export namespace result {
	export function ok<DATA, ERR = unknown>(data: DATA): Result<DATA, ERR> {
		return { isError: false, data: data, error: undefined }
	}
	export function err<DATA, ERR = unknown>(err: ERR): Result<DATA, ERR> {
		return { isError: true, data: undefined, error: err }
	}
}
