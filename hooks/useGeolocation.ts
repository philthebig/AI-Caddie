'use client'

import { useEffect, useState } from 'react'

export type GeolocationState = {
  latitude: number | null
  longitude: number | null
  /** Horizontal accuracy in meters, when reported by the device. */
  accuracy: number | null
  loading: boolean
  error: string | null
  /** True when permission was denied or geolocation is unsupported. */
  unavailable: boolean
}

function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Location permission denied'
    case 2:
      return 'Location unavailable'
    case 3:
      return 'Location request timed out'
    default:
      return 'Could not get your location'
  }
}

/**
 * Watch the device GPS position. Cleans up the watcher on unmount or when disabled.
 * Pass `enabled: false` to skip requesting location (e.g. when no course target exists).
 */
export function useGeolocation(enabled = true): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: enabled,
    error: null,
    unavailable: false,
  })

  useEffect(() => {
    if (!enabled) {
      setState({
        latitude: null,
        longitude: null,
        accuracy: null,
        loading: false,
        error: null,
        unavailable: false,
      })
      return
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({
        latitude: null,
        longitude: null,
        accuracy: null,
        loading: false,
        error: 'Geolocation is not supported on this device',
        unavailable: true,
      })
      return
    }

    let cancelled = false

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      unavailable: false,
    }))

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (cancelled) return
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
          unavailable: false,
        })
      },
      (err) => {
        if (cancelled) return
        const denied = err.code === 1
        setState({
          latitude: null,
          longitude: null,
          accuracy: null,
          loading: false,
          error: geolocationErrorMessage(err.code),
          unavailable: denied || err.code === 2,
        })
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      }
    )

    return () => {
      cancelled = true
      navigator.geolocation.clearWatch(watchId)
    }
  }, [enabled])

  return state
}
