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
    userId: v.string(),
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
  }).index('by_user', ['userId']),
})
