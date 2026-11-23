import { CreditCard, Receipt, Sparkles, TriangleAlert, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import type { PeriodResult } from '../calculations'
import { formatMoney, formatMoneyWhole } from '../format'

interface Props {
  result: PeriodResult
  /** The period's label, e.g. "15 Dec – now". */
  periodLabel: string
  household: boolean
  /** Shown in the bottom-right corner, e.g. the Close month button. */
  action?: ReactNode
}

export function HeroBalance({ result, periodLabel, household, action }: Props) {
  const { balance, totalIncome, totalExpenses, totalVisaOwing } = result.summary
  const green = balance >= 0

  return (
    <section
      aria-label="Balance"
      className={`relative overflow-hidden rounded-[2rem] p-6 text-white sm:p-8 ${
        green
          ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500 shadow-[0_24px_60px_-12px] shadow-emerald-400/70'
          : 'bg-gradient-to-br from-rose-400 via-rose-500 to-red-500 shadow-[0_24px_60px_-12px] shadow-rose-400/70'
      }`}
    >
      {/* Soft decorative circles */}
      <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/15" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-white/10" aria-hidden />

      <div className="relative">
        <p className="font-semibold text-white/85">
          {household ? 'Household left over' : 'Left over'} · {periodLabel}
        </p>
        <p className="mt-1 text-6xl font-black tracking-tight tabular-nums drop-shadow-sm sm:text-7xl">
          {formatMoneyWhole(balance)}
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 font-bold">
          {green ? <Sparkles className="size-4" aria-hidden /> : <TriangleAlert className="size-4" aria-hidden />}
          {green ? "You're in the green" : "You're in the red"}
        </p>

        {/* Stats bottom-left, action bottom-right. In a narrow card the action wraps under the stats, still on the right. */}
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <dl className="grid w-full grid-cols-3 gap-2 text-sm sm:w-auto sm:max-w-lg sm:flex-1">
            <HeroStat icon={<Wallet className="size-4" aria-hidden />} label="Income" value={totalIncome} />
            <HeroStat icon={<Receipt className="size-4" aria-hidden />} label="Expenses" value={totalExpenses} />
            <HeroStat icon={<CreditCard className="size-4" aria-hidden />} label="Visa" value={totalVisaOwing} />
          </dl>
          {action && <div className="ml-auto">{action}</div>}
        </div>
      </div>
    </section>
  )
}

function HeroStat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/15 px-3 py-2">
      <dt className="flex items-center gap-1.5 text-white/80">
        {icon}
        {label}
      </dt>
      <dd className="font-bold tabular-nums">{formatMoney(value)}</dd>
    </div>
  )
}
