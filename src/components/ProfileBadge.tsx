import { useClerk } from '@clerk/clerk-react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo } from 'react'
import { api } from '../../convex/_generated/api'

export function ProfileBadge() {
    const profile = useQuery(api.users.getMyProfile)
    const ensureProfile = useMutation(api.users.ensureProfileFromIdentity)
    const { signOut } = useClerk()

    const label = useMemo(() => {
        if (profile === undefined) return '불러오는 중...'
    const trimmed = profile?.nickname?.trim()
    return trimmed && trimmed.length > 0 ? trimmed : 'UPDATE NICKNAME'
    }, [profile])

    useEffect(() => {
        if (profile === undefined) return
    if (profile === null || !profile.avatar || !profile.nickname) {
            void ensureProfile({})
        }
    }, [profile, ensureProfile])

    const handleSignOut = () => {
        void signOut({ redirectUrl: '/' })
    }

    return (
        <div className="flex items-center gap-3">
            <div className="h-8 w-8 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
                {profile?.avatar ? (
                    <img
                        src={profile.avatar}
                        alt="avatar"
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-200">
                        {label?.[0]?.toUpperCase?.() ?? 'E'}
                    </div>
                )}
            </div>
            <Link
                to="/me"
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-400 hover:text-cyan-100"
            >
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                <span className="max-w-[140px] truncate">{label}</span>
            </Link>
            <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition-colors hover:border-rose-400 hover:text-rose-100"
            >
                로그아웃
            </button>
        </div>
    )
}

