import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { api } from '../../convex/_generated/api'
import { SignInCta } from '../components/SignInCta'

export const Route = createFileRoute('/me')({
  component: MyPage,
})

function MyPage() {
  const profile = useQuery(api.users.getMyProfile)
  const saveProfile = useMutation(api.users.upsertProfile)
  const ensureProfile = useMutation(api.users.ensureProfileFromIdentity)
  const requestUploadUrl = useMutation(api.users.generateAvatarUploadUrl)
  const saveAvatar = useMutation(api.users.saveProfileAvatar)

  const [nickname, setNickname] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const [error, setError] = useState<string | null>(null)
  const [avatarStatus, setAvatarStatus] = useState<'idle' | 'queued' | 'uploading' | 'saved' | 'error'>('idle')
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const nicknameId = useId()
  const publicFlagId = useId()

  const isLoadingProfile = useMemo(() => profile === undefined, [profile])

  const formatError = (message: string | undefined) => {
    if (!message) return '저장에 실패했습니다.'
    if (message.includes('이미 사용 중인 닉네임')) return '이미 사용 중인 닉네임입니다.'
    if (message.includes('닉네임은 3~10자')) {
      return '닉네임은 3~10자, 한글/일본어/라틴/숫자 및 ._-만 가능합니다.'
    }
    return '저장에 실패했습니다.'
  }

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname ?? '')
      setIsPublic(profile.isPublic ?? true)
      if (profile.avatar) {
        setAvatarPreview(profile.avatar)
      }
    }
  }, [profile])

  useEffect(() => {
    if (profile === undefined) return
    if (profile === null || !profile.avatar || !profile.nickname) {
      void ensureProfile({})
    }
  }, [profile, ensureProfile])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus('saving')
    setError(null)
    try {
      if (pendingAvatarFile) {
        setAvatarStatus('uploading')
        setAvatarError(null)
        await uploadAvatar(pendingAvatarFile)
        setAvatarStatus('saved')
        setPendingAvatarFile(null)
      }
      await saveProfile({ nickname, isPublic })
      setStatus('saved')
    } catch (err) {
      setStatus('error')
      if (pendingAvatarFile) {
        setAvatarStatus('error')
      }
      setError(formatError(err instanceof Error ? err.message : undefined))
    }
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    queueAvatar(file)
    event.target.value = ''
  }

  const queueAvatar = (file: File) => {
    setPendingAvatarFile(file)
    setAvatarStatus('queued')
    setAvatarError(null)
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
  }

  const uploadAvatar = async (file: File) => {
    if (!file) return
    try {
      const uploadUrl = await requestUploadUrl({})
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!response.ok) {
        throw new Error('업로드 요청에 실패했습니다.')
      }

      const json = (await response.json()) as { storageId?: string }
      if (!json.storageId) {
        throw new Error('storageId를 받지 못했습니다.')
      }

      await saveAvatar({ storageId: json.storageId })
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : '아바타 업로드에 실패했습니다.')
      throw err
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    queueAvatar(file)
  }

  const handleKeyDownDrop = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-cyan-300/80">
            Profile · Nickname
          </p>
          <h1 className="text-3xl font-bold">나의 프로필</h1>
          <p className="text-sm text-slate-300">
            닉네임과 공개 여부를 설정하세요. 공개 허용 시 공유/재사용된 미니어처에서 최초
            생성자의 닉네임을 표시할 수 있습니다.
          </p>
        </header>

        <SignedOut>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
            <p className="mb-2 text-lg font-semibold">로그인이 필요합니다</p>
            <p className="text-sm text-slate-300">
              닉네임은 로그인 후 설정할 수 있습니다.
            </p>
            <div className="mt-4">
              <SignInCta className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
                로그인하기
              </SignInCta>
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl"
          >
            <button
              type="button"
              className={`flex w-full flex-col gap-4 rounded-xl border-2 border-dashed ${isDragging ? 'border-cyan-400 bg-cyan-500/5' : 'border-slate-700 bg-slate-900/60'
                } p-4 text-left transition`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onKeyDown={handleKeyDownDrop}
              onClick={() => fileInputRef.current?.click()}
              aria-label="아바타 이미지를 업로드하거나 드래그 앤 드롭하세요"
            >
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="h-32 w-32 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="avatar"
                      className="h-full w-full object-cover object-center"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-200">
                      {nickname?.[0]?.toUpperCase?.() ?? 'E'}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 text-center sm:text-left">
                  <p className="text-sm font-semibold text-slate-100">프로필 이미지</p>
                  <p className="text-xs text-slate-400">
                    이미지를 선택/드래그하면 미리보기로 추가되고, 저장 버튼을 누르면 반영됩니다.
                  </p>
                  {avatarStatus === 'queued' ? (
                    <p className="text-xs text-cyan-200">저장 버튼을 눌러 업로드하세요.</p>
                  ) : avatarStatus === 'uploading' ? (
                    <p className="text-xs text-cyan-200">업로드 중...</p>
                  ) : null}
                </div>

              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              disabled={avatarStatus === 'uploading'}
            />
            {avatarError ? <p className="text-xs text-amber-200">{avatarError}</p> : null}

            <div className="space-y-1">
              <label htmlFor={nicknameId} className="text-sm font-semibold text-slate-200">
                닉네임
              </label>
              <input
                id={nicknameId}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="예) MiniMapper / UPDATE NICKNAME"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                disabled={isLoadingProfile || status === 'saving'}
              />
              <p className="text-xs text-slate-400">
                빈 값이면 자동으로 Explorer로 저장됩니다.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                id={publicFlagId}
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={isLoadingProfile || status === 'saving'}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-400"
              />
              <label htmlFor={publicFlagId} className="text-sm text-slate-200">
                닉네임 외부 공개 허용 (공유/재사용 시 최초 생성자 표시)
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={status === 'saving'}
                className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-800/60"
              >
                {status === 'saving' ? '저장 중...' : '저장'}
              </button>
              {status === 'saved' ? (
                <span className="text-xs text-emerald-300">저장되었습니다.</span>
              ) : null}
              {error ? <span className="text-xs text-amber-200">{error}</span> : null}
            </div>
          </form>

          <div className="text-sm text-slate-400">
            <Link to="/" className="text-cyan-300 hover:text-cyan-200">
              홈으로
            </Link>
          </div>
        </SignedIn>
      </div>
    </div>
  )
}
