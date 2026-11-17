import { CreditCard, Nfc } from 'lucide-react'
import type { PeriodResult } from '../calculations'
import { formatMoney } from '../format'
import { MoneyInput } from './MoneyInput'
import { cardClass } from './styles'

interface Props {
  card: PeriodResult['card']
  /** For a closed month this edits that month's snapshot limit. */
  onChangeLimit: (limit: number) => void
  onChangeAvailable: (available: number) => void
}

function usageLevel(fraction: number) {
  if (fraction <= 0.5) return { bar: 'bg-emerald-500', text: 'text-emerald-700', label: 'Looking good' }
  if (fraction <= 0.8) return { bar: 'bg-orange-400', text: 'text-orange-700', label: 'Getting up there' }
  return { bar: 'bg-rose-500', text: 'text-rose-700', label: 'Nearly maxed out' }
}

export function VisaCard({ card, onChangeLimit, onChangeAvailable }: Props) {
  const usage = card.limit > 0 ? Math.min(Math.max(card.owing / card.limit, 0), 1) : 0
  const level = usageLevel(usage)
  const inCredit = card.owing < 0

  return (
    <section aria-label="Shared Visa" className={`${cardClass} flex flex-col gap-5`}>
      <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-500 uppercase">
        <CreditCard className="size-5 text-violet-500" aria-hidden />
        Shared Visa
      </h2>

      {/* The card itself */}
      <div className="relative mx-auto w-full max-w-sm">
        <div className="relative aspect-[1.586] overflow-hidden rounded-3xl border-b-[6px] border-indigo-900/40 bg-gradient-to-br from-violet-500 via-indigo-600 to-sky-500 p-5 text-white shadow-2xl shadow-indigo-400/50">
          <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-white/15" aria-hidden />
          <div className="pointer-events-none absolute -bottom-28 -left-10 size-56 rounded-full bg-pink-400/30" aria-hidden />

          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between">
              <div className="h-8 w-11 rounded-lg bg-gradient-to-br from-amber-200 to-amber-400 shadow-inner ring-1 ring-amber-500/40" aria-hidden>
                <div className="mx-auto mt-1.5 h-5 w-6 rounded-sm border border-amber-600/30" />
              </div>
              <Nfc className="size-7 text-white/80" aria-hidden />
            </div>

            <div className="mt-auto grid grid-cols-2 gap-3">
              <MoneyInput tone="dark" label="Limit" value={card.limit} onChange={onChangeLimit} />
              <MoneyInput tone="dark" label="Available" value={card.available} onChange={onChangeAvailable} />
            </div>
            <p className="mt-2 text-right text-xl font-black tracking-widest italic text-white/90" aria-hidden>
              VISA
            </p>
          </div>
        </div>
      </div>

      {/* Owing and usage */}
      <div>
        <div className="flex items-baseline justify-between px-1">
          <p className="font-bold text-slate-800">{inCredit ? 'In credit' : 'Owing'}</p>
          <p className="text-3xl font-black tabular-nums text-slate-900">{formatMoney(Math.abs(card.owing))}</p>
        </div>
        <p className="px-1 text-xs text-slate-400">Limit minus available, from your bank statement</p>

        <div
          className="mt-3 h-4 overflow-hidden rounded-full bg-slate-100"
          role="meter"
          aria-label="Card used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(usage * 100)}
        >
          <div className={`h-full rounded-full transition-all duration-500 ${level.bar}`} style={{ width: `${usage * 100}%` }} />
        </div>
        <p className={`mt-1.5 flex justify-between px-1 text-sm font-semibold ${level.text}`}>
          <span>{card.limit > 0 ? level.label : 'Add your card limit to get started'}</span>
          <span className="tabular-nums">{Math.round(usage * 100)}% used</span>
        </p>
      </div>
    </section>
  )
}
