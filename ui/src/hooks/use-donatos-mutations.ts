import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isInGame, netMessageToServer } from '@/lib/gmod-bridge'

export function usePurchaseItem() {
  const queryClient = useQueryClient()
  const inGame = isInGame()

  return useMutation({
    mutationFn: async ({
      goodsId,
      variantId,
    }: {
      goodsId: number
      variantId: string
    }) => {
      if (inGame) {
        const result = await netMessageToServer('purchaseGoods', { goodsId, variantId })
        if (result === false) {
          throw new Error('Purchase failed')
        }
        return result
      }

      console.log('Purchase item:', goodsId, variantId)
      await new Promise((resolve) => setTimeout(resolve, 500))
      return true
    },
    onSuccess: () => {
      if (!inGame) {
        queryClient.invalidateQueries({ queryKey: ['player-data'] })
      }
    },
  })
}

export function useActivateItem() {
  const queryClient = useQueryClient()
  const inGame = isInGame()

  return useMutation({
    mutationFn: async (itemId: number) => {
      if (inGame) {
        const result = await netMessageToServer('activateItem', { id: itemId })
        if (!result) {
          throw new Error('Activation failed')
        }
        return result
      }

      console.log('Activate item:', itemId)
      await new Promise((resolve) => setTimeout(resolve, 500))
      return true
    },
    onSuccess: () => {
      if (!inGame) {
        queryClient.invalidateQueries({ queryKey: ['player-data'] })
      }
    },
  })
}

export function useDropItem() {
  const queryClient = useQueryClient()
  const inGame = isInGame()

  return useMutation({
    mutationFn: async (itemId: number) => {
      if (inGame) {
        const result = await netMessageToServer('dropItem', { id: itemId })
        if (!result) {
          throw new Error('Drop failed')
        }
        return result
      }

      console.log('Drop item:', itemId)
      await new Promise((resolve) => setTimeout(resolve, 500))
      return true
    },
    onSuccess: () => {
      if (!inGame) {
        queryClient.invalidateQueries({ queryKey: ['player-data'] })
      }
    },
  })
}

export function useFreezeItem() {
  const queryClient = useQueryClient()
  const inGame = isInGame()

  return useMutation({
    mutationFn: async (itemId: number) => {
      if (inGame) {
        const result = await netMessageToServer('freezeActiveItem', { id: itemId })
        if (!result) {
          throw new Error('Freeze failed')
        }
        return result
      }

      console.log('Freeze item:', itemId)
      await new Promise((resolve) => setTimeout(resolve, 500))
      return true
    },
    onSuccess: () => {
      if (!inGame) {
        queryClient.invalidateQueries({ queryKey: ['player-data'] })
      }
    },
  })
}

export function useUnfreezeItem() {
  const queryClient = useQueryClient()
  const inGame = isInGame()

  return useMutation({
    mutationFn: async (itemId: number) => {
      if (inGame) {
        const result = await netMessageToServer('unfreezeActiveItem', { id: itemId })
        if (!result) {
          throw new Error('Unfreeze failed')
        }
        return result
      }

      console.log('Unfreeze item:', itemId)
      await new Promise((resolve) => setTimeout(resolve, 500))
      return true
    },
    onSuccess: () => {
      if (!inGame) {
        queryClient.invalidateQueries({ queryKey: ['player-data'] })
      }
    },
  })
}
