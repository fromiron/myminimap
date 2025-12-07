import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  products: defineTable({
    title: v.string(),
    imageId: v.string(),
    price: v.number(),
  }),
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
  miniatures: defineTable({
    locationName: v.string(),
    lat: v.number(),
    lng: v.number(),
    heading: v.number(),
    pitch: v.number(),
    fov: v.number(),
    imageUrl: v.string(),
    prompt: v.string(),
    mode: v.union(
      v.literal('vertex'),
      v.literal('gemini'),
      v.literal('passthrough'),
      v.literal('vertex'),
    ),
  })
    .index('by_pose', ['lat', 'lng', 'heading', 'pitch', 'fov']),
  userMiniatures: defineTable({
    userId: v.string(),
    miniatureId: v.id('miniatures'),
  })
    .index('by_user', ['userId'])
    .index('by_miniature', ['miniatureId'])
    .index('by_user_miniature', ['userId', 'miniatureId']),
  userProfiles: defineTable({
    userId: v.string(),
    nickname: v.string(),
    isPublic: v.boolean(),
    avatar: v.optional(v.string()),
  }).index('by_user', ['userId']),
})
