import { ArrowRight, CalendarCheck, Check, PiggyBank } from 'lucide-react'
import { useState } from 'react'
import { formatMoney, formatPeriodLabel } from '../format'
import { Modal } from './Modal'
import { MoneyInput } from './MoneyInput'
import { ghostButtonClass, primaryButtonClass } from './styles'

interface Props {
  periodId: string
  leftover: number
  goalName: string
  /** savedToSavings: the amount to add to savings, or null to skip. */
  onConfirm: (savedToSavings: number | null) => void
}

export function CloseMonth({ periodId, leftover, goalName, onConfirm }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <section className="flex flex-col items-center gap-3 rounded-[2rem] border-2 border-dashed border-violet-200 bg-white/50 p-6 text-center">
      <p className="text-slate-600">
        Finished with {formatPeriodLabel(periodId)}? Close it to save it to history and start fresh.
      </p>
      <button type="button" className={`${primaryButtonClass} px-6 py-3 text-lg`} onClick={() => setOpen(true)}>
        <CalendarCheck className="size-5" aria-hidden />
        Close month
      </button>
      {open && (
        <CloseMonthDialog
          periodId={periodId}
          leftover={leftover}
          goalName={goalName}
          onCancel={() => setOpen(false)}
          onConfirm={(amount) => {
            setOpen(false)
            onConfirm(amount)
          }}
        />
      )}
    </section>
  )
}

function CloseMonthDialog({
  periodId,
  leftover,
  goalName,
  onCancel,
  onConfirm,
}: Omit<Props, 'onConfirm'> & { onCancel: () => void; onConfirm: (amount: number | null) => void }) {
  const suggested = Math.max(0, Math.round(leftover * 100) / 100)
  const [addToSavings, setAddToSavings] = useState(suggested > 0)
  const [amount, setAmount] = useState(suggested)

  return (
    <Modal title={`Close ${formatPeriodLabel(periodId)}?`} onCancel={onCancel}>
        <ul className="mb-5 space-y-1.5 text-sm text-slate-600">
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

        <div className="rounded-2xl bg-pink-50 p-4">
          <label className="flex items-center gap-3 font-semibold text-slate-800">
            <input
              type="checkbox"
              className="size-5 accent-pink-500"
              checked={addToSavings}
              onChange={(e) => setAddToSavings(e.target.checked)}
            />
            <PiggyBank className="size-5 text-pink-500" aria-hidden />
            Add to {goalName || 'savings'}
          </label>
          <p className="mt-1 ml-8 text-sm text-slate-500">
            {leftover > 0 ? `You have ${formatMoney(leftover)} left over.` : 'Nothing left over this month.'}
          </p>
          {addToSavings && (
            <MoneyInput className="mt-3 ml-8" label="Amount to save" value={amount} onChange={setAmount} />
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={ghostButtonClass} onClick={onCancel} data-autofocus>
            Cancel
          </button>
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => onConfirm(addToSavings && amount > 0 ? amount : null)}
          >
            <CalendarCheck className="size-4" aria-hidden />
            Close month
          </button>
        </div>
    </Modal>
  )
}
