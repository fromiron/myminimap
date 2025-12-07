import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useConvex, useConvexAuth } from 'convex/react'
import {
  ArrowUpRight,
  Clock3,
  Compass,
  Grid3X3,
  LayoutGrid,
  Lock,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import { SignInCta } from '../components/SignInCta'
import { Button } from '../components/ui/button'

export const Route = createFileRoute('/library')({
  component: LibraryPage,
})

function LibraryPage() {
  const convex = useConvex()
  const { isAuthenticated } = useConvexAuth()
  const { data: miniatures, isLoading } = useQuery({
    queryKey: ['miniatures', 'mine'],
    queryFn: () => convex.query(api.miniatures.listMine, {}),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid')

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-100">
              <Sparkles className="h-4 w-4" />
              Phase 5 · My Library
            </div>
            <div>
              <h1 className="text-3xl font-bold">나의 미니어처 보관함</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                생성한 결과물을 저장·정렬하고 언제든 다시 지도로 이동해 동일한 뷰로 복원할
                수 있도록 디자인했습니다. 현재는 UI 프리뷰이며 Convex 연동 시 최신순으로
                채워집니다.
              </p>
            </div>
          </div>
          <Link
            to="/"
            className="group inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
          >
            지도에서 만들기
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </header>

        <SignedOut>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
                <Lock className="h-5 w-5 text-slate-200" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">로그인이 필요합니다</h2>
                <p className="text-sm text-slate-300">
                  Google OAuth(Clerk)로 로그인하면 저장한 미니어처를 볼 수 있어요. 이후
                  Convex에서 사용자별로 정렬된 보관함을 제공합니다.
                </p>
                <SignInCta className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
                  지금 로그인
                  <ArrowUpRight className="h-4 w-4" />
                </SignInCta>
              </div>
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/50 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'grid'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('compact')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'compact'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-2xl border border-white/10 bg-card/80 p-5 shadow-lg backdrop-blur">
                <p className="text-sm text-muted-foreground">불러오는 중...</p>
              </div>
            ) : miniatures && miniatures.length > 0 ? (
              <LibraryPreviewGrid items={miniatures} viewMode={viewMode} />
            ) : (
              <div className="rounded-2xl border border-white/10 bg-card/80 p-5 shadow-lg backdrop-blur">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Empty State
                    </p>
                    <h2 className="text-xl font-semibold text-foreground">아직 저장된 미니어처가 없어요</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      홈에서 생성 후 "Save to Library"를 누르면 최신순으로 여기에 나타납니다.
                    </p>
                  </div>
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
                  >
                    지금 생성하러 가기
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </section>
        </SignedIn>
      </div>
    </div>
  )
}

type MiniatureItem = {
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
  createdBy?: string
  creatorProfile?: {
    nickname?: string | null
    avatar?: string | null
    isPublic?: boolean
  }
}

type LibraryPreviewGridProps = {
  items: MiniatureItem[]
  viewMode: 'grid' | 'compact'
}

function LibraryPreviewGrid({ items, viewMode }: LibraryPreviewGridProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/80 p-5 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">샘플 프리뷰</p>
          <h3 className="text-lg font-semibold text-foreground">내가 저장한 미니어처</h3>
          <p className="text-sm text-muted-foreground">최신순으로 정렬됩니다.</p>
        </div>
      </div>

      <div
        className={`mt-4 grid gap-3 md:gap-4 ${viewMode === 'grid'
          ? 'grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          }`}
      >
        {items.map((item) => (
          <LibraryCard key={item._id} item={item} compact={viewMode === 'compact'} />
        ))}
      </div>
    </div>
  )
}

type LibraryCardProps = {
  item: MiniatureItem
  compact?: boolean
}

function LibraryCard({ item, compact }: LibraryCardProps) {
  const visitSearch = {
    lat: item.lat,
    lng: item.lng,
    heading: item.heading,
    pitch: item.pitch,
    fov: item.fov,
  }
  const modeConfig: Record<string, { label: string; color: string; bg: string }> = {
    gemini: { label: 'Gemini', color: 'text-cyan-200', bg: 'bg-cyan-500/15' },
    passthrough: { label: 'Snapshot', color: 'text-amber-200', bg: 'bg-amber-500/15' },
    vertex: { label: 'Vertex', color: 'text-emerald-200', bg: 'bg-emerald-500/15' },
    default: { label: 'Snapshot', color: 'text-amber-200', bg: 'bg-amber-500/15' },
  }
  const { label: modeLabel, color: modeColor, bg: modeBg } =
    modeConfig[item.mode] ?? modeConfig.default
  const aspectClass = compact ? 'aspect-square' : 'aspect-[4/3]'
  const displayName = item.name?.trim() ? item.name : item.locationName
  const creatorNickname = item.creatorProfile?.nickname?.trim()
  const creatorPublic = item.creatorProfile?.isPublic
  const creatorAvatar = item.creatorProfile?.avatar ?? undefined
  const creatorLabel = creatorPublic && creatorNickname ? creatorNickname : '비공개 유저'
  const createdText = `${creatorLabel}가 ${new Date(item._creationTime).toLocaleString()}에 생성했습니다.`

  return (
    <div className="group relative bg-card rounded-xl overflow-hidden border border-white/5 hover:border-white/10 transition-all duration-300 hover:shadow-xl hover:shadow-black/20">
      <div className={`relative overflow-hidden ${aspectClass}`}>
        <img
          src={item.imageUrl}
          alt={displayName}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
        <div
          className={`absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full ${modeBg} backdrop-blur-md border border-white/10`}
        >
          <span className={`text-xs font-medium ${modeColor}`}>{modeLabel}</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-semibold text-white truncate">{displayName}</h3>
          <p className="text-xs text-white/70 mt-0.5">
            {new Date(item._creationTime).toLocaleString()}
          </p>
        </div>
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-1">
            <Link
              to="/"
              search={() => visitSearch}
              className="h-8 w-8 rounded-full bg-black/40 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/60 border border-white/10 inline-flex items-center justify-center"
              title="위치로 이동"
            >
              <Compass className="h-3.5 w-3.5" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-black/40 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/60 border border-white/10"
              title="More"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {creatorPublic && creatorAvatar ? (
            <span className="inline-flex h-7 w-7 overflow-hidden rounded-full border border-white/10">
              <img src={creatorAvatar} alt={creatorLabel} className="h-full w-full object-cover" />
            </span>
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-secondary text-xs font-semibold text-muted-foreground">
              ?
            </span>
          )}
          <span className="line-clamp-2">{createdText}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-foreground">
          <AngleBadge label="Heading" value={`${item.heading}°`} />
          <AngleBadge label="Pitch" value={`${item.pitch}°`} />
          <AngleBadge label="FOV" value={`${item.fov}°`} />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="h-4 w-4" />
          <span>저장됨</span>
        </div>
      </div>
    </div>
  )
}

type AngleBadgeProps = {
  label: string
  value: string
}

function AngleBadge({ label, value }: AngleBadgeProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-secondary/60 px-2 py-2 text-center shadow-inner">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground truncate" title={value}>
        {value}
      </p>
    </div>
  )
}
