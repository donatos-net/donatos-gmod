--[[
Обзор загрузчика Donatos:
- Сервер: сначала проверяет обновления по HTTP; если есть новый релиз, скачивает его в
  data/donatos/bundle.server.txt, устанавливает donatos_version + donatos_bundle_sha256 и запускает bundle.lua.
  Если проверка обновлений не удалась или обновлений нет, запускает существующий локальный bundle (если он есть).
- Клиент: сначала пытается скачать по HTTP. При ошибке запрашивает bundle с сервера через net-сообщение donatos_bundle.
- Передача по сети: чанки по 32KB, клиент запрашивает последовательно (1, 2, 3, ...), с requestId.
  Сервер кэширует чанки по хэшу bundle и ограничивает: первый чанк не чаще раза в 30с; далее строго lastChunk + 1.
- Клиент проверяет SHA256 только для уже существующего локального bundle; скачанные по HTTP/сети запускаются без проверки.
]]

AddCSLuaFile()

if file.Exists("donatos/config_sh.lua", "LUA") then
	AddCSLuaFile("donatos/config_sh.lua")
end

if !donatosBootstrap then
	donatosBootstrap = {}
end

donatosBootstrap.version = 3
donatosBootstrap.addonVersionConVar = CreateConVar("donatos_version", "", {FCVAR_REPLICATED, FCVAR_SERVER_CAN_EXECUTE})
donatosBootstrap.bundleSha256ConVar = CreateConVar("donatos_bundle_sha256", "", {FCVAR_REPLICATED, FCVAR_SERVER_CAN_EXECUTE})
donatosBootstrap.addonApiUrl = "https://donatos.net/api/game-server/gmod/addon"
donatosBootstrap._runID = tostring(CurTime()) -- для отмены таймеров с прошлого запуска скрипта

local LOCAL_RELEASE_JSON_PATH = "donatos/release.json"
local LOCAL_BUNDLE_PATH = "donatos/bundle.txt"

if SERVER then
	LOCAL_BUNDLE_PATH = "donatos/bundle.server.txt"
end

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

-- coroutine.wrap but resumes instantly
local function async(f)
	local co = coroutine.create(f)
	return resume(co)
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
		if resolved then return end
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
		if resolved then return end
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

		local now = CurTime()
		local lastChunk = ply._donatosBundleLastChunk or 0
		local isNewRequest = ply._donatosBundleRequestId ~= requestId

		if isNewRequest then
			if ply._donatosBundleFirstRequestAt && now - ply._donatosBundleFirstRequestAt < 30 then
				log("donatos_bundle reject from %s: too soon (first request <30s)", ply:SteamID())
				return
			end
			ply._donatosBundleFirstRequestAt = now
			ply._donatosBundleRequestId = requestId
			lastChunk = 0
		end

		local requestedChunk = lastChunk + 1
		log("donatos_bundle recv from %s: req=%s chunk=%s", ply:SteamID(), requestId, requestedChunk)
		ply._donatosBundleLastChunk = requestedChunk

		local hash = donatosBootstrap.bundleSha256ConVar:GetString()
		if hash == "" then
			-- аддон не запущен
			log("donatos_bundle reject from %s: empty bundle sha256", ply:SteamID())
			return
		end

		if cachedChunks == nil or cachedChunksHash ~= hash then
			local localBundle = file.Read(LOCAL_BUNDLE_PATH, "DATA")
			if !localBundle then
				log("donatos_bundle reject from %s: missing %s", ply:SteamID(), LOCAL_BUNDLE_PATH)
				return
			end
			localBundle = util.Compress(localBundle)

			local chunkSize = 32768
			cachedChunks = {}
			for i = 1, #localBundle, chunkSize do
				table.insert(cachedChunks, localBundle:sub(i, i + chunkSize - 1))
			end
			cachedChunkCount = #cachedChunks
			cachedChunksHash = hash
			log("donatos_bundle cache built for %s: chunks=%s", ply:SteamID(), cachedChunkCount)
		end

		if requestedChunk == 1 then
			log("Игрок %s запросил bundle.lua с сервера", ply:SteamID())
		end

		if requestedChunk > cachedChunkCount then
			log("donatos_bundle reject from %s: chunk out of range (req=%s total=%s)", ply:SteamID(), requestedChunk, cachedChunkCount)
			return
		end

		local chunk = cachedChunks[requestedChunk]
		net.Start("donatos_bundle")
		net.WriteUInt(requestId, 16)
		net.WriteUInt(cachedChunkCount, 8)
		net.WriteUInt(requestedChunk, 8)
		net.WriteUInt(#chunk, 16)
		net.WriteData(chunk, #chunk)
		net.Send(ply)

		log("donatos_bundle sent: req=%s chunk=%s/%s size=%s", requestId, requestedChunk, cachedChunkCount, #chunk)
	end)
end

local function asyncDownloadBundleFromServer()
	if SERVER then
		return false, "server"
	end

	local running = coroutine.running()

	local resolved = false
	local lastPacket = CurTime()
	local totalChunks
	local nextChunk = 1
	local requestId = math.random(1, 65535)

	local function requestChunk()
		net.Start("donatos_bundle")
		net.WriteUInt(requestId, 16)
		net.SendToServer()
	end

	local function checkTimeout()
		timer.Simple(5, function()
			if resolved then
				return
			end

			if CurTime() - lastPacket > 5 then
				resolved = true
				resume(running, false, "Таймаут запроса")
			else
				checkTimeout()
			end
		end)
	end

	requestChunk()
	log("Запрос bundle.lua с сервера")

	checkTimeout()

	local chunks = {}

	net.Receive("donatos_bundle", function (len, ply)
		if resolved then return end

		lastPacket = CurTime()

		local responseRequestId = net.ReadUInt(16)
		if responseRequestId ~= requestId then
			return
		end

		local totalChunksLocal = net.ReadUInt(8)
		local chunkIdx = net.ReadUInt(8)
		local data = net.ReadData(net.ReadUInt(16))

		chunks[chunkIdx] = data
		totalChunks = totalChunksLocal

		if totalChunks && nextChunk <= totalChunks then
			if chunkIdx == nextChunk then
				nextChunk = nextChunk + 1
				if nextChunk <= totalChunks then
						async(function()
							asyncDelay(0.5)
							requestChunk()
						end)
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
			result = util.Decompress(result)
			if result and result ~= "" then
				resume(running, true, result)
			else
				resume(running, false, "Не удалось распаковать результат")
			end
		end
	end)

	return coroutine.yield()
end

local function asyncFetchReleases()
	local success, data = asyncHttp({ url = donatosBootstrap.addonApiUrl })
	if success then
		local result = util.JSONToTable(data)
		if result then
			if result.releases then
				return true, result
			else
				return false, "Неверный формат ответа: " .. data
			end
		else
			return false, "Ошибка util.JSONToTable: " .. data
		end
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
	if !remoteBundle or remoteBundle == "" then
		return false, "Пустой bundle.lua для релиза " .. release.name
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

	if SERVER then
		local localRelease = readLocalRelease()

		local remoteReleasesSuccess, remoteReleases = asyncFetchReleases()
		if remoteReleasesSuccess then
			local latestRelease = remoteReleases.releases[1]
			if !latestRelease then
				log("Нет доступных релизов")
			else
				local needsUpdate = !localBundle || !localRelease || localRelease.name ~= latestRelease.name
				if needsUpdate then
					log("Доступен новый релиз %s (локальный: %s)", latestRelease.name, localRelease and localRelease.name or "нет")
					local success, bundle = asyncInstallRelease(latestRelease)
					if success then
						donatosBootstrap.addonVersionConVar:SetString(latestRelease.name)
						donatosBootstrap.bundleSha256ConVar:SetString(util.SHA256(bundle))
						return runBundle(bundle)
					end
					log(bundle) -- err
				else
					log("Установлена последняя версия: %s", localRelease.name)
				end
			end
		else
			log("Не удалось получить список релизов аддона.")
		end

		if localRelease && localRelease.name && localBundle then
			donatosBootstrap.addonVersionConVar:SetString(localRelease.name)
			donatosBootstrap.bundleSha256ConVar:SetString(util.SHA256(localBundle))
			return runBundle(localBundle)
		end
		return false
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

	if CLIENT then
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
