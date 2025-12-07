import { useClerk } from '@clerk/clerk-react'
import type { ReactNode } from 'react'
import { useCallback } from 'react'

type SignInCtaProps = {
  children: ReactNode
  className?: string
  redirectUrl?: string
}

export function SignInCta({ children, className, redirectUrl }: SignInCtaProps) {
  const { openSignIn } = useClerk()

  const handleClick = useCallback(() => {
    const target =
      redirectUrl ?? (typeof window !== 'undefined' ? window.location.href : undefined)
    void openSignIn({ redirectUrl: target })
  }, [openSignIn, redirectUrl])

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  )
}

