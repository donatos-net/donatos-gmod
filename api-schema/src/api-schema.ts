import { z } from 'zod'

export const serverApiSchema = {
  'server:get-config': {
    input: z.void(),
    output: z.object({
      name: z.string(),
      updatedAt: z.date(),
      payUrl: z.string(),
      goods: z
        .object({
          id: z.number(),
          name: z.string(),
          order: z.number().optional(),
          category: z.string().optional(),
          categoryId: z.number().optional(),
          key: z.string(),
          description: z.string().optional(),
          variants: z
            .object({
              id: z.string(),
              price: z.number(),
              duration: z.number().optional(),
            })
            .array()
            .optional(),
        })
        .array(),
      goodsCategories: z
        .object({
          id: z.number(),
          name: z.string(),
        })
        .array(),
    }),
  },
  'server:get-updates': {
    input: z.object({
      since: z.string().optional(),
      playerIds: z.number().array().max(128),
    }),
    output: z.object({
      ts: z.string(),
      server: z.object({
        updatedAt: z.string(),
      }),
      updatedPlayers: z
        .object({
          id: z.number(),
          externalId: z.string(),
          updatedAt: z.string(),
        })
        .array(),
      newOrders: z
        .object({
          id: z.number(),
          playerId: z.number(),
          playerExternalId: z.string(),
          playerName: z.string().optional(),
          total: z.string(),
          status: z.enum(['PENDING', 'SUCCEEDED', 'CANCELED', 'REFUNDED']),
        })
        .array(),
    }),
  },
  'server:get-player': {
    input: z.object({
      playerExternalId: z.string(),
      setName: z
        .string()
        .transform((s) => s.slice(0, 32))
        .optional(),
    }),
    output: z
      .object({
        player: z.object({
          id: z.number(),
          externalId: z.string(),
          balance: z.number(),
        }),
        inventoryItems: z
          .object({
            id: z.number(),
            goodsId: z.number().optional(),
            goods: z
              .object({
                name: z.string(),
                description: z.string().optional(),
              })
              .optional(),
            variantId: z.string().optional(),
            variant: z
              .object({
                id: z.string(),
                price: z.number(),
                duration: z.number().optional(),
              })
              .optional(),
            amountPaid: z.string().optional(),
          })
          .array(),
        activeItems: z
          .object({
            id: z.number(),
            key: z.string(),
            name: z.string(),
            activatedAt: z.number(),
            expires: z
              .object({
                at: z.number(),
                in: z.string(),
                inS: z.number(),
                durationS: z.number(),
              })
              .optional(),
          })
          .array(),
      })
      .optional(),
  },
  'player:purchase-goods': {
    input: z.object({
      playerId: z.number(),
      goodsId: z.number(),
      variantId: z.string(),
      expectedPrice: z.number().optional(),
    }),
    output: z.object({
      item: z.object({ id: z.number() }),
      goods: z.object({
        id: z.number(),
        name: z.string(),
      }),
    }),
  },
  'player:activate-item': {
    input: z.object({
      playerId: z.number(),
      itemId: z.number(),
    }),
    output: z.object({
      goods: z.object({
        id: z.number(),
        key: z.string(),
        name: z.string(),
      }),
      variant: z.object({
        duration: z.number().optional(),
        price: z.number().optional(),
      }),
    }),
  },
  'player:drop-item': {
    input: z.object({
      playerId: z.number(),
      itemId: z.number(),
    }),
    output: z.object({
      token: z.string(),
      item: z.object({
        id: z.number(),
        name: z.string(),
        variant: z.object({ id: z.string(), price: z.number(), duration: z.number().optional() }).optional(),
      }),
    }),
  },
  'player:claim-item': {
    input: z.object({
      playerExternalId: z.string(),
      itemId: z.number(),
      token: z.string().min(1),
    }),
    output: z.boolean(),
  },
} satisfies Record<string, { input: z.Schema; output: z.Schema }>
