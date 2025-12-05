import { SignedIn, SignedOut, SignInButton } from '@clerk/clerk-react'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/library')({
  component: LibraryPage,
})

function LibraryPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 text-slate-100">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Phase 5 Preview
            </p>
            <h1 className="text-2xl font-bold">My Library</h1>
            <p className="mt-2 text-sm text-slate-300">
              생성한 미니어처 결과가 여기에 정렬됩니다. 로그인 상태에서만 접근할 수
              있도록 라우팅이 준비되어 있습니다.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <SignedOut>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200">
              라이브러리를 보려면 로그인이 필요합니다.{' '}
              <SignInButton mode="modal">
                <button className="rounded-full bg-cyan-500 px-3 py-1 font-semibold text-slate-950 transition-colors hover:bg-cyan-400">
                  로그인
                </button>
              </SignInButton>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200">
              저장된 미니어처가 아직 없습니다. 홈에서 생성 후 저장하면 이곳에 최신순으로
              채워집니다. <Link to="/" className="text-cyan-300 underline">지도에서 만들기</Link>
            </div>
          </SignedIn>
        </div>
      </div>
    </div>
  )
}
