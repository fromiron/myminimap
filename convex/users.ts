import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

type Identity = {
  subject: string
  name?: string
  givenName?: string
  familyName?: string
  email?: string
} & Record<string, unknown>

async function getIdentity(ctx: { auth: { getUserIdentity: () => Promise<Identity | null> } }) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Unauthorized')
  }
  return identity
}

function deriveNickname(identity: Identity, provided?: string) {
  const trimmed = (provided ?? '').trim()
  if (trimmed.length > 0) return trimmed

  return (
    identity.name ??
    (identity.givenName && identity.familyName
      ? `${identity.givenName} ${identity.familyName}`
      : undefined) ??
    (identity.givenName ?? identity.familyName) ??
    (identity.email ? identity.email.split('@')[0] : undefined) ??
    'Explorer'
  )
}

function deriveAvatar(identity: Identity) {
  const possible =
    // Common fields across providers
    (identity as { picture?: string }).picture ??
    (identity as { pictureUrl?: string }).pictureUrl ??
    (identity as { imageUrl?: string }).imageUrl ??
    (identity as { avatar?: string }).avatar ??
    (identity as { avatarUrl?: string }).avatarUrl

  return typeof possible === 'string' && possible.trim().length > 0
    ? possible.trim()
    : undefined
}

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getIdentity(ctx)

    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .first()

    return profile ?? null
  },
})

export const upsertProfile = mutation({
  args: {
    nickname: v.string(),
    isPublic: v.boolean(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await getIdentity(ctx)
    const nickname = deriveNickname(identity, args.nickname)
    const avatar = args.avatar?.trim?.()

    const existing = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        nickname,
        isPublic: args.isPublic,
        ...(avatar ? { avatar } : {}),
      })
      return existing._id
    }

    return await ctx.db.insert('userProfiles', {
      userId: identity.subject,
      nickname,
      isPublic: args.isPublic,
      ...(avatar ? { avatar } : {}),
    })
  },
})

export const ensureProfileFromIdentity = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await getIdentity(ctx)
    const avatar = deriveAvatar(identity)
    const nickname = deriveNickname(identity)

    const existing = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .first()

    if (existing) {
      const updates: Partial<Pick<typeof existing, 'nickname' | 'avatar'>> = {}
      if ((!existing.nickname || existing.nickname.trim().length === 0) && nickname) {
        updates.nickname = nickname
      }
      if ((!existing.avatar || existing.avatar.trim().length === 0) && avatar) {
        updates.avatar = avatar
      }
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existing._id, updates)
      }
      return existing._id
    }

    return await ctx.db.insert('userProfiles', {
      userId: identity.subject,
      nickname,
      isPublic: true,
      ...(avatar ? { avatar } : {}),
    })
  },
})

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getIdentity(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const saveProfileAvatar = mutation({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await getIdentity(ctx)
    const avatarUrl = await ctx.storage.getUrl(args.storageId)
    if (!avatarUrl) {
      throw new Error('업로드된 파일 URL을 가져오지 못했습니다.')
    }

    const existing = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, { avatar: avatarUrl })
      return existing._id
    }

    return await ctx.db.insert('userProfiles', {
      userId: identity.subject,
      nickname: deriveNickname(identity),
      isPublic: true,
      avatar: avatarUrl,
    })
  },
})

