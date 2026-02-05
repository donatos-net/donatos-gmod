--[[
Donatos bootstrapper overview:
- Server: fetches latest release via HTTP, stores bundle at data/donatos/bundle.txt,
  sets donatos_version + donatos_bundle_sha256, then runs bundle.lua.
- Client: tries HTTP download first. On failure, requests bundle from server via donatos_bundle net message.
- Net transfer: 32KB chunks, client requests sequentially (1, 2, 3, ...), tagged with requestId.
  Server caches chunks by bundle hash and enforces: first chunk only once per 30s; subsequent requests must be lastChunk + 1.
- Client stores bundle at data/donatos/bundle.txt and verifies SHA256 before running.
]]
AddCSLuaFile()

if !donatosBootstrap then
	donatosBootstrap = {}
end

donatosBootstrap.version = 3
donatosBootstrap.addonVersionConVar = CreateConVar("donatos_version", "", {FCVAR_REPLICATED, FCVAR_SERVER_CAN_EXECUTE})
donatosBootstrap.bundleSha256ConVar = CreateConVar("donatos_bundle_sha256", "", {FCVAR_REPLICATED, FCVAR_SERVER_CAN_EXECUTE})
donatosBootstrap.addonApiUrl = "https://donatos.net/api/game-server/gmod/addon"
donatosBootstrap._runID = tostring(CurTime())

local LOCAL_RELEASE_JSON_PATH = "donatos/release.json"
local LOCAL_BUNDLE_PATH = "donatos/bundle.txt"

local function log(patt, ...)
	print(string.format("[DonatosBootstrap] " .. patt, ...))
end

-- coroutine.resume but with error logging
local function resume(co, ...)
	local ok, err = coroutine.resume(co, ...)

	if ! ok then
		return ErrorNoHalt(
			debug.traceback(co, "[coroutine error] " .. err)
		)
	end
end

local function asyncDelay(delay)
	local id = donatosBootstrap._runID
	local running = coroutine.running()
	timer.Simple(delay, function ()
		if id == donatosBootstrap._runID then
			resume(running)
		end
	end)
	return coroutine.yield()
end

local function asyncHttp(opts)
	local running = coroutine.running()

	local resolved = false

	local function onSuccess(code, body, headers)
		if code >= 200 && code <= 299 then
			resolved = true
			resume(running, true, body)
		else
			log("HTTP Error %s: %s", code, body)
			log("Request was: %s", util.TableToJSON(opts))

			resolved = true
			resume(running, false, string.format("HTTP code %s on %s", code, opts.url))
		end
	end

	local function onFailure(reason)
		log("HTTP Error: %s", reason)
		resolved = true
		resume(running, false, string.format("HTTP failed on %s: %s", opts.url, reason))
	end

	log("HTTP %s %s", opts.method || "GET", opts.url)

	HTTP({
		failed = onFailure,
		success = onSuccess,
		method = opts.method || "GET",
		url = opts.url
	})

	local timeout = opts.timeout || 10

	timer.Simple(timeout, function ()
		if !resolved then
			onFailure(string.format("Manual timeout (%ss)", timeout))
		end
	end)

	return coroutine.yield()
end

---------------------------------------------------------------------------

if SERVER then
	util.AddNetworkString("donatos_bundle")

	local cachedChunks, cachedChunkCount, cachedChunksHash

	net.Receive("donatos_bundle", function (len, ply)
		local requestId = net.ReadUInt(16)
		local requestedChunk = net.ReadUInt(8)
		if requestedChunk < 1 then
			requestedChunk = 1
		end

		log("donatos_bundle recv from %s: req=%s chunk=%s", ply:SteamID(), requestId, requestedChunk)

		local now = CurTime()
		local lastChunk = ply._donatosBundleLastChunk or 0

		if requestedChunk == 1 then
			if ply._donatosBundleFirstRequestAt && now - ply._donatosBundleFirstRequestAt < 30 then
				log("donatos_bundle reject: too soon (first request <30s)")
				return
			end
			ply._donatosBundleFirstRequestAt = now
			ply._donatosBundleLastChunk = 1
		else
			if requestedChunk ~= lastChunk + 1 then
				log("donatos_bundle reject: non-seq (last=%s req=%s)", lastChunk, requestedChunk)
				return
			end
			ply._donatosBundleLastChunk = requestedChunk
		end

		local hash = donatosBootstrap.bundleSha256ConVar:GetString()
		if hash == "" then
			-- аддон не запущен
			log("donatos_bundle reject: empty bundle sha256")
			return
		end

		if cachedChunks == nil || cachedChunksHash ~= hash then
			local localBundle = file.Read(LOCAL_BUNDLE_PATH, "DATA")
			if !localBundle then
				log("donatos_bundle reject: missing %s", LOCAL_BUNDLE_PATH)
				return
			end

			local chunkSize = 32768
			cachedChunks = {}
			for i = 1, #localBundle, chunkSize do
				table.insert(cachedChunks, localBundle:sub(i, i + chunkSize - 1))
			end
			cachedChunkCount = #cachedChunks
			cachedChunksHash = hash
			log("donatos_bundle cache built: chunks=%s", cachedChunkCount)
		end

		if requestedChunk == 1 then
			log("Игрок %s запросил bundle.lua с сервера", ply:SteamID())
		end

		if requestedChunk > cachedChunkCount then
			log("donatos_bundle reject: chunk out of range (req=%s total=%s)", requestedChunk, cachedChunkCount)
			return
		end

		local chunk = cachedChunks[requestedChunk]
		local compressed = util.Compress(chunk)
		net.Start("donatos_bundle")
		net.WriteUInt(requestId, 16)
		net.WriteUInt(cachedChunkCount, 8)
		net.WriteUInt(requestedChunk, 8)
		net.WriteUInt(#compressed, 16)
		net.WriteData(compressed, #compressed)
		net.Send(ply)
		log("donatos_bundle sent: req=%s chunk=%s/%s size=%s", requestId, requestedChunk, cachedChunkCount, #compressed)
	end)
end

local function asyncDownloadBundleFromServer(failureReason)
	if SERVER then
		return false, "server"
	end

	local running = coroutine.running()

	local resolved = false
	local lastPacket = CurTime()
	local totalChunks
	local nextChunk = 1
	local requestId = math.random(1, 65535)

	local function requestChunk(idx)
		net.Start("donatos_bundle")
		net.WriteUInt(requestId, 16)
		net.WriteUInt(idx, 8)
		net.SendToServer()
	end

	local function checkTimeout()
		timer.Simple(5, function()
			if resolved then
				return
			end

			if CurTime() - lastPacket > 5 then
				resume(running, false, "Таймаут запроса")
			else
				checkTimeout()
			end
		end)
	end

	if failureReason then
		ErrorNoHaltWithStack("[DonatosBootstrap] " .. tostring(failureReason))
	end

	requestChunk(nextChunk)
	log("Запрос bundle.lua с сервера")

	checkTimeout()

	local chunks = {}

	net.Receive("donatos_bundle", function (len, ply)
		lastPacket = CurTime()

		local responseRequestId = net.ReadUInt(16)
		if responseRequestId ~= requestId then
			return
		end

		local totalChunksLocal = net.ReadUInt(8)
		local chunkIdx = net.ReadUInt(8)
		local data = util.Decompress(net.ReadData(net.ReadUInt(16)))

		chunks[chunkIdx] = data
		totalChunks = totalChunksLocal

		if totalChunks && nextChunk <= totalChunks then
			if chunkIdx == nextChunk then
				nextChunk = nextChunk + 1
				if nextChunk <= totalChunks then
					requestChunk(nextChunk)
				end
			end
		end

		if totalChunks && table.Count(chunks) == totalChunks then
			local result = ""
			for _, key in SortedPairs(table.GetKeys(chunks)) do
				result = result .. chunks[key]
			end
			resolved = true
			log("Получен bundle.lua с сервера")
			resume(running, true, result)
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
		return false, string.format("Неверный релиз: %s", release and util.TableToJSON(release) or nil)
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

	log("Версия %s скачана в %s", release.name, LOCAL_BUNDLE_PATH)

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
				return false, string.format("Сервер не передал %s", donatosBootstrap.addonVersionConVar:GetName())
			end

			local remoteReleasesSuccess, remoteReleases = asyncFetchReleases()
			if !remoteReleasesSuccess then
				return false, remoteReleases
			end

			local release
			for _, r in ipairs(remoteReleases.releases) do
				if r.name == version then
					release = r
					break
				end
			end

			if !release then
				return false, string.format("Релиз %s недоступен.", version)
			end

			local success, bundle = asyncInstallRelease(release)
			if !success then
				return false, bundle
			end
			return true, runBundle(bundle)
		end

		local success, result = clientHttpBootstrap()
		if success then
			return result
		end

		log("Не удалось получить bundle.lua через HTTP: %s", result)

		-- если не получилось скачать аддон через http, запрашиваем с сервера через net
		local success, bundle = asyncDownloadBundleFromServer(result)
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

log("Инициализирован")
