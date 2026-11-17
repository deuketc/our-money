import { CircleAlert, CircleCheck, X } from 'lucide-react'

export interface NoticeData {
  kind: 'success' | 'error'
  message: string
  details?: string[]
}

export function Notice({ notice, onDismiss }: { notice: NoticeData; onDismiss: () => void }) {
  const error = notice.kind === 'error'
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-2xl px-4 py-3 ${
        error ? 'bg-rose-100 text-rose-900' : 'bg-emerald-100 text-emerald-900'
      }`}
    >
      {error ? (
        <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
      ) : (
        <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{notice.message}</p>
        {notice.details && notice.details.length > 0 && (
          <ul className="mt-1 list-disc pl-5 text-sm opacity-80">
            {notice.details.map((detail) => (
              <li key={detail} className="break-words">
                {detail}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" className="rounded-lg p-1 hover:bg-black/5" aria-label="Dismiss" onClick={onDismiss}>
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
