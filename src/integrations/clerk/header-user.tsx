import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { ProfileBadge } from '../../components/ProfileBadge'
import { SignInCta } from '../../components/SignInCta'

export default function HeaderUser() {
  return (
    <>
      <SignedIn>
        <ProfileBadge />
      </SignedIn>
      <SignedOut>
        <SignInCta className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-950 shadow transition-colors hover:bg-cyan-400">
          로그인
        </SignInCta>
      </SignedOut>
    </>
  )
}
