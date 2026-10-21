import { useEffect, useLayoutEffect, useRef } from 'react'
import { useRouter, useRouterState } from '@tanstack/react-router'

const storagePrefix = 'app:scroll-position:'
const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export function ScrollPositionRestoration() {
  const router = useRouter()
  const routeKey = useRouterState({
    select: (state) => `${state.location.pathname}${state.location.searchStr}${state.location.hash}`,
  })
  const currentKey = useRef(routeKey)
  const restoring = useRef(false)

  const savePosition = () => {
    if (!restoring.current) {
      const scrollTop = document.scrollingElement?.scrollTop ?? window.scrollY
      window.sessionStorage.setItem(`${storagePrefix}${currentKey.current}`, String(scrollTop))
    }
  }

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
    const unsubscribe = router.subscribe('onBeforeNavigate', savePosition)
    window.addEventListener('scroll', savePosition, { passive: true })
    document.addEventListener('scroll', savePosition, { passive: true, capture: true })
    window.addEventListener('pagehide', savePosition)
    return () => {
      unsubscribe()
      window.removeEventListener('scroll', savePosition)
      document.removeEventListener('scroll', savePosition, true)
      window.removeEventListener('pagehide', savePosition)
    }
  }, [router])

  return null
}
