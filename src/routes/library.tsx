import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  Clock3,
  Compass,
  Lock,
  MapPin,
  Sparkles,
} from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { SignInCta } from '../components/SignInCta'

export const Route = createFileRoute('/library')({
  component: LibraryPage,
})

function LibraryPage() {
  const miniatures = useQuery(api.miniatures.listMine)
  const isLoading = miniatures === undefined

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
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
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <section className="space-y-4">
              {isLoading ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-lg">
                  <p className="text-sm text-slate-300">불러오는 중...</p>
                </div>
              ) : miniatures && miniatures.length > 0 ? (
                <LibraryPreviewGrid items={miniatures} />
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-lg">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-cyan-200/80">
                        Empty State
                      </p>
                      <h2 className="text-xl font-semibold">아직 저장된 미니어처가 없어요</h2>
                      <p className="mt-1 text-sm text-slate-300">
                        홈에서 생성 후 &quot;Save to Library&quot;를 누르면 최신순으로 여기에 나타납니다.
                      </p>
                    </div>
                    <Link
                      to="/"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
                    >
                      지금 생성하러 가기
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-lg">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-200/80">
                  <Compass className="h-4 w-4" />
                  Library Flow
                </div>
                <ul className="mt-3 space-y-3 text-sm text-slate-200">
                  <li className="flex items-start gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    Street View 각도(heading, pitch, fov)는 URL 파라미터에 저장되어 동일한 뷰로 복원됩니다.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    Convex Mutation에서 사용자 ID로 안전하게 저장하며, createdAt 역순으로 정렬합니다.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    카드의 &quot;위치로 이동&quot; 링크를 누르면 홈 지도 뷰가 즉시 재설정됩니다.
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-cyan-200/80">
                      Save & Sync
                    </p>
                    <h3 className="text-lg font-semibold">다음 단계 미리보기</h3>
                  </div>
                  <Sparkles className="h-5 w-5 text-cyan-300" />
                </div>
                <div className="mt-3 grid gap-3 text-sm text-slate-200">
                  <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-3">
                    <p className="font-semibold">Auth 보호</p>
                    <p className="text-slate-300">
                      Clerk 로그인 상태에서만 /library 접근이 가능하도록 라우팅 가드를 확장할 예정입니다.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-3">
                    <p className="font-semibold">Gemini 결과 저장</p>
                    <p className="text-slate-300">
                      이미지 URL, 위치명, 좌표/각도, 타임스탬프를 Convex에 보관해 실시간 갱신을 지원합니다.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-3">
                    <p className="font-semibold">카드 액션</p>
                    <p className="text-slate-300">
                      저장된 카드에서 모달로 확대하고 &quot;Visit Location&quot;을 통해 홈 뷰 복원 기능을 제공합니다.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </SignedIn>
      </div>
    </div>
  )
}

type MiniatureItem = Awaited<ReturnType<typeof api.miniatures.listMine>>[number]

type LibraryPreviewGridProps = {
  items: MiniatureItem[]
}

function LibraryPreviewGrid({ items }: LibraryPreviewGridProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-cyan-200/80">샘플 프리뷰</p>
          <h3 className="text-lg font-semibold">내가 저장한 미니어처</h3>
          <p className="text-sm text-slate-300">최신순으로 정렬됩니다.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <LibraryCard key={item._id} item={item} />
        ))}
      </div>
    </div>
  )
}

type LibraryCardProps = {
  item: MiniatureItem
}

function LibraryCard({ item }: LibraryCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 shadow-md transition hover:-translate-y-1 hover:border-cyan-500/60 hover:shadow-cyan-500/20">
      <div className="h-36 w-full bg-slate-900/60">
        <img src={item.imageUrl} alt={item.locationName} className="h-full w-full object-cover" />
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-200/80">
            <MapPin className="h-4 w-4" />
            {item.locationName}
          </div>
          <h4 className="text-lg font-semibold">{new Date(item._creationTime).toLocaleString()}</h4>
          <p className="text-sm text-slate-300 line-clamp-2">{item.prompt}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-slate-200">
          <AngleBadge label="Heading" value={`${item.heading}°`} />
          <AngleBadge label="Pitch" value={`${item.pitch}°`} />
          <AngleBadge label="FOV" value={`${item.fov}°`} />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-800 px-2 py-1 font-semibold text-emerald-200">
            <Clock3 className="h-3.5 w-3.5" />
            저장됨
          </div>
          <Link
            to="/"
            search={() => ({
              lat: item.lat,
              lng: item.lng,
              heading: item.heading,
              pitch: item.pitch,
              fov: item.fov,
            })}
            className="inline-flex items-center gap-1 font-semibold text-cyan-200 transition hover:text-cyan-100"
          >
            위치로 이동
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
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
    <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-2 py-2 text-center shadow-inner">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-100">{value}</p>
    </div>
  )
}
