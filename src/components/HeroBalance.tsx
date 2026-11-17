import { CreditCard, Home, Sparkles, TriangleAlert, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import type { PeriodResult } from '../calculations'
import { formatMoney, formatMoneyWhole, formatPeriodLabel } from '../format'

interface Props {
  result: PeriodResult
  periodId: string
  household: boolean
}

export function HeroBalance({ result, periodId, household }: Props) {
  const { balance, totalSalary, totalHousing, totalVisaOwing } = result.summary
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
          {household ? 'Household left over' : 'Left over'} · {formatPeriodLabel(periodId)}
        </p>
        <p className="mt-1 text-6xl font-black tracking-tight tabular-nums drop-shadow-sm sm:text-7xl">
          {formatMoneyWhole(balance)}
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 font-bold">
          {green ? <Sparkles className="size-4" aria-hidden /> : <TriangleAlert className="size-4" aria-hidden />}
          {green ? "You're in the green" : "You're in the red"}
        </p>

        <dl className="mt-6 grid grid-cols-3 gap-2 text-sm sm:max-w-lg">
          <HeroStat icon={<Wallet className="size-4" aria-hidden />} label="Income" value={totalSalary} />
          <HeroStat icon={<Home className="size-4" aria-hidden />} label="Housing" value={totalHousing} />
          <HeroStat icon={<CreditCard className="size-4" aria-hidden />} label="Visa" value={totalVisaOwing} />
        </dl>
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
