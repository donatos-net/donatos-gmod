-- player.server's saved active items and expiry, with the API and net stubbed.
local t = require("harness")

local UNAVAILABLE = "unavailable"
-- What `server:get-player` gives: player data, or nil for the API being down.
local apiPlayer
package.loaded["donatos.server-api"] = {
	UNAVAILABLE = UNAVAILABLE,
	request = function()
		if apiPlayer == nil then
			return nil, UNAVAILABLE
		end
		return apiPlayer, nil
	end,
}
local synced = 0
package.loaded["donatos.net"] = { toClient = function() synced = synced + 1 end }
package.loaded["donatos.client-view"] = { player = function(data) return data end }
package.loaded["donatos.server-utils"] = { sendMessage = function() end }

local async = require("utils.async")
local item = require("donatos.item")
local serverPlayer = require("player.server")

item.create("vip"):SetSAMGroup("vip")
item.create("hat")

local nextSteamID = 0

-- A player joining now, with SAM's rank methods; `rank` is the one SAM kept from before.
local function join(steamID64, rank)
	local ply = t.player(steamID64, { rank = rank or "user" })
	ply.sam_set_rank = function(self, newRank) self.rank = newRank end
	ply.sam_getrank = function(self) return self.rank end
	ply._donatos = serverPlayer.new(ply)
	async.run(function()
		ply._donatos:loadRemoteData()
		ply._donatos:onPlayerJoined()
	end)
	return ply
end

local function newSteamID()
	nextSteamID = nextSteamID + 1
	return tostring(nextSteamID)
end

local function activeItem(key, expiresIn, fields)
	local itm = fields or {}
	itm.id = itm.id or 1
	itm.activatedAt = os.time() - 10
	itm.isFrozen = itm.isFrozen or false
	itm.goods = { key = key, name = key }
	if expiresIn ~= nil then
		itm.expires = { at = os.time() + expiresIn, ["in"] = "", inS = expiresIn, durationS = expiresIn + 10 }
	end
	return itm
end

local function data(items)
	return { player = { id = 1, externalId = "x", balance = 0 }, inventoryItems = {}, activeItems = items }
end

local function keys(ply)
	local found = {}
	for _, itm in ipairs(ply:Donatos():GetActiveItems()) do
		table.insert(found, itm.goods.key)
	end
	return found
end

t.test("joining while the API is down with nothing saved leaves the rank alone", function()
	apiPlayer = nil
	local ply = join(newSteamID(), "vip")
	t.eq(ply.rank, "vip", "rank")
	t.eq(ply:Donatos():IsLoaded(), false, "loaded")
	t.eq(keys(ply), {}, "items")
end)

t.test("the items saved at the last load are used when a join can't reach the API", function()
	local id = newSteamID()
	apiPlayer = data({ activeItem("vip", 3600), activeItem("hat", nil, { id = 2 }), activeItem("hat", 3600, { id = 3, isFrozen = true }) })
	join(id)
	apiPlayer = nil
	local ply = join(id)
	t.eq(keys(ply), { "vip", "hat" }, "items (without the frozen one)")
	t.eq(ply:Donatos():HasActiveItem("vip"), true, "HasActiveItem")
	t.eq(ply.rank, "vip", "rank")
	t.eq(ply:Donatos():IsLoaded(), false, "loaded")
end)

t.test("saved items that ran out since are not used, and their rank is taken back", function()
	local id = newSteamID()
	apiPlayer = data({ activeItem("vip", 100) })
	join(id)
	t.advance(200)
	apiPlayer = nil
	local ply = join(id, "vip")
	t.eq(keys(ply), {}, "items")
	t.eq(ply.rank, "user", "rank")
end)

t.test("a load that succeeds replaces the saved items", function()
	local id = newSteamID()
	apiPlayer = data({ activeItem("vip", 3600) })
	join(id)
	apiPlayer = nil
	local ply = join(id)
	apiPlayer = data({ activeItem("hat") })
	async.run(function() ply:Donatos():loadRemoteData() end)
	t.eq(ply:Donatos():IsLoaded(), true, "loaded")
	t.eq(ply:Donatos()._savedActiveItems, nil, "saved")
	t.eq(keys(ply), { "hat" }, "items")
end)

t.test("an item that runs out while the player is on is dropped, and the rest kept", function()
	apiPlayer = data({
		activeItem("vip", 60),
		activeItem("hat", nil, { id = 2 }),
		activeItem("hat", 30, { id = 3, isFrozen = true }),
	})
	local ply = join(newSteamID())
	t.eq(ply.rank, "vip", "rank at join")
	local syncsBefore = synced
	t.advance(59)
	t.eq(#keys(ply), 3, "items before it runs out")
	t.eq(synced, syncsBefore, "no sync before")
	t.advance(1)
	t.eq(keys(ply), { "hat", "hat" }, "items after")
	t.eq(ply.rank, "user", "rank after")
	t.eq(synced, syncsBefore + 1, "synced to the client")
end)

t.test("saved items run out while the player is on too", function()
	local id = newSteamID()
	apiPlayer = data({ activeItem("vip", 100) })
	join(id)
	apiPlayer = nil
	local ply = join(id)
	t.eq(keys(ply), { "vip" }, "items at join")
	t.advance(100)
	t.eq(keys(ply), {}, "items after")
	t.eq(ply.rank, "user", "rank after")
end)

t.test("each item that runs out is dropped at its time, by one timer at a time", function()
	apiPlayer = data({ activeItem("hat", 100, { id = 1 }), activeItem("vip", 30, { id = 2 }), activeItem("hat", 60, { id = 3 }) })
	local ply = join(newSteamID())
	local name = "donatos_expiry_" .. ply:SteamID64()
	t.advance(30)
	t.eq(#keys(ply), 2, "after the first")
	t.eq(timer.Exists(name), true, "timer for the next")
	t.advance(30)
	t.eq(keys(ply), { "hat" }, "after the second")
	t.advance(40)
	t.eq(keys(ply), {}, "after the last")
	t.eq(timer.Exists(name), false, "no timer left")
end)

t.test("an item that runs out more than a day off gets no timer", function()
	apiPlayer = data({ activeItem("vip", 30 * 24 * 60 * 60) })
	local ply = join(newSteamID())
	t.eq(timer.Exists("donatos_expiry_" .. ply:SteamID64()), false)
end)

t.test("a load replaces the timer the previous one set", function()
	apiPlayer = data({ activeItem("vip", 30) })
	local ply = join(newSteamID())
	apiPlayer = data({ activeItem("vip", 3600) })
	async.run(function() ply:Donatos():loadRemoteData() end)
	t.advance(60)
	t.eq(keys(ply), { "vip" }, "items")
end)

t.test("an API answering with an error brings in no saved items", function()
	local id = newSteamID()
	apiPlayer = data({ activeItem("vip", 3600) })
	join(id)
	local request = package.loaded["donatos.server-api"].request
	package.loaded["donatos.server-api"].request = function() return nil, "Игрок заблокирован" end
	local ply = join(id)
	package.loaded["donatos.server-api"].request = request
	t.eq(keys(ply), {}, "items")
	t.eq(ply.rank, "user", "rank")
end)

t.test("a rank of the player's own (an admin's) stays when an item runs out", function()
	apiPlayer = data({ activeItem("vip", nil, { id = 1 }), activeItem("hat", 60, { id = 2 }) })
	local ply = join(newSteamID())
	t.eq(ply.rank, "vip", "rank at join")
	ply.rank = "moderator"
	t.advance(60)
	t.eq(keys(ply), { "vip" }, "items after")
	t.eq(ply.rank, "moderator", "rank after")
end)

t.test("when a rank item runs out, another active rank item's rank is given", function()
	item.create("premium"):SetSAMGroup("premium")
	local premium = activeItem("premium", nil, { id = 1 })
	premium.activatedAt = os.time() - 100
	apiPlayer = data({ premium, activeItem("vip", 60, { id = 2 }) })
	local ply = join(newSteamID())
	t.eq(ply.rank, "vip", "rank at join (the newer item)")
	t.advance(60)
	t.eq(ply.rank, "premium", "rank after")
end)

t.test("a player had by an older bundle's run counts from when this run sets its timer", function()
	apiPlayer = data({ activeItem("vip", 60) })
	local ply = join(newSteamID())
	ply:Donatos()._itemsLoadedAt = nil
	timer.Remove("donatos_expiry_" .. ply:SteamID64())
	t.advance(100)
	ply:Donatos():scheduleExpiry()
	t.advance(59)
	t.eq(keys(ply), { "vip" }, "kept until a full inS later")
	t.advance(1)
	t.eq(keys(ply), {}, "dropped")
end)

t.test("freezing a rank item takes back its rank, and thawing it runs its join handlers once", function()
	local joins = 0
	item.create("pet"):OnPlayerJoin(function() joins = joins + 1 end)
	apiPlayer = data({ activeItem("vip", 3600, { id = 1 }), activeItem("pet", 3600, { id = 2 }) })
	local ply = join(newSteamID())
	t.eq(joins, 1, "pet joins at join")
	local function load(vipFrozen, petFrozen)
		apiPlayer = data({
			activeItem("vip", 3600, { id = 1, isFrozen = vipFrozen }),
			activeItem("pet", 3600, { id = 2, isFrozen = petFrozen }),
		})
		async.run(function() ply:Donatos():loadRemoteData() end)
	end
	load(true, false)
	t.eq(ply.rank, "user", "rank once frozen")
	t.eq(joins, 1, "other items' handlers don't run again")
	load(true, false)
	t.eq(joins, 1, "a load with nothing thawed runs nothing")
	load(false, true)
	t.eq(ply.rank, "vip", "rank once thawed")
	t.eq(joins, 1, "freezing runs nothing")
	load(false, false)
	t.eq(joins, 2, "the thawed item's handlers")
end)

t.finish()
