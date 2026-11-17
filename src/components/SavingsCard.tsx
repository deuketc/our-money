import { PartyPopper, PiggyBank, TrendingUp } from 'lucide-react'
import { averageSaved, goalDate } from '../calculations'
import { formatMoney, formatPeriodLabel } from '../format'
import type { AppData, Savings } from '../schema'
import { MoneyInput } from './MoneyInput'
import { cardClass, inputClass } from './styles'

interface Props {
  data: AppData
  onUpdate: (changes: Partial<Savings>) => void
}

function projection(data: AppData): string {
  const { current, goalAmount } = data.savings
  if (goalAmount <= 0) return 'Set a goal amount to see when you’ll get there.'
  if (current >= goalAmount) return ''
  const average = averageSaved(data.periods)
  if (average === null) return 'Close a month and add the leftover to savings to see a projection.'
  const date = goalDate(data, data.currentPeriodId)
  if (date === null) return `At ${formatMoney(average)} a month, you won’t reach this goal. Try saving a little more.`
  return `At this rate you’ll hit your goal by ${formatPeriodLabel(date)}.`
}

export function SavingsCard({ data, onUpdate }: Props) {
  const { goalName, goalAmount, current, interestRate } = data.savings
  const progress = goalAmount > 0 ? Math.min(Math.max(current / goalAmount, 0), 1) : 0
  const reached = goalAmount > 0 && current >= goalAmount
  const average = averageSaved(data.periods)

  return (
    <section aria-label="Savings goal" className={`${cardClass} flex flex-col gap-4`}>
      <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-500 uppercase">
        <PiggyBank className="size-5 text-pink-500" aria-hidden />
        Our savings goal
      </h2>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-600">Saving for</span>
        <input
          className={`${inputClass} text-lg font-bold`}
          value={goalName}
          maxLength={100}
          placeholder="Holiday, house deposit, rainy day…"
          onChange={(e) => onUpdate({ goalName: e.target.value })}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <MoneyInput label="Saved so far" value={current} onChange={(value) => onUpdate({ current: value })} />
        <MoneyInput label="Goal" value={goalAmount} onChange={(value) => onUpdate({ goalAmount: value })} />
      </div>

      <div>
        <div
          className="h-5 overflow-hidden rounded-full bg-pink-100"
          role="progressbar"
          aria-label="Savings progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-400 to-orange-400 transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="mt-1.5 flex justify-between px-1 text-sm font-semibold text-slate-600">
          <span className="tabular-nums">
            {formatMoney(current)} of {formatMoney(goalAmount)}
          </span>
          <span className="tabular-nums">{Math.round(progress * 100)}%</span>
        </p>
      </div>

      <p
        className={`flex items-start gap-2 rounded-2xl px-4 py-3 font-semibold ${
          reached ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-800'
        }`}
      >
        {reached ? (
          <PartyPopper className="mt-0.5 size-5 shrink-0" aria-hidden />
        ) : (
          <TrendingUp className="mt-0.5 size-5 shrink-0" aria-hidden />
        )}
        {reached ? `You did it! ${goalName || 'Your goal'} is fully saved.` : projection(data)}
      </p>

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-dashed border-slate-200 pt-3 text-sm text-slate-500">
        <p>{average !== null ? `Averaging ${formatMoney(average)} saved a month recently.` : 'No months saved yet.'}</p>
        <MoneyInput
          className="w-28 shrink-0"
          label="Interest a year"
          value={Math.round(interestRate * 10000) / 100}
          onChange={(value) => onUpdate({ interestRate: value / 100 })}
          prefix=""
          suffix="%"
          max={100}
        />
      </div>
    </section>
  )
}
