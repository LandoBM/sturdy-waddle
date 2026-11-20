import type { ReactNode } from 'react'

/** Expected shared-sheet host contract; optional until the host is wired by App. */
export type SharedBottomSheetConfig = {
  id: string
  title?: string
  content: ReactNode
  onDismiss?: () => void
}

export type SharedBottomSheetPresenter = (config: SharedBottomSheetConfig) => void
