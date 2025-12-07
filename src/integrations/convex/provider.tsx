import { useAuth } from '@clerk/clerk-react'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { useMemo } from 'react'

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined

export default function AppConvexProvider({
  children,
}: {
  children: React.ReactNode
}) {
  console.log('[ConvexProvider] VITE_CONVEX_URL', CONVEX_URL)
  const convexClient = useMemo(
    () => (CONVEX_URL ? new ConvexReactClient(CONVEX_URL) : null),
    [],
  )

  if (!CONVEX_URL || !convexClient) {
    console.error('missing envar VITE_CONVEX_URL')
    // Convex가 아직 설정되지 않아도 UI는 렌더되도록 pass-through
    return <>{children}</>
  }

  return (
    <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  )
}
