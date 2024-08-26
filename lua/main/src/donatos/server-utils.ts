import { netMessageToClient } from '@/donatos/net'

export function sendDonatosMessage(params: { receiver?: Player; args: (string | Player | Color)[] }) {
  if (CLIENT) {
    return
  }

  const serialized: [number, unknown][] = []

  for (const arg of params.args) {
    if (typeof arg === 'string') {
      serialized.push([0, arg])
    } else if (isentity(arg) && (arg as Entity).IsPlayer()) {
      serialized.push([1, (arg as Player).UserID()])
    } else if (IsColor(arg)) {
      serialized.push([2, (arg as Color).ToTable()])
    }
  }

  netMessageToClient(params.receiver, 'print', serialized)
}
