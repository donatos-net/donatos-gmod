if file.Exists("main/dist/bundle.lua", "LUA") then
    AddCSLuaFile("main/dist/bundle.lua")
    include("main/dist/bundle.lua")
end
