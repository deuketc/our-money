import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { toMonthly } from '../calculations'
import { formatMoney } from '../format'
import type { BudgetLine, Frequency } from '../schema'
import { MoneyInput } from './MoneyInput'
import { fieldRowClass, inputClass } from './styles'

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

interface Props {
  /** "income" or "expense", used in labels: "Add income", "Jo's income lines". */
  kind: 'income' | 'expense'
  personName: string
  lines: BudgetLine[]
  /** Shown in an empty name box, and used to label a line with no name. */
  namePlaceholder: string
  onAdd: () => void
  onUpdate: (lineId: string, changes: Partial<Omit<BudgetLine, 'id'>>) => void
  onRemove: (lineId: string) => void
}

const smallButtonClass =
  'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold text-violet-600 transition ' +
  'hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300'

/**
 * Editable income or expense lines: a name, an amount and how often it's
 * paid. Each line can be removed while there's more than one.
 */
export function LineList({ kind, personName, lines, namePlaceholder, onAdd, onUpdate, onRemove }: Props) {
  const canRemove = lines.length > 1
  // After "Add", the new line (at this index) focuses its name box when it mounts.
  const [focusIndex, setFocusIndex] = useState<number | null>(null)

  return (
    <div className={`space-y-2 ${fieldRowClass}`}>
      <ul className="space-y-2" aria-label={`${personName}'s ${kind} lines`}>
        {lines.map((line, index) => {
          const label = line.name.trim() || namePlaceholder
          const monthly = toMonthly(line.amount, line.frequency)
          return (
            <li key={line.id} role="group" aria-label={label} className="space-y-2 rounded-2xl bg-slate-50 p-2">
              <div className="flex items-center gap-2">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">{kind === 'income' ? 'Income name' : 'Expense name'}</span>
                  <input
                    className={inputClass}
                    value={line.name}
                    placeholder={namePlaceholder}
                    maxLength={100}
                    autoFocus={index === focusIndex}
                    onFocus={() => setFocusIndex(null)}
                    onChange={(e) => onUpdate(line.id, { name: e.target.value })}
                  />
                </label>
                {canRemove && (
                  <button
                    type="button"
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-100 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                    aria-label={`Remove ${label}`}
                    onClick={() => onRemove(line.id)}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                <MoneyInput label="Amount" hideLabel value={line.amount} onChange={(amount) => onUpdate(line.id, { amount })} />
                <label>
                  <span className="sr-only">Frequency</span>
                  <select
                    className={`${inputClass} pr-8`}
                    value={line.frequency}
                    onChange={(e) => onUpdate(line.id, { frequency: e.target.value as Frequency })}
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {line.frequency !== 'monthly' && line.amount > 0 && (
                <p className="px-1 text-xs text-slate-400">{formatMoney(monthly)} a month</p>
              )}
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        className={smallButtonClass}
        onClick={() => {
          setFocusIndex(lines.length)
          onAdd()
        }}
      >
        <Plus className="size-4" aria-hidden />
        Add {kind}
      </button>
    </div>
  )
}
