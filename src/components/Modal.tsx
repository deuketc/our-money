import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

interface Props {
  title: string
  onCancel: () => void
  children: ReactNode
}

/**
 * A simple modal dialog. Escape or the X cancels; focus moves to the element
 * marked `data-autofocus` and returns where it was when the dialog closes.
 */
export function Modal({ title, onCancel, children }: Props) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef(onCancel)
  useEffect(() => {
    cancelRef.current = onCancel
  })

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-[2rem] bg-white p-6 text-left shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-2xl font-extrabold text-slate-900">
            {title}
          </h2>
          <button type="button" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Cancel" onClick={onCancel}>
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
