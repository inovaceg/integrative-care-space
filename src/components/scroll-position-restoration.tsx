import { useEffect, useLayoutEffect, useRef } from 'react'
import { useRouterState } from '@tanstack/react-router'

const storagePrefix = 'app:scroll-position:'
const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function ScrollPositionRestoration() {
  const routeKey = useRouterState({
    select: (state) => `${state.location.pathname}${state.location.searchStr}${state.location.hash}`,
  })
  const currentKey = useRef(routeKey)
  const restoring = useRef(false)

  useClientLayoutEffect(() => {
    currentKey.current = routeKey
    const savedPosition = Number(window.sessionStorage.getItem(`${storagePrefix}${routeKey}`))
    if (!Number.isFinite(savedPosition) || savedPosition <= 0) {
      restoring.current = false
      return
    }

    restoring.current = true
    let active = true
    let attempts = 0
    let frame = 0
    const restore = () => {
      if (!active) return
      attempts += 1
      const pageHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
      if (pageHeight >= savedPosition + window.innerHeight || attempts >= 300) {
        window.scrollTo(0, savedPosition)
        frame = window.requestAnimationFrame(() => { restoring.current = false })
        return
      }
      frame = window.requestAnimationFrame(restore)
    }
    frame = window.requestAnimationFrame(restore)

    return () => {
      active = false
      window.cancelAnimationFrame(frame)
      restoring.current = false
    }
  }, [routeKey])

  useEffect(() => {
    const savePosition = () => {
      if (!restoring.current) {
        window.sessionStorage.setItem(`${storagePrefix}${currentKey.current}`, String(window.scrollY))
      }
    }
    window.addEventListener('scroll', savePosition, { passive: true })
    window.addEventListener('pagehide', savePosition)
    return () => {
      window.removeEventListener('scroll', savePosition)
      window.removeEventListener('pagehide', savePosition)
    }
  }, [])

  return null
}
