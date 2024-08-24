import { httpRequest } from '@/utils/http'
import { type Result, result } from '@/utils/lang'
import { log } from '@/utils/log'

export interface AddonApiResponse {
  releases: AddonRelease[]
}

interface AddonRelease {
  id: number
  name: string
  createdAt: string
  publishedAt: string | undefined
  assets: { name: string; size: number; url: string }[]
}

export const localReleaseJson = 'donatos/release.json'
export const localBundlePath = 'donatos/release.json'

export async function fetchAddonReleases(): Promise<Result<AddonApiResponse>> {
  const res = await httpRequest({
    method: 'GET',
    url: donatosBootstrap?.addonApiUrl ?? 'https://donatos.net/api/game-server/gmod/addon',
  })
  if (res.isError) {
    return result.err(res.error)
  }
  return result.ok(util.JSONToTable(res.data.body))
}

export function getLocalAddonRelease(): AddonApiResponse['releases'][0] {
  const text = file.Read(localReleaseJson, 'DATA') as string | undefined
  return text ? util.JSONToTable(text) : undefined
}

export async function downloadRelease(release: AddonRelease): Promise<Result<string, string>> {
  const asset = release.assets.find((a) => a.name === 'bundle.lua')

  if (!asset) {
    return result.err(`Не найден файл bundle.lua в релизе ${release.name}`)
  }

  log.info(`Скачиваю релиз аддона ${release.name}`)
  const dlResponse = await httpRequest({ url: asset.url })

  if (dlResponse.isError) {
    return result.err(dlResponse.error)
  }

  file.Write(localReleaseJson, util.TableToJSON(release))
  file.Write(localBundlePath, dlResponse.data.body)

  return result.ok(dlResponse.data.body)
}
