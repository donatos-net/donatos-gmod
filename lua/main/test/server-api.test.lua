local t = require("harness")
local async = require("utils.async")

donatos = { config = { apiToken = "token", apiEndpoint = "https://api.test" } }

-- How the stubbed HTTP answers: a function of the request.
local answer
HTTP = function(request)
	answer(request)
	return true
end

local serverApi = require("donatos.server-api")
local apiStatus = require("donatos.api-status")

-- Starts a request; returns a getter for its result once it ends.
local function start(action, input)
	local result
	async.run(function()
		local data, err = serverApi.request(action, input)
		result = { data = data, err = err }
	end)
	return function() return result end
end

-- A request the stub answers right away.
local function call(action, input)
	return start(action, input)()
end

local function respond(code, body)
	answer = function(request) request.success(code, body, {}) end
end

t.test("the API's data comes back", function()
	respond(200, util.TableToJSON({ success = true, data = { ok = 1 } }))
	t.eq(call("server:get-config").data, { ok = 1 })
	t.eq(apiStatus.isDown(), false, "down")
end)

t.test("the API's own error comes back as it is", function()
	respond(400, util.TableToJSON({ success = false, error = "Нет такого товара" }))
	local result = call("player:purchase-goods", {})
	t.eq(result.err, "Нет такого товара")
	t.eq(apiStatus.isDown(), false, "down")
end)

t.test("an outage is logged once at each end, and callers get UNAVAILABLE", function()
	answer = function(request) request.failed("unsuccessful", "connection refused") end
	t.eq(call("server:get-config").err, serverApi.UNAVAILABLE)
	respond(502, "<html>Bad Gateway</html>")
	t.eq(call("server:get-config").err, serverApi.UNAVAILABLE, "a 502")
	answer = function() end
	local hung = start("server:get-player", {})
	t.advance(14)
	t.eq(hung(), nil, "waiting")
	t.advance(1)
	t.eq(hung().err, serverApi.UNAVAILABLE, "a quick read that timed out")
	t.eq(#t.logged("unreachable"), 1, "unreachable lines")
	t.eq(apiStatus.isDown(), true, "down")
	respond(200, util.TableToJSON({ success = true, data = {} }))
	call("server:get-config")
	call("server:get-config")
	t.eq(#t.logged("reachable again"), 1, "reachable lines")
	t.eq(apiStatus.isDown(), false, "down after")
end)

t.test("a purchase waits longer than the quick reads", function()
	answer = function() end
	local purchase = start("player:purchase-goods", {})
	t.advance(59)
	t.eq(purchase(), nil, "waiting")
	t.advance(1)
	t.eq(purchase().err, serverApi.UNAVAILABLE, "timed out")
	respond(200, util.TableToJSON({ success = true, data = {} }))
	call("server:get-config")
end)

t.test("another status, or a body not in the API's shape, fails that request only", function()
	respond(401, "Unauthorized")
	t.eq(call("server:get-config").err, "HTTP error 401", "a 401")
	respond(400, util.TableToJSON({ message = "Bad Request" }))
	t.eq(call("server:get-player", {}).err, "HTTP error 400", "a 400 from a proxy")
	respond(200, "not a body")
	t.eq(call("server:get-config").err, "HTTP error 200", "a body that doesn't parse")
	t.eq(#t.logged("unreachable"), 0, "unreachable lines")
	t.eq(apiStatus.isDown(), false, "down")
end)

t.finish()
