import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { MutationCtx } from './_generated/server'

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

const NICKNAME_REGEX = /^[\p{L}\p{N}._-]+$/u

const codePointLength = (value: string) => [...value].length

function normalizeNickname(nickname: string) {
  return nickname.trim().normalize('NFKC').toLocaleLowerCase()
}

function isNicknameValid(nickname: string) {
  const trimmed = nickname.trim().normalize('NFKC')
  const length = codePointLength(trimmed)
  if (length < 3 || length > 10) return false
  return NICKNAME_REGEX.test(trimmed)
}

function sanitizeAutoNickname(base?: string) {
  if (!base) return undefined
  const normalized = base.normalize('NFKC')
  const cleaned = normalized
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}._-]+/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  const sliced = [...cleaned].slice(0, 10).join('')
  if (codePointLength(sliced) < 3) return undefined
  if (!isNicknameValid(sliced)) return undefined
  return sliced
}

function candidateFromIdentity(identity: Identity) {
  return (
    identity.name ??
    (identity.givenName && identity.familyName
      ? `${identity.givenName}_${identity.familyName}`
      : undefined) ??
    (identity.givenName ?? identity.familyName) ??
    (identity.email ? identity.email.split('@')[0] : undefined) ??
    'Explorer'
  )
}

function deriveNickname(identity: Identity, provided?: string) {
  const trimmed = (provided ?? '').trim()
  if (trimmed.length > 0) return trimmed

  return candidateFromIdentity(identity)
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

async function ensureUniqueNickname(
  ctx: {
    db: MutationCtx['db']
  },
  nickname: string | undefined,
  userId: string,
  { soft }: { soft: boolean },
) {
  if (!nickname) {
    return { nickname: undefined as string | undefined, nicknameNormalized: undefined as string | undefined }
  }

  if (!isNicknameValid(nickname)) {
    if (soft) {
      return { nickname: undefined as string | undefined, nicknameNormalized: undefined as string | undefined }
    }
    throw new Error('닉네임은 3~10자, 한글/일본어/라틴 문자/숫자와 ._- 만 사용할 수 있습니다.')
  }

  const nicknameNormalized = normalizeNickname(nickname)
  const existing = await ctx.db
    .query('userProfiles')
    .withIndex('by_nickname_norm', (q) => q.eq('nicknameNormalized', nicknameNormalized))
    .first()

  const fallback =
    existing ??
    (await ctx.db
      .query('userProfiles')
      .collect()
      .then((docs: any[]) =>
        docs.find(
          (doc) =>
            doc.userId !== userId &&
            doc.nickname &&
            normalizeNickname(doc.nickname) === nicknameNormalized,
        ),
      ))

  if (fallback && fallback.userId !== userId) {
    if (soft) {
      return { nickname: undefined as string | undefined, nicknameNormalized: undefined as string | undefined }
    }
    throw new Error('이미 사용 중인 닉네임입니다.')
  }

  return { nickname, nicknameNormalized }
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
    const requested = args.nickname.trim()
    const avatar = args.avatar?.trim?.()

    if (requested.length === 0) {
      throw new Error('닉네임을 입력하세요.')
    }

    const { nickname, nicknameNormalized } = await ensureUniqueNickname(
      ctx,
      requested.length > 0 ? requested : undefined,
      identity.subject,
      { soft: false },
    )

    const existing = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        nickname,
        nicknameNormalized,
        isPublic: args.isPublic,
        ...(avatar ? { avatar } : {}),
      })
      return existing._id
    }

    return await ctx.db.insert('userProfiles', {
      userId: identity.subject,
      nickname,
      nicknameNormalized,
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
    const candidate = sanitizeAutoNickname(deriveNickname(identity))
    const { nickname, nicknameNormalized } = await ensureUniqueNickname(ctx, candidate, identity.subject, {
      soft: true,
    })

    const existing = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .first()

    if (existing) {
      const updates: Partial<Pick<typeof existing, 'nickname' | 'nicknameNormalized' | 'avatar'>> = {}
      if ((!existing.nickname || existing.nickname.trim().length === 0) && nickname) {
        updates.nickname = nickname
        updates.nicknameNormalized = nicknameNormalized
      }
      if ((!existing.avatar || existing.avatar.trim().length === 0) && avatar) {
        updates.avatar = avatar
      }
      if (!existing.nicknameNormalized && existing.nickname) {
        updates.nicknameNormalized = normalizeNickname(existing.nickname)
      }
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existing._id, updates)
      }
      return existing._id
    }

    return await ctx.db.insert('userProfiles', {
      userId: identity.subject,
      nickname,
      nicknameNormalized,
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

    const candidate = sanitizeAutoNickname(deriveNickname(identity))
    const { nickname, nicknameNormalized } = await ensureUniqueNickname(ctx, candidate, identity.subject, {
      soft: true,
    })

    return await ctx.db.insert('userProfiles', {
      userId: identity.subject,
      nickname,
      nicknameNormalized,
      isPublic: true,
      avatar: avatarUrl,
    })
  },
})

