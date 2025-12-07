import { useUser } from '@clerk/clerk-react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import type { MapCameraChangedEvent } from '@vis.gl/react-google-maps'
import {
  APIProvider,
  Map as GoogleMap,
  Marker,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps'
import { useConvexAuth, useMutation } from 'convex/react'
import {
  Compass,
  Eye,
  Maximize,
  Move3D,
  Search,
  Sparkles,
} from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { api } from '../../convex/_generated/api'
import { GeneratingOverlay } from '../components/GeneratingOverlay'
import ResultModal from '../components/ResultModal'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../components/ui/resizable'
import { env } from '../env'
import { cn } from '../lib/utils'
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
  const [showControls, setShowControls] = useState(true)
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(min-width: 768px)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(min-width: 768px)')
    const handler = (event: MediaQueryListEvent) => setIsDesktop(event.matches)
    setIsDesktop(media.matches)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

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
    <div className="min-h-screen bg-background text-foreground">
      <APIProvider
        apiKey={mapApiKey}
        libraries={['places', 'streetView']}
        solutionChannel="GMP_MyMiniMap_Phase1"
      >
        <div className="relative flex min-h-[calc(100vh-56px)] flex-col">
          {isDesktop ? (
            <ResizablePanelGroup direction="horizontal" className="flex-1 rounded-none">
              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full relative bg-gradient-to-br from-card to-background">
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-xs font-medium text-white/80">
                    <Compass className="h-3.5 w-3.5 text-primary" />
                    Map View
                  </div>
                  <div className="absolute inset-0 p-4 md:p-6">
                    <MapPanel
                      viewState={viewState}
                      onCameraChange={handleMapCameraChange}
                      fullHeight
                      className="h-full"
                    />
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/50 transition-colors w-1" />

              <ResizablePanel defaultSize={50} minSize={30}>
                <div className="h-full relative bg-gradient-to-br from-card to-background">
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-xs font-medium text-white/80">
                    <Move3D className="h-3.5 w-3.5 text-accent" />
                    Street View
                  </div>
                  <div className="absolute inset-0 p-4 md:p-6">
                    <StreetViewPanel
                      viewState={viewState}
                      onChange={handleStreetViewChange}
                      fovToZoom={fovToZoom}
                      zoomToFov={zoomToFov}
                      fullHeight
                      className="h-full"
                      isGenerating={isGenerating}
                    />
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="flex flex-col flex-1">
              <div className="relative bg-gradient-to-br from-card to-background min-h-[40vh]">
                <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-xs font-medium text-white/80">
                  <Compass className="h-3 w-3 text-primary" />
                  Map
                </div>
                <div className="absolute inset-0 p-3">
                  <MapPanel
                    viewState={viewState}
                    onCameraChange={handleMapCameraChange}
                    fullHeight
                    className="h-full"
                  />
                </div>
              </div>

              <div className="h-1 bg-border/50" />

              <div className="relative bg-gradient-to-br from-card to-background min-h-[40vh]">
                <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-xs font-medium text-white/80">
                  <Move3D className="h-3 w-3 text-accent" />
                  Street
                </div>
                <div className="absolute inset-0 p-3">
                  <StreetViewPanel
                    viewState={viewState}
                    onChange={handleStreetViewChange}
                    fovToZoom={fovToZoom}
                    zoomToFov={zoomToFov}
                    fullHeight
                    className="h-full"
                    isGenerating={isGenerating}
                  />
                </div>
              </div>
            </div>
          )}

          {showControls ? (
            <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] md:w-auto max-w-2xl">
              <div className="flex items-center gap-2 md:gap-3 bg-card/90 backdrop-blur-xl rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 shadow-2xl border border-white/10 mb-4">
                <div className="relative flex-1 md:flex-none">
                  <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <PlacesSearch
                    onPlaceSelected={handleMapCameraChange}
                    placeholder="Search places..."
                    className="w-full md:w-48 lg:w-64"
                    inputClassName="pl-8 md:pl-9 pr-3 md:pr-4 h-9 md:h-10 rounded-lg md:rounded-xl bg-secondary/50 border-white/10 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 text-sm"
                  />
                </div>

                <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-xl bg-secondary/50 text-xs font-mono text-muted-foreground">
                  <span>H: {Math.round(viewState.heading)}°</span>
                  <span className="text-border">|</span>
                  <span>P: {Math.round(viewState.pitch)}°</span>
                  <span className="text-border">|</span>
                  <span>FOV: {Math.round(viewState.fov)}°</span>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="rounded-lg md:rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 gap-1.5 md:gap-2 px-3 md:px-6 h-9 md:h-10 font-medium text-sm"
                >
                  {isGenerating ? (
                    <>
                      <div className="h-3.5 w-3.5 md:h-4 md:w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      <span className="hidden sm:inline">Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Generate</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:flex rounded-xl h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  onClick={() => setShowControls(false)}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-6 right-6 z-30 rounded-xl h-12 w-12 bg-card/90 backdrop-blur-xl shadow-lg border border-white/10"
              onClick={() => setShowControls(true)}
            >
              <Eye className="h-5 w-5 text-foreground" />
            </Button>
          )}
        </div>
      </APIProvider>

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-3">
        {genError ? (
          <div className="rounded-xl border border-amber-800/60 bg-amber-900/30 px-4 py-3 text-sm text-amber-100">
            {genError}
          </div>
        ) : null}
        {saveError ? (
          <div className="rounded-xl border border-rose-800/60 bg-rose-900/30 px-4 py-3 text-sm text-rose-100">
            {saveError}
          </div>
        ) : null}
        {saveSuccess ? (
          <div className="rounded-xl border border-emerald-800/60 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-100">
            라이브러리에 저장했습니다. <button onClick={() => navigate({ to: '/library' })} className="underline underline-offset-4">보러가기</button>
          </div>
        ) : null}
      </div>

      {result ? (
        <ResultModal
          result={result}
          onClose={() => {
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
      ) : null}
    </div>
  )
}

type MapPanelProps = {
  viewState: ViewState
  onCameraChange: (patch: Partial<ViewState>) => void
  className?: string
  fullHeight?: boolean
}

function MapPanel({ viewState, onCameraChange, className, fullHeight }: MapPanelProps) {
  const mapId = useId()
  const defaultCenter = useMemo(
    () => ({ lat: viewState.lat, lng: viewState.lng }),
    [viewState.lat, viewState.lng],
  )
  const defaultZoom = 16
  const mapHeightClass = fullHeight ? 'h-full' : 'h-[360px] w-full lg:h-[520px]'

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
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-card/70 shadow-xl backdrop-blur flex flex-col',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Map</p>
          <p className="text-sm font-semibold text-foreground">Google Maps</p>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground/80">Lat/Lng</span>{' '}
          {viewState.lat.toFixed(4)}, {viewState.lng.toFixed(4)}
        </div>
      </div>
      <div className={cn('relative w-full overflow-hidden', mapHeightClass, fullHeight && 'flex-1')}>
        <GoogleMap
          id={mapId}
          defaultCenter={defaultCenter}
          defaultZoom={defaultZoom}
          reuseMaps
          gestureHandling="greedy"
          disableDefaultUI
          className="h-full w-full rounded-xl"
          onCameraChanged={handleCameraChanged}
        >
          <MapViewSync viewState={viewState} />
          <Marker position={{ lat: viewState.lat, lng: viewState.lng }} />
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
  className?: string
  inputClassName?: string
  placeholder?: string
}

function PlacesSearch({ onPlaceSelected, className, inputClassName, placeholder }: PlacesSearchProps) {
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
    <div
      className={cn(
        'rounded-full bg-card/80 ring-1 ring-border shadow-lg backdrop-blur',
        className,
      )}
    >
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        placeholder={placeholder ?? '장소를 검색하세요 (예: 서울 시청)'}
        className={cn(
          'w-full rounded-full border-none bg-transparent px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-none focus:outline-none focus-visible:ring-0 focus-visible:border-transparent',
          inputClassName,
        )}
      />
    </div>
  )
}

type StreetViewPanelProps = {
  viewState: ViewState
  onChange: (patch: Partial<ViewState>) => void
  fovToZoom: (fov: number) => number
  zoomToFov: (zoom: number) => number
  className?: string
  fullHeight?: boolean
  isGenerating?: boolean
}

function StreetViewPanel({
  viewState,
  onChange,
  fovToZoom,
  zoomToFov,
  className,
  fullHeight,
  isGenerating,
}: StreetViewPanelProps) {
  const panelHeightClass = fullHeight ? 'h-full' : 'h-[360px] w-full lg:h-[520px]'

  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-card/70 shadow-xl backdrop-blur flex flex-col',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Street View</p>
          <p className="text-sm font-semibold text-foreground">카메라 각도 동기화</p>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground/80">Heading</span>{' '}
          {Math.round(viewState.heading)}° · <span className="font-semibold text-foreground/80">Pitch</span>{' '}
          {Math.round(viewState.pitch)}° · <span className="font-semibold text-foreground/80">FOV</span>{' '}
          {Math.round(viewState.fov)}°
        </div>
      </div>
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-b-xl',
          panelHeightClass,
          fullHeight && 'flex-1',
        )}
      >
        <StreetViewCanvas
          viewState={viewState}
          onChange={onChange}
          fovToZoom={fovToZoom}
          zoomToFov={zoomToFov}
        />
        {isGenerating ? <GeneratingOverlay /> : null}
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
    <div className="relative h-full w-full bg-background">
      <div ref={containerRef} className="h-full w-full" />
      {statusMessage ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-lg border border-white/10 bg-card/90 px-4 py-3 text-center text-sm text-foreground">
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

