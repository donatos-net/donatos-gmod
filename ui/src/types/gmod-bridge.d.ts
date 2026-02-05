export {}

declare global {
  interface Window {
    donatosLua?: {
      netMessageToServer: (callbackId: number, action: string, dataJson: string) => void
      openUrl: (url: string) => void
      closeUi: () => void
    }
    donatosNative?: {
      _resolveCallback: (callbackId: number, result: unknown) => void
      _rejectCallback: (callbackId: number, error: unknown) => void
      setState: (key: string, value: unknown) => void
    }
    __donatosMock?: boolean
  }
}
