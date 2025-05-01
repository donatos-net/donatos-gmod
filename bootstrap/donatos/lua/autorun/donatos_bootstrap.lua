AddCSLuaFile()

if !donatosBootstrap then
	donatosBootstrap = {}
end

donatosBootstrap.version = 2
donatosBootstrap.addonVersionConVar = CreateConVar("donatos_version", "", {FCVAR_REPLICATED, FCVAR_SERVER_CAN_EXECUTE})
donatosBootstrap.bundleSha256ConVar = CreateConVar("donatos_bundle_sha256", "", {FCVAR_REPLICATED, FCVAR_SERVER_CAN_EXECUTE})
donatosBootstrap.addonApiUrl = "https://donatos.net/api/game-server/gmod/addon"
donatosBootstrap._runID = tostring(CurTime())

local LOCAL_RELEASE_JSON_PATH = "donatos/release.json"
local LOCAL_BUNDLE_PATH = "donatos/bundle.txt"

local function log(patt, ...)
	print(string.format("[DonatosBootstrap] " .. patt, ...))
end

local function asyncDelay(delay)
	local id = donatosBootstrap._runID
	local running = coroutine.running()
	timer.Simple(delay, function ()
		if id == donatosBootstrap._runID then
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

---------------------------------------------------------------------------

if SERVER then
	util.AddNetworkString("donatos_bundle")

	local cachedBundle, cachedHash

	net.Receive("donatos_bundle", function (len, ply)
		if ply._donatosBundleRequest && CurTime() - ply._donatosBundleRequest <= 30 then
			return
		end

		ply._donatosBundleRequest = CurTime()

		local hash = donatosBootstrap.bundleSha256ConVar:GetString()
		if hash == "" then
			-- аддон не запущен
			return
		end

		local localBundle
		if cachedHash == hash then
			localBundle = cachedBundle
		else
			localBundle = file.Read(LOCAL_BUNDLE_PATH, "DATA")
		end

		if !localBundle then
			return
		end

		cachedBundle = localBundle
		cachedHash = hash

		log("Игрок %s запросил bundle.lua с сервера", ply:SteamID())

		local chunkSize = 65532 - 8 - 8 - 16
		local chunks = {}
		for i = 1, #localBundle, chunkSize do
			table.insert(chunks, localBundle:sub(i, i + chunkSize - 1))
		end

		for chunkIdx, chunk in ipairs(chunks) do
			local compressed = util.Compress(chunk)
			net.Start("donatos_bundle")
			net.WriteUInt(#chunks, 8)
			net.WriteUInt(chunkIdx, 8)
			net.WriteUInt(#compressed, 16)
			net.WriteData(compressed, #compressed)
			net.Send(ply)
		end
	end)
end

local function asyncDownloadBundleFromServer()
	if SERVER then
		return false, "server"
	end

	local running = coroutine.running()

	local resolved = false
	local lastPacket = CurTime()
	local function checkTimeout()
		timer.Simple(5, function()
			if resolved then
				return
			end

			if CurTime() - lastPacket > 5 then
				coroutine.resume(running, false, "Таймаут запроса")
			else
				checkTimeout()
			end
		end)
	end

	net.Start("donatos_bundle")
	net.SendToServer()

	log("Запрос bundle.lua с сервера")

	checkTimeout()

	local chunks = {}

	net.Receive("donatos_bundle", function (len, ply)
		lastPacket = CurTime()

		local totalChunks = net.ReadUInt(8)
		local chunkIdx = net.ReadUInt(8)
		local data = util.Decompress(net.ReadData(net.ReadUInt(16)))

		chunks[chunkIdx] = data

		if table.Count(chunks) == totalChunks then
			local result = ""
			for _, key in SortedPairs(table.GetKeys(chunks)) do
				result = result .. chunks[key]
			end
			resolved = true
			log("Получен bundle.lua с сервера")
			coroutine.resume(running, true, result)
		end
	end)

	return coroutine.yield()
end

local function asyncFetchReleases()
	local success, data = asyncHttp({ url = donatosBootstrap.addonApiUrl })
	if success then
		return true, util.JSONToTable(data)
	end
	return false, data
end

local function readLocalRelease()
	local data = file.Read(LOCAL_RELEASE_JSON_PATH, "DATA")
	if data then
		return util.JSONToTable(data)
	end
end

local function asyncInstallRelease(release)
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
	file.Write(LOCAL_BUNDLE_PATH, remoteBundle)

	-- этот файл используется только на сервере
	if SERVER then
		file.Write(LOCAL_RELEASE_JSON_PATH, util.TableToJSON(release))
	end

	log("Версия %s скачана в %s.", release.name, LOCAL_BUNDLE_PATH)

	return true, remoteBundle
end

local function runBundle(bundle)
	RunString(bundle, "donatos/bundle.lua")
	return true
end

local function asyncBootstrap()
	local localBundle = file.Read(LOCAL_BUNDLE_PATH, "DATA")

	-- check existing bundle, server-side
	if SERVER then
		local localRelease = readLocalRelease()
		if localRelease && localRelease.name && localBundle then
			donatosBootstrap.addonVersionConVar:SetString(localRelease.name)
			donatosBootstrap.bundleSha256ConVar:SetString(util.SHA256(localBundle))
			return runBundle(localBundle)
		end
	end

	-- check existing bundle, client-side
	if CLIENT && localBundle then
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

	if SERVER then
		local remoteReleasesSuccess, remoteReleases = asyncFetchReleases()
		if !remoteReleasesSuccess then
			log("Не удалось получить список релизов аддона.")
			return false
		end

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
		local function clientHttpBootstrap()
			local version = donatosBootstrap.addonVersionConVar:GetString()
			if version == "" then
				log("Сервер не передал %s", donatosBootstrap.addonVersionConVar:GetName())
				return false
			end

			local remoteReleasesSuccess, remoteReleases = asyncFetchReleases()
			if !remoteReleasesSuccess then
				log("Не удалось получить список релизов аддона.")
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

		local success, result = clientHttpBootstrap()
		if success then
			return result
		end

		-- если не получилось скачать аддон через http, запрашиваем с сервера через net
		local success, bundle = asyncDownloadBundleFromServer()
		if success then
			file.CreateDir("donatos")
			file.Write(LOCAL_BUNDLE_PATH, bundle)
			return runBundle(bundle)
		else
			log("Не удалось получить bundle.lua с сервера: %s", bundle)
			return false
		end
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
