import { ArrowRight, CalendarCheck, Check } from 'lucide-react'
import { useState } from 'react'
import { formatMoney, formatPeriodRange, todayIso } from '../format'
import { Modal } from './Modal'
import { ghostButtonClass, primaryButtonClass } from './styles'

interface Props {
  /** Start date of the open period. */
  start: string
  leftover: number
  /** Called with the close date, which ends this period and starts the next. */
  onConfirm: (date: string) => void
}

/** A small secondary button for the hero balance card, styled for its green or red background. */
const onHeroButtonClass =
  'inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5 text-sm font-semibold text-white ' +
  'ring-1 ring-white/40 backdrop-blur-sm transition hover:bg-white/30 active:scale-95 ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60'

/** "Close month" button, with a confirmation dialog before anything happens. */
export function CloseMonth({ start, leftover, onConfirm }: Props) {
  // The close date is fixed when the dialog opens, so what it shows is what gets saved.
  const [closeDate, setCloseDate] = useState<string | null>(null)

  return (
    <>
      <button type="button" className={onHeroButtonClass} onClick={() => setCloseDate(todayIso())}>
        <CalendarCheck className="size-4" aria-hidden />
        Close month
      </button>
      {closeDate && (
        <CloseMonthDialog
          start={start}
          closeDate={closeDate}
          leftover={leftover}
          onCancel={() => setCloseDate(null)}
          onConfirm={() => {
            setCloseDate(null)
            onConfirm(closeDate)
          }}
        />
      )}
    </>
  )
}

function CloseMonthDialog({
  start,
  closeDate,
  leftover,
  onCancel,
  onConfirm,
}: {
  start: string
  closeDate: string
  leftover: number
  onCancel: () => void
  onConfirm: () => void
}) {
  // Same rule as the reducer: a close date before the start counts as the start.
  const end = closeDate < start ? start : closeDate
  const range = formatPeriodRange({ start, end })

  return (
    <Modal title={`Close ${range}?`} onCancel={onCancel}>
      <p className="mb-3 text-slate-600">Close {range} to save it to history and start fresh.</p>
      <p className={`mb-4 font-semibold ${leftover < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
        {leftover < 0
          ? `This period finishes ${formatMoney(-leftover)} in the red.`
          : `This period finishes with ${formatMoney(leftover)} left over.`}
      </p>
      <ul className="space-y-1.5 text-sm text-slate-600">
        <li className="flex gap-2">
          <Check className="size-4 shrink-0 text-emerald-500" aria-hidden />
          Saved to history, with everyone’s pay and housing as they are now
        </li>
        <li className="flex gap-2">
          <Check className="size-4 shrink-0 text-emerald-500" aria-hidden />
          A new period starts today, {formatPeriodRange({ start: end, end: null })}
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
