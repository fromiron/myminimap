import { useUser } from '@clerk/clerk-react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import type { MapCameraChangedEvent } from '@vis.gl/react-google-maps'
import {
  APIProvider,
  ControlPosition,
  Map as GoogleMap,
  MapControl,
  Marker,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps'
import { useConvexAuth, useMutation } from 'convex/react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { api } from '../../convex/_generated/api'
import ResultModal from '../components/ResultModal'
import { env } from '../env'
import {
  type GenerateInput,
  type GenerationResult,
  generateMiniature,
} from '../server/generate'
import { DEFAULT_VIEW, type ViewState } from '../types/view-state'

const searchSchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  heading: z.coerce.number().optional(),
  pitch: z.coerce.number().optional(),
  fov: z.coerce.number().optional(),
})

export const Route = createFileRoute('/')({
  validateSearch: (search) => searchSchema.parse(search),
  component: HomePage,
})

function clampFov(fov: number) {
  return Math.min(120, Math.max(20, fov))
}

function fovToZoom(fov: number) {
  const clamped = clampFov(fov)
  return Math.log2(180 / clamped)
}

function zoomToFov(zoom: number) {
  return clampFov(180 / 2 ** zoom)
}

function HomePage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const mapApiKey = env.VITE_GOOGLE_MAPS_API_KEY
  const { isSignedIn } = useUser()

  const serverGenerate = useServerFn(generateMiniature)
  const saveMiniature = useMutation(api.miniatures.save)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const { isAuthenticated } = useConvexAuth()
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    console.log("isAuthenticated", isAuthenticated)

  }, [isAuthenticated])

  const viewState = useMemo<ViewState>(
    () => ({ ...DEFAULT_VIEW, ...search }),
    [search],
  )

  useEffect(() => {
    const missing = ['lat', 'lng', 'heading', 'pitch', 'fov'].some(
      (key) => (search as Record<string, unknown>)[key] === undefined,
    )
    if (missing) {
      navigate({
        to: '/',
        search: (prev) => ({ ...DEFAULT_VIEW, ...prev }),
        replace: true,
      })
    }
  }, [navigate, search])

  const updateSearch = useDebouncedSearchUpdater(navigate)

  const handleMapCameraChange = useCallback(
    (patch: Partial<ViewState>) => {
      updateSearch(patch)
    },
    [updateSearch],
  )

  const handleStreetViewChange = useCallback(
    (patch: Partial<ViewState>) => {
      updateSearch(patch)
    },
    [updateSearch],
  )

  const handleGenerate = useCallback(async () => {
    setGenError(null)
    setIsGenerating(true)
    setSaveError(null)
    setSaveSuccess(false)
    const started = performance.now()

    try {
      const payload: GenerateInput = {
        lat: Number(viewState.lat),
        lng: Number(viewState.lng),
        heading: Number(viewState.heading),
        pitch: Number(viewState.pitch),
        fov: Number(viewState.fov),
      }

      const data = await serverGenerate({ data: payload })

      if (data.error) {
        setGenError(data.error)
      }

      if (data.imageBase64) {
        setResult({
          imageBase64: data.imageBase64,
          locationName: data.locationName,
          prompt: data.prompt,
          staticUrl: data.staticUrl,
          mode: data.mode,
          error: data.error,
        })
      }
    } catch (error) {
      setGenError(
        error instanceof Error ? error.message : '생성 중 오류가 발생했어요.',
      )
    } finally {
      const elapsed = performance.now() - started
      const remaining = Math.max(0, 5000 - elapsed)
      window.setTimeout(() => setIsGenerating(false), remaining)
    }
  }, [serverGenerate, viewState])

  const handleSave = useCallback(async () => {
    if (!result) return
    if (!isSignedIn) {
      setSaveError('로그인 후 저장할 수 있어요.')
      return
    }
    setSaveError(null)
    setIsSaving(true)
    try {
      const imageUrl = `data:image/png;base64,${result.imageBase64}`
      await saveMiniature({
        locationName: result.locationName,
        lat: Number(viewState.lat),
        lng: Number(viewState.lng),
        heading: Number(viewState.heading),
        pitch: Number(viewState.pitch),
        fov: Number(viewState.fov),
        imageUrl,
        prompt: result.prompt,
        mode: result.mode,
      })
      setSaveSuccess(true)
      setSaveError(null)
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : '저장 중 오류가 발생했어요.',
      )
    } finally {
      setIsSaving(false)
    }
  }, [
    isSignedIn,
    result,
    saveMiniature,
    viewState.fov,
    viewState.heading,
    viewState.lat,
    viewState.lng,
    viewState.pitch,
  ])

  if (!mapApiKey) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-slate-100">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          <h1 className="text-xl font-semibold">Google Maps API 키 필요</h1>
          <p className="mt-2 text-sm text-slate-300">
            `.env.local`에 `VITE_GOOGLE_MAPS_API_KEY`를 설정한 후 다시 실행해 주세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <section className="space-y-2">
          <p className="text-sm text-cyan-300/90">Phase 1 · Location & Auth</p>
          <h1 className="text-3xl font-bold">지도에서 장소를 잡고 각도를 기록하세요</h1>
          <p className="max-w-3xl text-sm text-slate-300">
            지도 이동과 스트리트 뷰 시야(heading, pitch, fov)는 URL 검색 파라미터로 즉시 반영되어
            공유/새로고침 시에도 같은 뷰를 복원합니다.
          </p>
        </section>

        <APIProvider
          apiKey={mapApiKey}
          libraries={['places', 'streetView']}
          solutionChannel="GMP_MyMiniMap_Phase1"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <MapPanel viewState={viewState} onCameraChange={handleMapCameraChange} />
            <StreetViewPanel
              viewState={viewState}
              onChange={handleStreetViewChange}
              fovToZoom={fovToZoom}
              zoomToFov={zoomToFov}
            />
          </div>
        </APIProvider>

        <GenerateSection
          isGenerating={isGenerating}
          error={genError}
          result={result}
          onGenerate={handleGenerate}
          onCloseResult={() => {
            setResult(null)
            setSaveError(null)
            setSaveSuccess(false)
          }}
          onSave={handleSave}
          isSaving={isSaving}
          saveError={saveError}
          saveSuccess={saveSuccess}
          onGoLibrary={() => navigate({ to: '/library' })}
        />
      </div>
    </div>
  )
}

type MapPanelProps = {
  viewState: ViewState
  onCameraChange: (patch: Partial<ViewState>) => void
}

function MapPanel({ viewState, onCameraChange }: MapPanelProps) {
  const mapId = useId()
  const defaultCenter = useMemo(
    () => ({ lat: viewState.lat, lng: viewState.lng }),
    [viewState.lat, viewState.lng],
  )
  const defaultZoom = 16

  const handleCameraChanged = useCallback(
    (event: MapCameraChangedEvent) => {
      const { center: nextCenter } = event.detail
      if (!nextCenter) return
      const sameLat =
        Math.abs(nextCenter.lat - viewState.lat) < 0.000001 &&
        Math.abs(nextCenter.lng - viewState.lng) < 0.000001
      if (sameLat) return
      onCameraChange({ lat: nextCenter.lat, lng: nextCenter.lng })
    },
    [onCameraChange, viewState.lat, viewState.lng],
  )

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Map</p>
          <p className="text-sm font-semibold text-slate-100">Google Maps</p>
        </div>
        <div className="text-xs text-slate-400">
          <span className="font-semibold text-slate-200">Lat/Lng</span>{' '}
          {viewState.lat.toFixed(4)}, {viewState.lng.toFixed(4)}
        </div>
      </div>
      <div className="relative h-[360px] w-full lg:h-[520px]">
        <GoogleMap
          id={mapId}
          defaultCenter={defaultCenter}
          defaultZoom={defaultZoom}
          reuseMaps
          gestureHandling="greedy"
          disableDefaultUI
          className="h-full w-full"
          onCameraChanged={handleCameraChanged}
        >
          <MapViewSync viewState={viewState} />
          <Marker position={{ lat: viewState.lat, lng: viewState.lng }} />
          <MapControl position={ControlPosition.TOP_CENTER}>
            <div className="pointer-events-auto p-3">
              <PlacesSearch onPlaceSelected={onCameraChange} />
            </div>
          </MapControl>
        </GoogleMap>
      </div>
    </div>
  )
}

function MapViewSync({ viewState }: { viewState: ViewState }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return
    const current = map.getCenter()
    if (!current) return

    const sameLat =
      Math.abs(current.lat() - viewState.lat) < 0.000001 &&
      Math.abs(current.lng() - viewState.lng) < 0.000001
    if (sameLat) return

    map.panTo({ lat: viewState.lat, lng: viewState.lng })
  }, [map, viewState.lat, viewState.lng])

  return null
}

type PlacesSearchProps = {
  onPlaceSelected: (patch: Partial<ViewState>) => void
}

function PlacesSearch({ onPlaceSelected }: PlacesSearchProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const placesLib = useMapsLibrary('places')
  const map = useMap()

  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      fields: ['geometry', 'name', 'formatted_address'],
      types: ['geocode'],
    })

    if (map) {
      autocomplete.bindTo('bounds', map)
    }

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const location = place.geometry?.location
      if (!location) return

      const nextLat = location.lat()
      const nextLng = location.lng()
      const label = place.formatted_address ?? place.name ?? ''
      setInputValue(label)
      onPlaceSelected({ lat: nextLat, lng: nextLng })
    })

    return () => listener.remove()
  }, [map, onPlaceSelected, placesLib])

  return (
    <div className="rounded-full bg-slate-950/80 ring-1 ring-slate-700 shadow-lg backdrop-blur">
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        placeholder="장소를 검색하세요 (예: 서울 시청)"
        className="w-[260px] rounded-full bg-transparent px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
      />
    </div>
  )
}

type StreetViewPanelProps = {
  viewState: ViewState
  onChange: (patch: Partial<ViewState>) => void
  fovToZoom: (fov: number) => number
  zoomToFov: (zoom: number) => number
}

function StreetViewPanel({
  viewState,
  onChange,
  fovToZoom,
  zoomToFov,
}: StreetViewPanelProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Street View</p>
          <p className="text-sm font-semibold text-slate-100">카메라 각도 동기화</p>
        </div>
        <div className="text-xs text-slate-400">
          <span className="font-semibold text-slate-200">Heading</span>{' '}
          {Math.round(viewState.heading)}° ·{' '}
          <span className="font-semibold text-slate-200">Pitch</span>{' '}
          {Math.round(viewState.pitch)}° ·{' '}
          <span className="font-semibold text-slate-200">FOV</span>{' '}
          {Math.round(viewState.fov)}°
        </div>
      </div>
      <div className="relative h-[360px] w-full overflow-hidden rounded-b-xl lg:h-[520px]">
        <StreetViewCanvas
          viewState={viewState}
          onChange={onChange}
          fovToZoom={fovToZoom}
          zoomToFov={zoomToFov}
        />
      </div>
    </div>
  )
}

type StreetViewCanvasProps = {
  viewState: ViewState
  onChange: (patch: Partial<ViewState>) => void
  fovToZoom: (fov: number) => number
  zoomToFov: (zoom: number) => number
}

function StreetViewCanvas({
  viewState,
  onChange,
  fovToZoom,
  zoomToFov,
}: StreetViewCanvasProps) {
  const streetViewLib = useMapsLibrary('streetView')
  const apiStatus = useApiLoadingStatus()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [panorama, setPanorama] = useState<google.maps.StreetViewPanorama | null>(
    null,
  )
  const serviceRef = useRef<google.maps.StreetViewService | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null)
  const viewStateRef = useRef(viewState)
  const onChangeRef = useRef(onChange)

  // viewState와 onChange를 ref에 동기화 (이벤트 핸들러에서 사용)
  useEffect(() => {
    viewStateRef.current = viewState
  }, [viewState])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // 파노라마 초기화 (한 번만 실행)
  useEffect(() => {
    if (!streetViewLib || !containerRef.current || panorama) return

    let isCancelled = false
    const initialState = viewStateRef.current
    const pano = new streetViewLib.StreetViewPanorama(containerRef.current, {
      position: { lat: initialState.lat, lng: initialState.lng },
      pov: { heading: initialState.heading, pitch: initialState.pitch },
      zoom: fovToZoom(initialState.fov),
      motionTracking: false,
      visible: false, // 초기에 숨김, 파노라마 로드 후 표시
    })
    serviceRef.current = new streetViewLib.StreetViewService()

    // 초기 파노라마 로드
    const target = { lat: initialState.lat, lng: initialState.lng }
    serviceRef.current.getPanorama(
      { location: target, radius: 100 },
      (data, svcStatus) => {
        if (isCancelled) return
        if (svcStatus === google.maps.StreetViewStatus.OK && data?.location?.pano) {
          pano.setPano(data.location.pano)
          pano.setPov({ heading: initialState.heading, pitch: initialState.pitch })
          pano.setZoom(fovToZoom(initialState.fov))
          pano.setVisible(true)
          lastPositionRef.current = { lat: initialState.lat, lng: initialState.lng }
          setStatusMessage(null)
        } else {
          setStatusMessage('해당 위치 근처에 스트리트 뷰가 없습니다.')
        }
      },
    )

    const positionListener = pano.addListener('position_changed', () => {
      const position = pano.getPosition()
      if (!position) return
      const newLat = position.lat()
      const newLng = position.lng()
      lastPositionRef.current = { lat: newLat, lng: newLng }
      onChangeRef.current({ lat: newLat, lng: newLng })
    })

    const statusListener = pano.addListener('status_changed', () => {
      const panoStatus = pano.getStatus()
      if (panoStatus && panoStatus !== 'OK') {
        setStatusMessage('해당 위치의 스트리트 뷰를 찾을 수 없어요.')
      } else {
        setStatusMessage(null)
      }
    })

    setPanorama(pano)

    return () => {
      isCancelled = true
      positionListener.remove()
      statusListener.remove()
      pano.setVisible(false)
    }
  }, [fovToZoom, panorama, streetViewLib])

  // POV/Zoom 변경을 폴링으로 감지 (별도의 useEffect로 분리하여 React Strict Mode 대응)
  useEffect(() => {
    if (!panorama) return

    let lastPov: { heading: number; pitch: number } | null = null
    let lastZoom: number | null = null
    let animationFrameId: number | null = null

    const checkPovChanges = () => {
      const isVisible = panorama.getVisible()
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(checkPovChanges)
        return
      }

      const currentPov = panorama.getPov()
      const currentZoom = panorama.getZoom() ?? 0

      // 첫 번째 실행 시 현재 값으로 초기화
      if (lastPov === null || lastZoom === null) {
        lastPov = { heading: currentPov.heading, pitch: currentPov.pitch }
        lastZoom = currentZoom
        animationFrameId = requestAnimationFrame(checkPovChanges)
        return
      }

      const headingChanged = Math.abs(currentPov.heading - lastPov.heading) > 0.1
      const pitchChanged = Math.abs(currentPov.pitch - lastPov.pitch) > 0.1
      const zoomChanged = Math.abs(currentZoom - lastZoom) > 0.01

      if (headingChanged || pitchChanged || zoomChanged) {
        lastPov = { heading: currentPov.heading, pitch: currentPov.pitch }
        lastZoom = currentZoom
        onChangeRef.current({
          heading: currentPov.heading,
          pitch: currentPov.pitch,
          fov: zoomToFov(currentZoom),
        })
      }

      animationFrameId = requestAnimationFrame(checkPovChanges)
    }

    animationFrameId = requestAnimationFrame(checkPovChanges)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [panorama, zoomToFov])

  // 위치(lat, lng) 변경 시에만 파노라마 검색
  const lat = viewState.lat
  const lng = viewState.lng

  useEffect(() => {
    if (!panorama || !streetViewLib) return
    if (!serviceRef.current) {
      serviceRef.current = new streetViewLib.StreetViewService()
    }

    const lastPos = lastPositionRef.current
    const isSamePosition =
      lastPos &&
      Math.abs(lastPos.lat - lat) < 0.00001 &&
      Math.abs(lastPos.lng - lng) < 0.00001

    if (isSamePosition) return

    lastPositionRef.current = { lat, lng }

    const target = { lat, lng }
    serviceRef.current.getPanorama(
      { location: target, radius: 100 },
      (data, svcStatus) => {
        if (svcStatus === google.maps.StreetViewStatus.OK && data?.location?.pano) {
          const currentViewState = viewStateRef.current
          panorama.setPano(data.location.pano)
          panorama.setPov({
            heading: currentViewState.heading,
            pitch: currentViewState.pitch,
          })
          panorama.setZoom(fovToZoom(currentViewState.fov))
          panorama.setVisible(true)
          setStatusMessage(null)
        } else {
          setStatusMessage('해당 위치 근처에 스트리트 뷰가 없습니다.')
          panorama.setVisible(false)
        }
      },
    )
  }, [fovToZoom, lat, lng, panorama, streetViewLib])

  if (apiStatus === 'LOADING' || apiStatus === 'NOT_LOADED' || !streetViewLib) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-300">
        스트리트 뷰 로딩 중...
      </div>
    )
  }

  if (apiStatus === 'FAILED' || apiStatus === 'AUTH_FAILURE') {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-300">
        Google Maps를 불러오지 못했습니다.
      </div>
    )
  }

  return (
    <div className="relative h-full w-full bg-slate-950">
      <div ref={containerRef} className="h-full w-full" />
      {statusMessage ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-lg border border-slate-800 bg-slate-900/90 px-4 py-3 text-center text-sm text-slate-200">
          {statusMessage}
        </div>
      ) : null}
    </div>
  )
}

type NavigateFn = ReturnType<typeof Route.useNavigate>

function useDebouncedSearchUpdater(navigate: NavigateFn, delay = 150) {
  const timerRef = useRef<number | null>(null)

  return useCallback(
    (patch: Partial<ViewState>) => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }

      timerRef.current = window.setTimeout(() => {
        navigate({
          to: '/',
          search: (prev) => ({ ...DEFAULT_VIEW, ...prev, ...patch }),
          replace: true,
        })
      }, delay)
    },
    [delay, navigate],
  )
}

type GenerateSectionProps = {
  isGenerating: boolean
  error: string | null
  result: GenerationResult | null
  onGenerate: () => void
  onCloseResult: () => void
  onSave: () => void
  isSaving: boolean
  saveError: string | null
  saveSuccess: boolean
  onGoLibrary: () => void
}

function GenerateSection({
  isGenerating,
  error,
  result,
  onGenerate,
  onCloseResult,
  onSave,
  isSaving,
  saveError,
  saveSuccess,
  onGoLibrary,
}: GenerateSectionProps) {
  return (
    <>
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">AI Generation</p>
            <p className="text-lg font-semibold text-slate-100">
              현재 뷰를 3D 미니어처로 생성
            </p>
            <p className="text-sm text-slate-300">
              스트리트뷰 스냅샷 → 역지오코딩 → Gemini API(Imagen 3) 순서로 처리합니다.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-cyan-800/60"
            >
              {isGenerating ? '생성 중... (약 5~10초)' : '미니어처 생성'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-lg border border-red-800/60 bg-red-900/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {isGenerating ? (
          <div className="mt-4 flex items-center gap-3 text-sm text-slate-300">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            이미지 생성 중입니다. 5~10초 정도 소요될 수 있어요.
          </div>
        ) : null}
      </div>

      {result ? (
        <ResultModal
          result={result}
          onClose={onCloseResult}
          onSave={onSave}
          isSaving={isSaving}
          saveError={saveError}
          saveSuccess={saveSuccess}
          onGoLibrary={onGoLibrary}
        />
      ) : null}
    </>
  )
}
