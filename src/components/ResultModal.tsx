import { Check, Download, RotateCcw, Share2, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { GenerationResult } from '../server/generate'

type ResultModalProps = {
  result: GenerationResult
  onClose: () => void
  onSave: () => void
  isSaving: boolean
  saveError: string | null
  saveSuccess: boolean
  onGoLibrary: () => void
  name: string
  onNameChange: (value: string) => void
  titleOverride?: string
}

export default function ResultModal({
  result,
  onClose,
  onSave,
  isSaving,
  saveError,
  saveSuccess,
  onGoLibrary,
  name,
  onNameChange,
  titleOverride,
}: ResultModalProps) {
  const [showOriginal, setShowOriginal] = useState(false)
  const generatedImage = `data:image/png;base64,${result.imageBase64}`
  const mainImageSrc = showOriginal ? result.staticUrl : generatedImage
  const mainImageAlt = showOriginal ? 'Street View' : result.locationName
  const titleText = titleOverride ?? '미니어처가 준비되었어요'

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-4xl bg-card border-white/10 p-0 overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 md:top-4 md:right-4 z-10 h-8 w-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-foreground">
                {titleText}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {result.locationName}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-secondary/50 px-3 py-1 text-xs text-muted-foreground">
              <span>{result.mode === 'gemini' ? 'Gemini Imagen 3' : 'Street View 프록시'}</span>
              <span className="text-border">•</span>
              <span>생성 완료</span>
            </div>
          </div>

          <div
            className="relative aspect-4/3 rounded-lg md:rounded-xl overflow-hidden bg-secondary select-none"
            onPointerDown={() => setShowOriginal(true)}
            onPointerUp={() => setShowOriginal(false)}
            onPointerCancel={() => setShowOriginal(false)}
            onPointerLeave={() => setShowOriginal(false)}
          >
            <img src={mainImageSrc} alt={mainImageAlt} className="w-full h-full object-cover transition-opacity duration-200" />
            <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/50 backdrop-blur px-3 py-1 text-xs font-medium text-white/80 border border-white/10">
              {showOriginal ? '원본 보기 (누르고 있는 동안)' : '미니어처'}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr,0.9fr] items-start">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">미니어처 이름</p>
              <Input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="미니어처 이름을 입력하세요"
              />
              {saveError ? (
                <p className="text-xs text-amber-200 font-medium">저장 오류: {saveError}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3 justify-end">
              {saveSuccess ? (
                <>
                  <Button className="flex-1 min-w-[140px] rounded-lg md:rounded-xl bg-linear-to-r from-primary to-accent hover:opacity-90 text-primary-foreground h-10 md:h-11 font-medium gap-2 text-sm">
                    <Check className="h-4 w-4" />
                    저장 완료!
                  </Button>
                  <Button
                    variant="secondary"
                    className="rounded-lg md:rounded-xl h-10 md:h-11 px-3 md:px-4 bg-secondary hover:bg-secondary/80 text-foreground border border-white/5"
                    onClick={onGoLibrary}
                  >
                    라이브러리로
                  </Button>
                  <Button
                    variant="ghost"
                    className="rounded-lg md:rounded-xl h-10 md:h-11 px-3 md:px-4 text-muted-foreground hover:text-foreground"
                    onClick={onClose}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className="flex-1 min-w-[140px] rounded-lg md:rounded-xl bg-linear-to-r from-primary to-accent hover:opacity-90 text-primary-foreground h-10 md:h-11 font-medium gap-2 text-sm"
                    onClick={onSave}
                    disabled={isSaving}
                  >
                    <Check className="h-4 w-4" />
                    {isSaving ? '저장 중...' : '라이브러리에 저장'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="rounded-lg md:rounded-xl h-10 md:h-11 px-3 md:px-4 bg-secondary hover:bg-secondary/80 text-foreground border border-white/5"
                    onClick={() => {
                      if (typeof document === 'undefined') return
                      const link = document.createElement('a')
                      link.href = generatedImage
                      link.download = `${result.locationName || 'miniature'}.png`
                      link.click()
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    className="rounded-lg md:rounded-xl h-10 md:h-11 px-3 md:px-4 bg-secondary hover:bg-secondary/80 text-foreground border border-white/5"
                    onClick={() => {
                      if (typeof window === 'undefined') return
                      window.open(result.staticUrl, '_blank')
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="rounded-lg md:rounded-xl h-10 md:h-11 px-3 md:px-4 text-muted-foreground hover:text-foreground"
                    onClick={onClose}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {result.error ? (
            <div className="rounded-lg border border-amber-800/60 bg-amber-900/30 px-3 py-2 text-xs text-amber-100">
              Gemini 이미지 생성에 실패하여 스냅샷만 반환했습니다. ({result.error})
            </div>
          ) : null}

        </div>
      </DialogContent>
    </Dialog>
  )
}

