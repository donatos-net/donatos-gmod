AddCSLuaFile()

if !donatosBootstrap then
	donatosBootstrap = {
		version = 1,
		localRelease = nil,
		releaseConVar = CreateConVar("donatos_release_id", "", {FCVAR_REPLICATED, FCVAR_SERVER_CAN_EXECUTE}),
		addonApiUrl = "https://donatos.net/api/game-server/gmod/addon"
	}
end

local LOCAL_RELEASE_JSON_PATH = "donatos/release.json"
local LOCAL_BUNDLE_PATH = "donatos/bundle.txt"

local function log(patt, ...)
	print(string.format("[DonatosBootstrap] " .. patt, ...))
end

local function asyncHttp(opts)
	local running = coroutine.running()

	local function onSuccess(code, body, headers)
		if code == 200 then
			coroutine.resume(running, true, body)
		else
			log("HTTP Error %s: %s", code, body)
			log("Request was: %s", util.TableToJSON(opts))

			coroutine.resume(running, false, body)
		end
	end

	local function onFailure(reason)
		log("HTTP Error: %s", reason)
		coroutine.resume(running, false, reason)
	end

	log("HTTP %s %s", opts.method or "GET", opts.url)

	HTTP({
		failed = onFailure,
		success = onSuccess,
		method = opts.method or "GET",
		url = opts.url
	})

	return coroutine.yield()
end

local function asyncRemoteReleases()
	local success, data = asyncHttp({ url = donatosBootstrap.addonApiUrl })
	if success then
		return true, util.JSONToTable(data)
	end
	return false, data
end

local function getLocalRelease()
	local data = file.Read(LOCAL_RELEASE_JSON_PATH, "DATA")
	if data then
		return util.JSONToTable(data)
	end
end

local function asyncLoadBundle(id)
	if !donatosBootstrap.localRelease then
		donatosBootstrap.localRelease = getLocalRelease()
	end

	local offlineBundle = file.Read(LOCAL_BUNDLE_PATH, "DATA")

	if donatosBootstrap.localRelease && offlineBundle && id && tostring(donatosBootstrap.localRelease.id) == tostring(id) then
		log("Загружаю локальный билд...")
		return true, offlineBundle
	end

	log("Загружаю список доступных релизов...")
	local remoteReleasesSuccess, remoteReleases = asyncRemoteReleases()

	if !remoteReleasesSuccess then
		if offlineBundle then
			log("Не удалось получить список релизов аддона, загружаю локальный.")
			return true, offlineBundle
		end
		log("Не удалось получить список релизов аддона.")
		return false
	end

	local latestRemoteRelease = remoteReleases.releases && remoteReleases.releases[1]

	if !latestRemoteRelease then
		if offlineBundle then
			log("Не удалось получить список релизов аддона, загружаю локальный.")
			return true, offlineBundle
		end
		log("Нет доступных релизов.")
		return false
	end

	local remoteBundleAsset
	for _, asset in ipairs(latestRemoteRelease.assets) do
		if asset.name == "bundle.lua" then
			remoteBundleAsset = asset
			break
		end
	end

	if !remoteBundleAsset then
		if offlineBundle then
			return true, offlineBundle
		end
		log("Не найден файл bundle.lua в последнем релизе.")
		return false
	end

	local remoteBundleSuccess, remoteBundle = asyncHttp({ url = remoteBundleAsset.url })
	if !remoteBundleSuccess then
		log("Не удалось загрузить актуальный bundle.lua аддона.")
		return false
	end

	file.CreateDir("donatos")
	file.Write(LOCAL_RELEASE_JSON_PATH, util.TableToJSON(latestRemoteRelease))
	file.Write(LOCAL_BUNDLE_PATH, remoteBundle)

	donatosBootstrap.localRelease = latestRemoteRelease
	donatosBootstrap.releaseConVar:SetString(latestRemoteRelease.id)

	log("Последняя версия загружена на диск.")

	return true, remoteBundle
end

function donatosBootstrap.bootstrap()
	if SERVER then
		donatosBootstrap.localRelease = getLocalRelease()

		if donatosBootstrap.localRelease then
			donatosBootstrap.releaseConVar:SetString(donatosBootstrap.localRelease.id)
		end

		coroutine.wrap(function ()
			local success, bundle = asyncLoadBundle(donatosBootstrap.localRelease && donatosBootstrap.localRelease.id)
			if success then
				RunString(bundle, "donatos/bundle.lua")
				log("Готово.")
			end
		end)()
	else
		donatosBootstrap.localRelease = getLocalRelease()
		local preferredReleaseId = donatosBootstrap.releaseConVar:GetString()

		if preferredReleaseId == "" && donatosBootstrap.localRelease or preferredReleaseId != "" then
			coroutine.wrap(function ()
				local success, bundle = asyncLoadBundle(preferredReleaseId)
				if success then
					RunString(bundle, "donatos/bundle.lua")
					log("Готово.")
				end
			end)()
		else
			log("Сервер не передал версию релиза в %s", donatosBootstrap.releaseConVar:GetName())
		end
	end
end

donatosBootstrap.bootstrap()
