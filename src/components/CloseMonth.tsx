import { ArrowRight, CalendarCheck, Check } from 'lucide-react'
import { useState } from 'react'
import { formatMoney, formatPeriodLabel } from '../format'
import { Modal } from './Modal'
import { ghostButtonClass, primaryButtonClass } from './styles'

interface Props {
  periodId: string
  leftover: number
  onConfirm: () => void
}

/** A small secondary button for the hero balance card, styled for its green or red background. */
const onHeroButtonClass =
  'inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5 text-sm font-semibold text-white ' +
  'ring-1 ring-white/40 backdrop-blur-sm transition hover:bg-white/30 active:scale-95 ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60'

/** "Close month" button, with a confirmation dialog before anything happens. */
export function CloseMonth({ periodId, leftover, onConfirm }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className={onHeroButtonClass} onClick={() => setOpen(true)}>
        <CalendarCheck className="size-4" aria-hidden />
        Close month
      </button>
      {open && (
        <CloseMonthDialog
          periodId={periodId}
          leftover={leftover}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            setOpen(false)
            onConfirm()
          }}
        />
      )}
    </>
  )
}

function CloseMonthDialog({ periodId, leftover, onCancel, onConfirm }: Props & { onCancel: () => void }) {
  const month = formatPeriodLabel(periodId)
  return (
    <Modal title={`Close ${month}?`} onCancel={onCancel}>
      <p className="mb-3 text-slate-600">Close {month} to save it to history and start fresh.</p>
      <p className={`mb-4 font-semibold ${leftover < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
        {leftover < 0
          ? `This month finishes ${formatMoney(-leftover)} in the red.`
          : `This month finishes with ${formatMoney(leftover)} left over.`}
      </p>
      <ul className="space-y-1.5 text-sm text-slate-600">
        <li className="flex gap-2">
          <Check className="size-4 shrink-0 text-emerald-500" aria-hidden />
          Saved to history, with everyone’s pay and housing as they are now
        </li>
        <li className="flex gap-2">
          <Check className="size-4 shrink-0 text-emerald-500" aria-hidden />
          People, pay, housing, card limit and pinned notes carry over
        </li>
        <li className="flex gap-2">
          <ArrowRight className="size-4 shrink-0 text-slate-400" aria-hidden />
          Personal purchases and unpinned notes start fresh
        </li>
      </ul>

      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className={ghostButtonClass} onClick={onCancel} data-autofocus>
          Cancel
        </button>
        <button type="button" className={primaryButtonClass} onClick={onConfirm}>
          <CalendarCheck className="size-4" aria-hidden />
          Close month
        </button>
      </div>
    </Modal>
  )
}
