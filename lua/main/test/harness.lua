-- The test harness: just enough of GMod for the server modules in out/, a fake clock that runs
-- timers, `sql` on a real SQLite database (through the sqlite3 CLI), and assertions.
--
-- Each test file runs in its own LuaJIT process (test/run.ts), so globals start fresh. Not GMod:
-- `util.TableToJSON` / `util.JSONToTable` write and read Lua literals, which round-trip the
-- same tables but are not JSON.

local harness = { failures = 0, logs = {}, errors = {} }

SERVER = true
CLIENT = false

------------------------------------------------------------------------------ clock and timers

local clock = 1800000000
local timers = {}

-- The clock is whole seconds for os.time() and fractional for SysTime() and the like.
os.time = function(date)
	if date ~= nil then
		error("os.time(date) is not stubbed")
	end
	return math.floor(clock)
end
function SysTime() return clock end
function RealTime() return clock end
function CurTime() return clock end

timer = {}
function timer.Simple(delay, callback)
	table.insert(timers, { at = clock + delay, callback = callback })
end
-- Runs once whatever `repetitions` says; a name replaces the timer created with it before.
function timer.Remove(name)
	for index = #timers, 1, -1 do
		if timers[index].name == name then
			table.remove(timers, index)
		end
	end
end
function timer.Create(name, delay, repetitions, callback)
	timer.Remove(name)
	table.insert(timers, { at = clock + delay, callback = callback, name = name })
end
function timer.Exists(name)
	for _, entry in ipairs(timers) do
		if entry.name == name then
			return true
		end
	end
	return false
end

-- Moves the clock on by `seconds`, running the timers due on the way, in order.
function harness.advance(seconds)
	local target = clock + seconds
	while true do
		table.sort(timers, function(a, b) return a.at < b.at end)
		local nextTimer = timers[1]
		if nextTimer == nil or nextTimer.at > target then
			break
		end
		table.remove(timers, 1)
		clock = math.max(clock, nextTimer.at)
		nextTimer.callback()
	end
	clock = target
end

------------------------------------------------------------------------------ GMod globals

function Color(r, g, b, a) return { r = r, g = g, b = b, a = a or 255 } end
function MsgC(...)
	local parts = {}
	for _, part in ipairs({ ... }) do
		if type(part) == "string" then
			table.insert(parts, part)
		end
	end
	local line = table.concat(parts):gsub("\n$", "")
	table.insert(harness.logs, line)
end
function ErrorNoHalt(message) table.insert(harness.errors, message) end
function isfunction(value) return type(value) == "function" end
function IsValid(value)
	if value == nil or value == false then
		return false
	end
	if type(value) == "table" and value.IsValid ~= nil then
		return value:IsValid()
	end
	return true
end

local globals2 = {}
function SetGlobal2Bool(name, value) globals2[name] = value end
function GetGlobal2Bool(name, default)
	local value = globals2[name]
	if value == nil then
		return default
	end
	return value
end

local hooks = {}
hook = {}
function hook.Add(event, id, callback)
	hooks[event] = hooks[event] or {}
	hooks[event][id] = callback
end
function hook.Run(event, ...)
	for _, callback in pairs(hooks[event] or {}) do
		local result = callback(...)
		if result ~= nil then
			return result
		end
	end
end

local function serialize(value)
	local kind = type(value)
	if kind == "table" then
		local parts = {}
		for key, item in pairs(value) do
			table.insert(parts, "[" .. serialize(key) .. "]=" .. serialize(item))
		end
		return "{" .. table.concat(parts, ",") .. "}"
	elseif kind == "string" then
		-- One line: %q breaks a newline with a backslash, which "\n" spells as well.
		return (string.format("%q", value):gsub("\n", "n"))
	end
	return tostring(value)
end

util = {}
function util.TableToJSON(value) return serialize(value) end
function util.JSONToTable(text)
	local chunk = loadstring("return " .. text)
	if chunk == nil then
		return nil
	end
	local ok, value = pcall(setfenv(chunk, {}))
	return ok and type(value) == "table" and value or nil
end
function util.IsBinaryModuleInstalled(name) return false end
function util.AddNetworkString() end

------------------------------------------------------------------------------ players

local players = {}
player = {}
function player.GetAll() return players end
function player.GetHumans() return players end

-- A connected player; `fields` can add SAM's methods (`sam_set_rank`, `sam_getrank`).
function harness.player(steamID64, fields)
	local ply = fields or {}
	ply.SteamID64 = function() return steamID64 end
	ply.SteamID = function() return "STEAM_0:0:" .. steamID64 end
	ply.Nick = function() return "Player " .. steamID64 end
	ply.IsBot = function() return false end
	ply.IsValid = function() return true end
	ply.GetUserGroup = function() return "user" end
	ply.Donatos = function(self) return self._donatos end
	table.insert(players, ply)
	return ply
end

------------------------------------------------------------------------------ sql

local database = os.tmpname()
local queryFile = database .. ".sql"

-- Runs `query` with the sqlite3 CLI; rows come back as sql.Query gives them (every value a
-- string), nil when there are none, false on an error.
local function run(query)
	local file = assert(io.open(queryFile, "w"))
	file:write(query, ";\n")
	file:close()
	local pipe = assert(io.popen("sqlite3 -bail -header -list -separator '\31' " .. database .. " < " .. queryFile .. " 2>&1; echo \"\31$?\""))
	local output = pipe:read("*a")
	pipe:close()
	local text, status = output:match("^(.-)\31(%d+)\n$")
	if status ~= "0" then
		harness.lastSqlError = text
		return false
	end
	local lines = {}
	for line in text:gmatch("[^\n]+") do
		table.insert(lines, line)
	end
	if #lines == 0 then
		return nil
	end
	local function split(line)
		local values = {}
		for value in (line .. "\31"):gmatch("(.-)\31") do
			table.insert(values, value)
		end
		return values
	end
	local columns = split(table.remove(lines, 1))
	local rows = {}
	for _, line in ipairs(lines) do
		local row = {}
		for index, value in ipairs(split(line)) do
			row[columns[index]] = value
		end
		table.insert(rows, row)
	end
	return rows
end

sql = {}
sql.Query = run
function sql.SQLStr(text) return "'" .. tostring(text):gsub("'", "''") .. "'" end
function sql.LastError() return harness.lastSqlError or "" end

function harness.cleanup()
	os.remove(database)
	os.remove(queryFile)
end

------------------------------------------------------------------------------ assertions

local function show(value)
	return type(value) == "table" and serialize(value) or tostring(value)
end

local function equal(a, b)
	if type(a) ~= "table" or type(b) ~= "table" then
		return a == b
	end
	for key, value in pairs(a) do
		if not equal(value, b[key]) then
			return false
		end
	end
	for key in pairs(b) do
		if a[key] == nil then
			return false
		end
	end
	return true
end

function harness.eq(actual, expected, what)
	if not equal(actual, expected) then
		error(string.format("%s: expected %s, got %s", what or "value", show(expected), show(actual)), 2)
	end
end

-- The log lines since the last call that contain `text`.
function harness.logged(text)
	local found = {}
	for _, line in ipairs(harness.logs) do
		if line:find(text, 1, true) then
			table.insert(found, line)
		end
	end
	return found
end

function harness.test(name, body)
	harness.logs = {}
	local ok, err = xpcall(body, debug.traceback)
	if ok and #harness.errors > 0 then
		ok, err = false, table.concat(harness.errors, "\n")
	end
	harness.errors = {}
	if ok then
		print("  ok    " .. name)
	else
		harness.failures = harness.failures + 1
		print("  FAIL  " .. name .. "\n" .. tostring(err))
	end
end

function harness.finish()
	harness.cleanup()
	os.exit(harness.failures == 0 and 0 or 1)
end

return harness
