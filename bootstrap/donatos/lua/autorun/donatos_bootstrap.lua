AddCSLuaFile()

donatosBootstrap = {
	version = 1,
	addonVersionConVar = CreateConVar("donatos_version", "", {FCVAR_REPLICATED, FCVAR_SERVER_CAN_EXECUTE}),
	bundleSha256ConVar = CreateConVar("donatos_bundle_sha256", "", {FCVAR_REPLICATED, FCVAR_SERVER_CAN_EXECUTE}),
	addonApiUrl = "https://donatos.net/api/game-server/gmod/addon",

	_runUuid = tostring(CurTime()),
}

local LOCAL_RELEASE_JSON_PATH = "donatos/release.json"
local LOCAL_BUNDLE_PATH = "donatos/bundle.txt"

local function log(patt, ...)
	print(string.format("[DonatosBootstrap] " .. patt, ...))
end

local function asyncDelay(delay)
	local runUuid = donatosBootstrap._runUuid
	local running = coroutine.running()
	timer.Simple(delay, function ()
		if runUuid == donatosBootstrap._runUuid then
			coroutine.resume(running)
		end
	end)
	return coroutine.yield()
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

	log("HTTP %s %s", opts.method || "GET", opts.url)

	HTTP({
		failed = onFailure,
		success = onSuccess,
		method = opts.method || "GET",
		url = opts.url
	})

	return coroutine.yield()
end

local function asyncFetchReleases()
	local success, data = asyncHttp({ url = donatosBootstrap.addonApiUrl })
	if success then
		return true, util.JSONToTable(data)
	end
	return false, data
end

local function asyncReadFile(name, gamePath)
	local running = coroutine.running()
	file.AsyncRead(name, gamePath, function(_, _, status, data)
		if status == FSASYNC_OK then
			coroutine.resume(running, true, data)
		elseif status == FSASYNC_STATUS_PENDING || status == FSASYNC_STATUS_INPROGRESS || status == FSASYNC_STATUS_UNSERVICED then
			return
		else
			coroutine.resume(running, false, status)
		end
	end)
	return coroutine.yield()
end

local function asyncReadLocalRelease()
	local success, data = asyncReadFile(LOCAL_RELEASE_JSON_PATH, "DATA")
	if success && data then
		return util.JSONToTable(data)
	end
end

local function asyncInstallRelease(release, expectedBundleSha256)
	if !release || !release.assets then
		return false
	end

	local bundleAsset
	for _, asset in ipairs(release.assets) do
		if asset.name == "bundle.lua" then
			bundleAsset = asset
			break
		end
	end

	if !bundleAsset then
		return false, "Не найден файл bundle.lua в релизе " .. release.name
	end

	local remoteBundleSuccess, remoteBundle = asyncHttp({ url = bundleAsset.url })
	if !remoteBundleSuccess then
		return false, "Не удалось скачать bundle.lua релиза " .. release.name .. ": " .. remoteBundle
	end

	file.CreateDir("donatos")
	file.Write(LOCAL_RELEASE_JSON_PATH, util.TableToJSON(release))
	file.Write(LOCAL_BUNDLE_PATH, remoteBundle)

	log("Версия %s скачана в %s.", release.name, LOCAL_BUNDLE_PATH)

	return true, remoteBundle
end

local function runBundle(bundle)
	local err = RunString(bundle, "donatos/bundle.lua", false)
	if err then
		log("RunString вернул ошибку: " .. err)
		return false
	end
	return true
end

local function asyncBootstrap()
	local localRelease = asyncReadLocalRelease()

	local localBundleSuccess, localBundle = asyncReadFile(LOCAL_BUNDLE_PATH, "DATA")

	-- check existing bundle, server-side
	if SERVER && localRelease && localRelease.name && localBundleSuccess && localBundle then
		donatosBootstrap.addonVersionConVar:SetString(localRelease.name)
		donatosBootstrap.bundleSha256ConVar:SetString(util.SHA256(localBundle))
		return runBundle(localBundle)
	end

	-- check existing bundle, client-side
	if CLIENT && localBundleSuccess && localBundle then
		local expectedSha256 = donatosBootstrap.bundleSha256ConVar:GetString()
		if expectedSha256 == "" then
			log("Сервер не передал %s", donatosBootstrap.bundleSha256ConVar:GetName())
			return false
		end

		if expectedSha256 == util.SHA256(localBundle) then
			return runBundle(localBundle)
		else
			file.Delete(LOCAL_BUNDLE_PATH)
		end
	end

	local remoteReleasesSuccess, remoteReleases = asyncFetchReleases()
	if !remoteReleasesSuccess then
		log("Не удалось получить список релизов аддона.")
		return false
	end

	if SERVER then
		local latestRelease = remoteReleases.releases[1]
		if !latestRelease then
			log("Нет доступных релизов")
			return false
		end
		local success, bundle = asyncInstallRelease(latestRelease)
		if !success then
			log(bundle) -- err
			return false
		end
		donatosBootstrap.addonVersionConVar:SetString(latestRelease.name)
		donatosBootstrap.bundleSha256ConVar:SetString(util.SHA256(bundle))
		return runBundle(bundle)
	else
		local version = donatosBootstrap.addonVersionConVar:GetString()
		if version == "" then
			log("Сервер не передал %s", donatosBootstrap.addonVersionConVar:GetName())
			return false
		end

		local release
		for _, r in ipairs(remoteReleases.releases) do
			if r.name == version then
				release = r
				break
			end
		end

		if !release then
			log("Релиз %s недоступен.", version)
			return false
		end

		local success, bundle = asyncInstallRelease(release)
		if !success then
			log(bundle) -- err
			return false
		end
		return runBundle(bundle)
	end
end


coroutine.wrap(function ()
	-- HTTP is not available yet
	-- https://github.com/Facepunch/garrysmod-issues/issues/1010
	asyncDelay(0)

	while true do
		local success, a1 = pcall(asyncBootstrap)
		if success then
			if a1 then
				break
			end
		else
			log("Ошибка в asyncBootstrap: " .. a1)
		end

		asyncDelay(15)
	end
end)()
