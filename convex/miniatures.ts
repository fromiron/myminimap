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

    // 1) 동일 pose 미니어처가 있는지 조회 (lat,lng,heading,pitch,fov)
    const existing = await ctx.db
      .query('miniatures')
      .withIndex('by_pose', (q) =>
        q
          .eq('lat', args.lat)
          .eq('lng', args.lng)
          .eq('heading', args.heading)
          .eq('pitch', args.pitch)
          .eq('fov', args.fov),
      )
      .first()

    const miniatureId =
      existing?._id ??
      (await ctx.db.insert('miniatures', {
        locationName: args.locationName,
        lat: args.lat,
        lng: args.lng,
        heading: args.heading,
        pitch: args.pitch,
        fov: args.fov,
        imageUrl: args.imageUrl,
        prompt: args.prompt,
        mode: args.mode,
      }))

    // 2) 사용자-미니어처 관계 upsert (n:n)
    const link = await ctx.db
      .query('userMiniatures')
      .withIndex('by_user_miniature', (q) =>
        q.eq('userId', identity.subject).eq('miniatureId', miniatureId),
      )
      .first()

    if (!link) {
      await ctx.db.insert('userMiniatures', {
        userId: identity.subject,
        miniatureId,
      })
    }

    return miniatureId
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

    const links = await ctx.db
      .query('userMiniatures')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect()

    const miniatures = await Promise.all(
      links.map((link) => ctx.db.get(link.miniatureId)),
    )

    const hydrated = miniatures
      .map((mini, idx) => {
        if (!mini) return null
        return {
          ...mini,
          _id: mini._id,
          _creationTime: mini._creationTime,
          linkCreatedAt: links[idx]._creationTime,
        }
      })
      .filter(Boolean) as Array<{
      _id: string
      _creationTime: number
      locationName: string
      lat: number
      lng: number
      heading: number
      pitch: number
      fov: number
      imageUrl: string
      prompt: string
      mode: string
      linkCreatedAt: number
    }>

    return hydrated.sort((a, b) => b.linkCreatedAt - a.linkCreatedAt)
  },
})

