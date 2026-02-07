import { donatosItem } from '@/donatos/item'
import { meta } from '@/meta'
import { DonatosPlayer } from '@/player'
import { log } from '@/utils/log'
import { donatosState } from '@/utils/state'

if (!donatos) {
	donatos = {}
}

donatos.config = {}
donatos.dev = { enabled: false }

donatos.Item = donatosItem
donatos.GetRemoteConfig = () => donatosState.remoteConfig.value

if (SERVER) {
	if (file.Exists('donatos/config_sv.lua', 'LUA')) {
		include('donatos/config_sv.lua')
	}
}

if (file.Exists('donatos/config_sh.lua', 'LUA')) {
	AddCSLuaFile('donatos/config_sh.lua')
	include('donatos/config_sh.lua')
}

{
	const p = FindMetaTable('Player')
	p.Donatos = function (this: Player) {
		if (!this._donatos) {
			this._donatos = new DonatosPlayer(this)
		}
		return this._donatos
	}

	if (donatos.config?.igsCompat) {
		// Совместимость с IGS
		p.HasPurchase = function (this: Player, key: string) {
			return this.Donatos().HasActiveItem(key)
		}
	}
}

// re-init
for (const ply of player.GetAll()) {
	if (ply._donatos) {
		const oldDonatos = ply._donatos
		const newDonatos = new DonatosPlayer(ply)
		newDonatos._remoteData = oldDonatos._remoteData
		ply._donatos = newDonatos
	}
}

if (CLIENT) {
	import('@/donatos/net/client')
	import('./index-client')
}

if (SERVER) {
	import('@/donatos/net/server')
	import('@/donatos/remote-updates')
	import('./index-server')
}

log.debug(
	`Аддон запущен. Версия ${meta.VERSION}, номер сборки ${meta.BUILD_NUMBER}, коммит ${meta.COMMIT_HASH}`,
)
