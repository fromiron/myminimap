import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const save = mutation({
  args: {
    locationName: v.string(),
    lat: v.number(),
    lng: v.number(),
    heading: v.number(),
    pitch: v.number(),
    fov: v.number(),
    imageUrl: v.string(),
    prompt: v.string(),
    mode: v.union(v.literal('gemini'), v.literal('passthrough'), v.literal('vertex')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    console.log('[miniatures.save] identity', identity)
    if (!identity) {
      throw new Error('Unauthorized')
    }

    const doc = await ctx.db.insert('miniatures', {
      userId: identity.subject,
      locationName: args.locationName,
      lat: args.lat,
      lng: args.lng,
      heading: args.heading,
      pitch: args.pitch,
      fov: args.fov,
      imageUrl: args.imageUrl,
      prompt: args.prompt,
      mode: args.mode,
    })

    return doc
  },
})

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    console.log('[miniatures.listMine] identity', identity)
    if (!identity) {
      throw new Error('Unauthorized')
    }

    const items = await ctx.db
      .query('miniatures')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect()

    return items.sort((a, b) => b._creationTime - a._creationTime)
  },
})

