import { Plus, ShoppingBag, X } from 'lucide-react'
import { useState } from 'react'
import { formatMoney, formatShortDate } from '../format'
import type { Purchase } from '../schema'
import { MoneyInput } from './MoneyInput'
import { fieldRowClass, inputClass, primaryButtonClass } from './styles'

interface Props {
  personName: string
  purchases: Purchase[]
  defaultDate: string
  onAdd: (purchase: Omit<Purchase, 'id' | 'personId'>) => void
  onRemove: (purchaseId: string) => void
}

export function PurchaseList({ personName, purchases, defaultDate, onAdd, onRemove }: Props) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(defaultDate)
  // Bumped after each add so the amount input resets.
  const [formKey, setFormKey] = useState(0)

  const canAdd = amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date)

  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
        <ShoppingBag className="size-4 text-pink-500" aria-hidden />
        {personName}'s personal purchases
      </h4>

      {purchases.length === 0 ? (
        <p className="mb-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-400">
          Nothing personal logged yet. Anything not logged is split as shared.
        </p>
      ) : (
        <ul className="mb-3 divide-y divide-slate-100 rounded-xl bg-slate-50 px-3" aria-label={`${personName}'s personal purchases`}>
          {purchases.map((purchase) => (
            <li key={purchase.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-700">{purchase.description || 'Purchase'}</p>
                <p className="text-xs text-slate-400">{formatShortDate(purchase.date)}</p>
              </div>
              <span className="font-semibold tabular-nums text-slate-700">{formatMoney(purchase.amount)}</span>
              <button
                type="button"
                className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-100 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                aria-label={`Remove ${purchase.description || 'purchase'}`}
                onClick={() => onRemove(purchase.id)}
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        key={formKey}
        className={`grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] ${fieldRowClass}`}
        aria-label={`Add a purchase for ${personName}`}
        onSubmit={(e) => {
          e.preventDefault()
          if (!canAdd) return
          onAdd({ description: description.trim(), amount, date })
          setDescription('')
          setAmount(0)
          setFormKey((k) => k + 1)
        }}
      >
        <label className="col-span-2 sm:col-span-3">
          <span className="sr-only">Description</span>
          <input
            className={inputClass}
            placeholder="What was it?"
            value={description}
            maxLength={200}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <MoneyInput label="Amount" hideLabel value={amount} onChange={setAmount} />
        <label>
          <span className="sr-only">Date</span>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <button type="submit" className={`${primaryButtonClass} col-span-2 sm:col-span-1`} disabled={!canAdd}>
          <Plus className="size-4" aria-hidden />
          Add
        </button>
      </form>
    </div>
  )
}
