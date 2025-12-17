import { useEffect, useRef, useState, use } from 'react'
import { ReadonlyURLSearchParams, usePathname, useSearchParams } from 'next/navigation'
import { useHash } from './use-hash'

// TODO: This implementation might not be complete when there are nested
// Suspense boundaries during a route transition. But it should work fine for
// the most common use cases.
export function useBrowserNativeTransitions({
  enableHashTransitions,
}: {
  enableHashTransitions: boolean,
}) {
  const pathname = usePathname()
  const hash = useHash();

  const currentPathname = useRef(pathname)
  const currentHash = useRef(hash)

  // This is a global state to keep track of the view transition state.
  const [currentViewTransition, setCurrentViewTransition] = useState<
    | null
    | [
      // Promise to wait for the view transition to start
      Promise<void>,
      // Resolver to finish the view transition
      () => void
    ]
  >(null)

  useEffect(() => {
    if (!('startViewTransition' in document)) {
      return () => { }
    }

    const onPopState = () => {
      const nextPath = window.location.pathname
      const nextSearch = window.location.search
      const nextHash = window.location.hash

      const transitionDetected: boolean =
        currentPathname.current != pathname ||
        (enableHashTransitions && currentHash.current != hash);

      currentPathname.current = nextPath
      currentHash.current = nextHash

      if (!transitionDetected) {
        return;
      }

      let pendingViewTransitionResolve: () => void

      const pendingViewTransition = new Promise<void>((resolve) => {
        pendingViewTransitionResolve = resolve
      })

      const pendingStartViewTransition = new Promise<void>((resolve) => {
        // @ts-ignore
        document.startViewTransition(() => {
          resolve()
          return pendingViewTransition
        })
      })

      setCurrentViewTransition([
        pendingStartViewTransition,
        pendingViewTransitionResolve!,
      ])
    }
    window.addEventListener('popstate', onPopState)

    return () => {
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  const transitionDetected: boolean =
    currentPathname.current != pathname ||
    (enableHashTransitions && currentHash.current != hash);

  if (currentViewTransition && transitionDetected) {
    // Whenever the pathname changes, we block the rendering of the new route
    // until the view transition is started (i.e. DOM screenshotted).
    use(currentViewTransition[0])
  }

  // Keep the transition reference up-to-date.
  const transitionRef = useRef(currentViewTransition)
  useEffect(() => {
    transitionRef.current = currentViewTransition
  }, [currentViewTransition])

  useEffect(() => {
    // When the new route component is actually mounted, we finish the view
    // transition.
    currentPathname.current = pathname
    currentHash.current = hash

    if (transitionRef.current) {
      transitionRef.current[1]()
      transitionRef.current = null
    }
  }, [hash, pathname]);
}
