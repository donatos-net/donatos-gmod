import { donatosItem } from '@/donatos/item'
import { meta } from '@/meta'
import { DonatosPlayer } from '@/player'
import { log } from '@/utils/log'

if (!donatos) {
  donatos = {}
}

donatos.config = {}
donatos.uiConfig = undefined

donatos.Item = donatosItem
donatos.UpdateTheme = () => {}

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
for (const p of player.GetAll()) {
  if (p._donatos) {
    p._donatos = DonatosPlayer.fromExisting(p._donatos)
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

import('@/ents/gift')

log.debug(`Аддон запущен. Версия ${meta.VERSION}, номер сборки ${meta.BUILD_NUMBER}, коммит ${meta.COMMIT_HASH}`)
