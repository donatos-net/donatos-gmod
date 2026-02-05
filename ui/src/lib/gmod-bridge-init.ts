import type { QueryClient } from '@tanstack/react-query'

import { installGmodBridge, registerStateCallbacks, requestStateSync } from '@/lib/gmod-bridge'
import { installMockBridge } from '@/lib/gmod-bridge-mock'

export function initGmodBridge(queryClient: QueryClient) {
  installGmodBridge()

  registerStateCallbacks({
    playerData: (value) => queryClient.setQueryData(['player-data'], value),
    serverConfig: (value) => queryClient.setQueryData(['server-config'], value),
  })

  if (!window.donatosLua) {
    installMockBridge()
  } else {
    requestStateSync()
  }
}
