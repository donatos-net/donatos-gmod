local t = require("harness")
local async = require("utils.async")

-- utils.http picks its backend when loaded: each case loads it again.
local function loadHttp()
	package.loaded["utils.http"] = nil
	return require("utils.http")
end

-- Runs `request` on `http` in a coroutine; returns a getter for its results once it ends.
local function start(http, parameters)
	local result
	async.run(function()
		local response, err = http.request(parameters)
		result = { response = response, err = err }
	end)
	return function() return result end
end

t.test("GMod's HTTP is used when no module is installed", function()
	local sent
	HTTP = function(request) sent = request return true end
	local http = loadHttp()
	local result = start(http, { url = "https://example.test" })
	t.eq(sent.url, "https://example.test", "url")
	sent.success(200, "body", {})
	t.eq(result().response.body, "body", "body")
	t.eq(result().err, nil, "err")
end)

t.test("reqwest is used when installed, and its error detail is kept", function()
	HTTP = function() error("GMod's HTTP used") end
	util.IsBinaryModuleInstalled = function(name) return name == "reqwest" end
	local sent
	package.preload.reqwest = function()
		reqwest = function(request) sent = request return true end
	end
	local http = loadHttp()
	util.IsBinaryModuleInstalled = function() return false end
	local result = start(http, { url = "https://example.test" })
	sent.failed("unsuccessful", "connection refused")
	t.eq(result().err, "unsuccessful: connection refused")
end)

t.test("a request that doesn't answer fails after its timeout, and a late answer is ignored", function()
	local sent
	HTTP = function(request) sent = request return true end
	local http = loadHttp()
	local result = start(http, { url = "https://example.test", timeout = 5 })
	t.eq(sent.timeout, 5, "timeout passed to the backend")
	t.advance(4)
	t.eq(result(), nil, "still waiting")
	t.advance(1)
	t.eq(result().err, "timed out after 5s")
	sent.success(200, "late", {})
	t.eq(result().err, "timed out after 5s", "unchanged")
end)

t.test("the default timeout applies when none is given", function()
	HTTP = function() return true end
	local http = loadHttp()
	local result = start(http, { url = "https://example.test" })
	t.advance(59)
	t.eq(result(), nil, "still waiting")
	t.advance(1)
	t.eq(result().err, "timed out after 60s")
end)

t.test("a request the backend couldn't start fails at once", function()
	HTTP = function() return false end
	local http = loadHttp()
	t.eq(start(http, { url = "https://example.test" })().err, "the request couldn't be started")
end)

t.finish()
