'use client'

import { useCallback, useEffect, useState } from 'react'

export type GeolocationState = {
  latitude: number | null
  longitude: number | null
  /** Horizontal accuracy in meters, when reported by the device. */
  accuracy: number | null
  loading: boolean
  error: string | null
  /** True when permission was denied or geolocation is unsupported. */
  unavailable: boolean
  /** User has tapped to enable GPS; watch is active or was attempted. */
  active: boolean
  /** Call from a button click — iOS requires a user gesture to show the permission prompt. */
  requestLocation: () => void
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

function insecureContextMessage(): string {
  return 'Location requires a secure (HTTPS) connection. Use the deployed app or enable location in Safari settings if already blocked.'
}

/**
 * Watch the device GPS position after the user opts in via `requestLocation()`.
 * iOS (especially home-screen PWAs) silently denies auto-started requests without a tap.
 */
export function useGeolocation(enabled = true): GeolocationState {
  const [active, setActive] = useState(false)
  const [state, setState] = useState<Omit<GeolocationState, 'active' | 'requestLocation'>>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: false,
    error: null,
    unavailable: false,
  })

  const requestLocation = useCallback(() => {
    if (!enabled) return

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setActive(true)
      setState({
        latitude: null,
        longitude: null,
        accuracy: null,
        loading: false,
        error: insecureContextMessage(),
        unavailable: true,
      })
      return
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setActive(true)
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

    setActive(true)
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      unavailable: false,
    }))
  }, [enabled])

  useEffect(() => {
    if (!enabled || !active) return

    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    if (typeof window !== 'undefined' && !window.isSecureContext) return

    let cancelled = false

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
  }, [enabled, active])

  useEffect(() => {
    if (enabled) return
    setActive(false)
    setState({
      latitude: null,
      longitude: null,
      accuracy: null,
      loading: false,
      error: null,
      unavailable: false,
    })
  }, [enabled])

  return {
    ...state,
    active,
    requestLocation,
  }
}
