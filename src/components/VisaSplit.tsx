import { Equal, Minus, Split } from 'lucide-react'
import type { PeriodResult } from '../calculations'
import { formatMoney } from '../format'
import { avatarColours, cardClass } from './styles'

interface Props {
  result: PeriodResult
  /** Each person's fraction of shared spend, by person id. */
  fractions: Map<string, number>
}

export function VisaSplit({ result, fractions }: Props) {
  const { card, people } = result
  const withPurchases = people.filter((p) => p.personalPurchases > 0)

  return (
    <section aria-label="How the Visa splits" className={`${cardClass} flex flex-col`}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-wide text-slate-500 uppercase">
        <Split className="size-5 text-pink-500" aria-hidden />
        How the Visa splits
      </h2>

      <dl className="space-y-2 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-baseline justify-between">
          <dt className="text-slate-600">Owing</dt>
          <dd className="font-semibold tabular-nums">{formatMoney(card.owing)}</dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="flex items-center gap-1.5 text-slate-600">
            <Minus className="size-4 text-slate-400" aria-hidden />
            Personal purchases
          </dt>
          <dd className="font-semibold tabular-nums">{formatMoney(card.personalSpend)}</dd>
        </div>
        {withPurchases.map((p) => (
          <div key={p.personId} className="flex items-baseline justify-between pl-6 text-sm text-slate-400">
            <dt>{p.name}</dt>
            <dd className="tabular-nums">{formatMoney(p.personalPurchases)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between border-t border-slate-200 pt-2">
          <dt className="flex items-center gap-1.5 font-bold text-slate-800">
            <Equal className="size-4 text-slate-400" aria-hidden />
            Shared
          </dt>
          <dd className="text-lg font-black tabular-nums">{formatMoney(card.sharedSpend)}</dd>
        </div>
      </dl>

      {card.sharedSpend < 0 && (
        <p className="mt-2 text-sm text-amber-700">
          More personal spending is logged than the card owes. Check the available amount.
        </p>
      )}

      <h3 className="mt-5 mb-2 font-bold text-slate-700">What each person pays</h3>
      <ul className="space-y-2">
        {people.map((p, index) => (
          <li key={p.personId} className="flex items-center gap-3 rounded-2xl border border-slate-100 px-3 py-2">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl font-black ${
                avatarColours[index % avatarColours.length]
              }`}
              aria-hidden
            >
              {p.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800">{p.name}</p>
              <p className="text-xs text-slate-400">
                {Math.round((fractions.get(p.personId) ?? 0) * 100)}% of shared {formatMoney(p.sharedVisaOwing)}
                {p.personalPurchases > 0 && ` + personal ${formatMoney(p.personalPurchases)}`}
              </p>
            </div>
            <p className="text-lg font-black tabular-nums text-slate-900">{formatMoney(p.totalVisaOwing)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
