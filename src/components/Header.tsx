import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { Link } from '@tanstack/react-router'
import { MapPinned } from 'lucide-react'
import { ProfileBadge } from './ProfileBadge'
import { SignInCta } from './SignInCta'

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-semibold text-slate-100"
        >
          <MapPinned className="h-5 w-5 text-cyan-400" />
          <span>MyMiniMap</span>
        </Link>

        <div className="flex items-center gap-3">
          <SignedIn>
            <Link
              to="/library"
              className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/20"
            >
              My Library
            </Link>
            <ProfileBadge />
          </SignedIn>

          <SignedOut>
            <SignInCta className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-950 shadow transition-colors hover:bg-cyan-400">
              Login
            </SignInCta>
          </SignedOut>
        </div>
      </div>
    </header>
  )
}
