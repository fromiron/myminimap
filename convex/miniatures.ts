import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

const roundPose = (value: number) => Math.round(value * 1_000_000) / 1_000_000

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
    name: v.optional(v.string()),
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
          .eq('lat', roundPose(args.lat))
          .eq('lng', roundPose(args.lng))
          .eq('heading', roundPose(args.heading))
          .eq('pitch', roundPose(args.pitch))
          .eq('fov', roundPose(args.fov)),
      )
      .first()

    const miniatureId =
      existing?._id ??
      (await ctx.db.insert('miniatures', {
        locationName: args.locationName,
        lat: roundPose(args.lat),
        lng: roundPose(args.lng),
        heading: roundPose(args.heading),
        pitch: roundPose(args.pitch),
        fov: roundPose(args.fov),
        imageUrl: args.imageUrl,
        prompt: args.prompt,
        mode: args.mode,
        createdBy: identity.subject,
      }))

    // createdBy가 비어있는 기존 레코드면 채워줌
    if (existing?._id && !existing.createdBy) {
      await ctx.db.patch(existing._id, { createdBy: identity.subject })
    }

    // 2) 사용자-미니어처 관계 upsert (n:n)
    const link = await ctx.db
      .query('userMiniatures')
      .withIndex('by_user_miniature', (q) =>
        q.eq('userId', identity.subject).eq('miniatureId', miniatureId),
      )
      .first()

    const desiredName = args.name ?? args.locationName

    if (!link) {
      await ctx.db.insert('userMiniatures', {
        userId: identity.subject,
        miniatureId,
        name: desiredName,
      })
    } else if (desiredName && link.name !== desiredName) {
      await ctx.db.patch(link._id, { name: desiredName })
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
          name: links[idx].name ?? mini.locationName,
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
        name?: string
      }>

    // 프로필 조회 (생성자)
    const creatorIds = Array.from(
      new Set(
        hydrated
          .map((item) => (item as { createdBy?: string } | null)?.createdBy)
          .filter((id): id is string => Boolean(id)),
      ),
    )

    const creatorProfiles = await Promise.all(
      creatorIds.map(async (userId) => {
        const profile = await ctx.db
          .query('userProfiles')
          .withIndex('by_user', (q) => q.eq('userId', userId))
          .first()
        return { userId, profile }
      }),
    )
    const profileMap = new Map(
      creatorProfiles.map(({ userId, profile }) => [userId, profile]),
    )

    return hydrated
      .map((item, idx) => {
        const createdBy = (item as { createdBy?: string }).createdBy
        const profile = createdBy ? profileMap.get(createdBy) : undefined
        return {
          ...(item as {
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
            createdBy?: string
          }),
          name: links[idx].name ?? item.locationName,
          createdBy,
          creatorProfile: profile
            ? {
                nickname: profile.nickname ?? undefined,
                avatar: profile.avatar ?? undefined,
                isPublic: profile.isPublic,
              }
            : undefined,
        }
      })
      .sort((a, b) => b.linkCreatedAt - a.linkCreatedAt)
  },
})

export const getByPose = query({
  args: {
    lat: v.number(),
    lng: v.number(),
    heading: v.number(),
    pitch: v.number(),
    fov: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('miniatures')
      .withIndex('by_pose', (q) =>
        q
          .eq('lat', roundPose(args.lat))
          .eq('lng', roundPose(args.lng))
          .eq('heading', roundPose(args.heading))
          .eq('pitch', roundPose(args.pitch))
          .eq('fov', roundPose(args.fov)),
      )
      .first()

    if (!existing) return null

    return {
      _id: existing._id,
      _creationTime: existing._creationTime,
      locationName: existing.locationName,
      lat: existing.lat,
      lng: existing.lng,
      heading: existing.heading,
      pitch: existing.pitch,
      fov: existing.fov,
      imageUrl: existing.imageUrl,
      prompt: existing.prompt,
      mode: existing.mode,
      createdBy: existing.createdBy,
    }
  },
})

