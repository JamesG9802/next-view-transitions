import type { Dispatch, SetStateAction } from 'react'
import { createContext, use, useEffect, useState } from 'react'

import { useBrowserNativeTransitions } from './browser-native-events'

const ViewTransitionsContext = createContext<
  Dispatch<SetStateAction<(() => void) | null>>
>(null)

export type ViewTransitionsProps = Readonly<{
  children: React.ReactNode,

  /**
   * Whether transitions should trigger when the hash changes.
   */
  enableHashTransitions?: boolean,

  /**
   * Whether transitions should trigger when the search params change.
   */
  enableSearchTransitions?: boolean,
}>;

export function ViewTransitions({
  children,
  enableHashTransitions = false,
  enableSearchTransitions = false,
}: ViewTransitionsProps) {
  const [finishViewTransition, setFinishViewTransition] = useState<
    null | (() => void)
  >(null)

  useEffect(() => {
    if (finishViewTransition) {
      finishViewTransition()
      setFinishViewTransition(null)
    }
  }, [finishViewTransition])

  useBrowserNativeTransitions({ 
    enableHashTransitions: enableHashTransitions,
    enableSearchTransitions: enableSearchTransitions,
  })

  return (
    <ViewTransitionsContext.Provider value={setFinishViewTransition}>
      {children}
    </ViewTransitionsContext.Provider>
  )
}

export function useSetFinishViewTransition() {
  const context = use(ViewTransitionsContext)

  if (!context) {
    throw new Error(
      'useSetFinishViewTransition must be used within a ViewTransitions component',
    )
  }

  return context
}
