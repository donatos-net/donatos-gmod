-- The saved config of donatos.utils.load-remote-config, with the API and net stubbed.
local t = require("harness")

-- What `server:get-config` gives: a config, or nil for the API being down.
local apiConfig
package.loaded["donatos.server-api"] = {
	UNAVAILABLE = "unavailable",
	request = function()
		if apiConfig == nil then
			return nil, "unavailable"
		end
		return apiConfig, nil
	end,
}
local sent = {}
package.loaded["donatos.net"] = { toClient = function(ply, action, data) table.insert(sent, data) end }
package.loaded["donatos.client-view"] = { config = function(config) return config end }

local async = require("utils.async")
local state = require("utils.state")

-- A server start: the bundle `version` loads, then loads the config.
local function start(version)
	package.loaded.meta = { VERSION = version }
	package.loaded["donatos.utils.load-remote-config"] = nil
	state.remoteConfig.value = nil
	sent = {}
	local loaded
	async.run(function()
		loaded = require("donatos.utils.load-remote-config").loadRemoteConfig()
	end)
	return loaded
end

t.test("a server starting while the API is down uses the config saved by the same version", function()
	apiConfig = { goods = { { id = 1, name = "VIP" } } }
	t.eq(start("v1"), true, "loaded")
	apiConfig = nil
	t.eq(start("v1"), false, "loaded while down")
	t.eq(state.remoteConfig.value, { goods = { { id = 1, name = "VIP" } } }, "config")
	t.eq(sent, { { goods = { { id = 1, name = "VIP" } } } }, "synced to clients")
end)

t.test("another version's saved config isn't used", function()
	apiConfig = nil
	start("v2")
	t.eq(state.remoteConfig.value, nil, "config")
	t.eq(sent, {}, "synced")
end)

t.test("a config already loaded stays when a later load fails", function()
	apiConfig = { goods = { { id = 2 } } }
	start("v3")
	apiConfig = nil
	async.run(function()
		require("donatos.utils.load-remote-config").loadRemoteConfig()
	end)
	t.eq(state.remoteConfig.value, { goods = { { id = 2 } } }, "config")
end)

t.finish()
