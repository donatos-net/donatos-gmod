declare const _G: Record<unknown, unknown>

declare namespace properties {
  export const List: Record<string, unknown>
  export function Add(
    this: void,
    name: string,
    data: Partial<
      PropertyAdd & {
        Filter: (e: Entity, p: Player) => boolean
        Action: (e: Entity, tr: TraceResult) => void
        MenuOpen: (option: DMenuOption, ent: Entity, tr: TraceResult) => void
      }
    >,
  )
}

type _FontData = FontData
declare type FontData = Partial<_FontData>
