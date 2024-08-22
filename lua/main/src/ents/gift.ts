import { serverApiRequest } from '@/donatos/server-api'
import { type EntityMetaTable, getEntityMetatable } from '@/ents/ent-meta'
import type { serverApiSchema } from 'api-schema/src'

type DroppedItem = serverApiSchema['player:drop-item']['output']['item']

type GiftEnt = Entity & { Draw?: () => void } & { _itemId: number; _giftToken: string; _lastUse?: number } & {
  GetItemName: () => string
  SetItemName: (this: GiftEnt, name: string) => void
}

const nameColor = Color(255, 255, 255)

const metaTable = getEntityMetatable('donatos_gift')
table.Empty(metaTable)

const ent = {
  Type: 'anim',
  Base: 'base_anim',
  PrintName: 'Donatos: подарок',

  SetupDataTables: function (this: GiftEnt) {
    this.NetworkVar('String', 0, 'ItemName')
  },

  Initialize: SERVER
    ? function (this: GiftEnt) {
        this.SetModel('models/dav0r/hoverball.mdl')

        this.PhysicsInit(SOLID.SOLID_VPHYSICS)
        this.SetMoveType(MOVETYPE.MOVETYPE_VPHYSICS)
        this.SetSolid(SOLID.SOLID_VPHYSICS)
        this.SetUseType(_USE.SIMPLE_USE)
        this.PhysWake()
      }
    : undefined,
  Use: SERVER
    ? function (this, ent: Entity) {
        if (!ent.IsPlayer()) {
          return
        }

        const ply = ent as Player
        const donatosId = ply.Donatos().ID
        if (!donatosId) {
          return
        }

        serverApiRequest('player:claim-item', {
          playerId: donatosId,
          itemId: this._itemId,
          token: this._giftToken,
        }).then(({ isError, data, error }) => {
          if (isError) {
            ply.Donatos()._sPrint(`Произошла ошибка: ${error}`)
            return
          }

          ply.EmitSound('garrysmod/content_downloaded.wav', 75, 100, 0.3)
          ply.Donatos()._sPrint('Вы получили в подарок предмет. Откройте донат-меню для активации.')

          return ply.Donatos()._sLoadRemoteData()
        })

        this.Remove()
      }
    : undefined,

  Draw: CLIENT
    ? function (this: GiftEnt) {
        this.DrawModel()

        const angle = this.GetPos().subOp(EyePos()).GetNormalized().Angle()
        angle.RotateAroundAxis(angle.Up(), -90)
        angle.RotateAroundAxis(angle.Forward(), 90)

        cam.Start3D2D(this.GetPos(), angle, 0.1)
        draw.SimpleText(
          this.GetItemName(),
          'ChatFont',
          0,
          -100,
          nameColor,
          TEXT_ALIGN.TEXT_ALIGN_CENTER,
          TEXT_ALIGN.TEXT_ALIGN_CENTER,
        )
        cam.End3D2D()
      }
    : undefined,
} satisfies EntityMetaTable<GiftEnt>

table.Merge(metaTable, ent, true)
scripted_ents.Register(metaTable, 'donatos_gift')

export function createGiftEnt({ pos, token, item }: { pos: Vector; token: string; item: DroppedItem }) {
  const e = ents.Create('donatos_gift') as GiftEnt
  e._itemId = item.id
  e._giftToken = token
  e.SetItemName(item.name)
  e.SetPos(pos)
  e.Spawn()
  return e
}
