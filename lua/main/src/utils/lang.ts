export function range(size: number) {
  return Array.from({ length: size }, (_, i) => i)
}

/**
 * Splits a single list into many lists of the desired size. If
 * given a list of 10 items and a size of 2, it will return 5
 * lists with 2 items each
 */
export const cluster = <T>(list: readonly T[], size = 2): T[][] => {
  const clusterCount = Math.ceil(list.length / size)

  return Array.from({ length: clusterCount }, (_, i) => {
    return list.slice(i * size, i * size + size)
  })
}

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
