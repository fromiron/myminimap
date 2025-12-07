'use client'

import { Sparkles } from 'lucide-react'

export function GeneratingOverlay() {
    return (
        <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-md flex items-center justify-center">
            <div className="text-center space-y-6 md:space-y-8 px-4">
                <div className="relative">
                    <div className="h-16 w-16 md:h-24 md:w-24 mx-auto rounded-xl md:rounded-2xl bg-linear-to-br from-primary/20 to-accent/20 border border-white/10 flex items-center justify-center overflow-hidden">
                        <div
                            className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent"
                            style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s ease-in-out infinite' }}
                        />
                        <Sparkles className="h-7 w-7 md:h-10 md:w-10 text-primary animate-pulse relative z-10" />
                    </div>
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-primary" />
                    </div>
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }}>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-accent" />
                    </div>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                    <h3 className="text-base md:text-lg font-medium text-foreground">미니어처 생성 중</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">장면을 토이 월드로 변환하고 있어요...</p>
                </div>

                <div className="w-36 md:w-48 mx-auto">
                    <div className="h-1 rounded-full bg-secondary overflow-hidden">
                        <div
                            className="h-full rounded-full bg-linear-to-r from-primary to-accent"
                            style={{ animation: 'progress 2.5s ease-in-out infinite' }}
                        />
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
      `}</style>
        </div>
    )
}

