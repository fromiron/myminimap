export type ViewState = {
  lat: number
  lng: number
  heading: number
  pitch: number
  fov: number
}

export const DEFAULT_VIEW: ViewState = {
  lat: 37.5665,
  lng: 126.978,
  heading: 0,
  pitch: 0,
  fov: 90,
}

