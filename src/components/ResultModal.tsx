import type { GenerationResult } from '../server/generate'

type ResultModalProps = {
  result: GenerationResult
  onClose: () => void
  onSave: () => void
  isSaving: boolean
  saveError: string | null
  saveSuccess: boolean
  onGoLibrary: () => void
}

export default function ResultModal({
  result,
  onClose,
  onSave,
  isSaving,
  saveError,
  saveSuccess,
  onGoLibrary,
}: ResultModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
        >
          닫기
        </button>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <img
              src={`data:image/png;base64,${result.imageBase64}`}
              alt={result.locationName}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Location
              </p>
              <p className="text-lg font-semibold text-slate-100">
                {result.locationName}
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-200">
              <p className="mb-2 font-semibold text-slate-100">Prompt</p>
              <p className="leading-relaxed">{result.prompt}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="rounded-full bg-slate-800 px-3 py-1 font-semibold text-cyan-200">
                {result.mode === 'gemini' ? 'Gemini Imagen 3' : 'Street View 프록시'}
              </span>
              <a
                href={result.staticUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-700 px-3 py-1 font-semibold text-slate-100 hover:border-cyan-400 hover:text-cyan-200"
              >
                원본 캡처 보기
              </a>
            </div>
            {result.error ? (
              <div className="rounded-lg border border-amber-800/60 bg-amber-900/30 px-3 py-2 text-xs text-amber-100">
                Gemini 이미지 생성에 실패하여 스냅샷만 반환했습니다. ({result.error})
              </div>
            ) : null}
            {saveSuccess ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200">
                  저장 완료! 🎉
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-slate-700 px-4 py-2 font-semibold text-slate-100 transition hover:border-cyan-400 hover:text-cyan-200"
                >
                  모달 닫기
                </button>
                <button
                  type="button"
                  onClick={onGoLibrary}
                  className="rounded-full bg-cyan-500 px-4 py-2 font-semibold text-slate-950 shadow transition-colors hover:bg-cyan-400"
                >
                  마이라이브러리에서 확인
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving}
                  className="rounded-full bg-emerald-500 px-4 py-2 font-semibold text-slate-950 shadow transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800/60"
                >
                  {isSaving ? '저장 중...' : '라이브러리에 저장'}
                </button>
                {saveError ? (
                  <span className="text-xs text-amber-200">{saveError}</span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

