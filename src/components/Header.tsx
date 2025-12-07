import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Home, Library, Menu, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

import { ProfileBadge } from './ProfileBadge'
import { SignInCta } from './SignInCta'

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  const navItems = useMemo(
    () => [
      { id: 'home', to: '/', label: 'Home', icon: Home },
      { id: 'library', to: '/library', label: 'Library', icon: Library },
    ],
    [],
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="relative h-8 w-8 rounded-lg bg-linear-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            MyMiniMap
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
          {navItems.map(({ id, to, icon: Icon, label }) => {
            const active = pathname === to
            return (
              <Link
                key={id}
                to={to}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <SignedIn>
            <div className="hidden md:flex items-center gap-3">
              <ProfileBadge />
            </div>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 bg-card border-white/10 p-0">
                <div className="flex items-center gap-3 p-4 border-b border-white/5">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                    <AvatarImage src="/cute-avatar.png" alt="User" />
                    <AvatarFallback className="bg-linear-to-br from-primary to-accent text-primary-foreground text-xs font-medium">
                      MM
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">MyMiniMap</span>
                </div>
                <div className="flex flex-col p-4 pt-6 gap-2">
                  {navItems.map(({ id, to, icon: Icon, label }) => {
                    const active = pathname === to
                    return (
                      <Link
                        key={id}
                        to={to}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                          }`}
                        onClick={() => setMobileOpen(false)}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{label}</span>
                      </Link>
                    )
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </SignedIn>

          <SignedOut>
            <div className="hidden md:flex">
              <SignInCta className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow transition-colors hover:opacity-90">
                Login
              </SignInCta>
            </div>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 bg-card border-white/10 p-0">
                <div className="p-5 pt-12">
                  <p className="text-sm text-muted-foreground mb-3">
                    로그인하고 미니어처를 저장하세요.
                  </p>
                  <SignInCta className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-colors hover:opacity-90">
                    로그인
                  </SignInCta>
                </div>
              </SheetContent>
            </Sheet>
          </SignedOut>
        </div>
      </div>
    </header>
  )
}
