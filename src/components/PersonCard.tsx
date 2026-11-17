import { CreditCard, PiggyBank, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import type { PersonResult } from '../calculations'
import { formatMoney } from '../format'
import type { PayFrequency, Person, Purchase } from '../schema'
import { MoneyInput } from './MoneyInput'
import { PurchaseList } from './PurchaseList'
import { avatarColours, inputClass } from './styles'

const FREQUENCIES: { value: PayFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

interface Props {
  person: Person
  result: PersonResult
  index: number
  /** This person's fraction of shared spend (0–1). */
  shareFraction: number
  sharedSpend: number
  cardIsSetUp: boolean
  /** False for closed months: renaming only makes sense on the live person. */
  canEditName: boolean
  purchases: Purchase[]
  defaultPurchaseDate: string
  onUpdate: (changes: Partial<Omit<Person, 'id'>>) => void
  onAddPurchase: (purchase: Omit<Purchase, 'id' | 'personId'>) => void
  onRemovePurchase: (purchaseId: string) => void
}

export function PersonCard(props: Props) {
  const { person, result, index, canEditName } = props
  const green = result.balance >= 0
  const monthlyNote = person.payFrequency !== 'monthly' && person.salary > 0

  return (
    <article
      aria-label={person.name}
      className="flex flex-col rounded-[2rem] border border-white bg-white/90 p-5 shadow-lg shadow-orange-200/40 sm:p-6"
    >
      <header className="mb-5 flex items-center gap-3">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black ${
            avatarColours[index % avatarColours.length]
          }`}
          aria-hidden
        >
          {person.name.charAt(0).toUpperCase()}
        </div>
        {canEditName ? (
          <NameInput name={person.name} onRename={(name) => props.onUpdate({ name })} />
        ) : (
          <h3 className="text-2xl font-extrabold text-slate-900">{person.name}</h3>
        )}
      </header>

      {/* Income */}
      <Section icon={<Wallet className="size-5" aria-hidden />} title="Income" tint="text-sky-500">
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <MoneyInput label="Salary" value={person.salary} onChange={(salary) => props.onUpdate({ salary })} />
            <label>
              <span className="sr-only">Pay frequency</span>
              <select
                className={`${inputClass} pr-8`}
                value={person.payFrequency}
                onChange={(e) => props.onUpdate({ payFrequency: e.target.value as PayFrequency })}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        <Row
          label={monthlyNote ? 'Per month' : 'Monthly income'}
          value={formatMoney(result.monthlySalary)}
          hint={monthlyNote ? `${person.payFrequency} pay converted to monthly` : undefined}
        />

        <div className="mt-3 border-t border-dashed border-slate-200 pt-3">
          <MoneyInput
            label="Housing"
            placeholder="rent or mortgage"
            value={person.housing}
            onChange={(housing) => props.onUpdate({ housing })}
          />
        </div>
      </Section>

      {/* Visa */}
      <Section icon={<CreditCard className="size-5" aria-hidden />} title="Visa" tint="text-violet-500">
        <Row
          label="Share of shared spend"
          value={formatMoney(result.sharedVisaOwing)}
          hint={
            props.cardIsSetUp
              ? `${Math.round(props.shareFraction * 100)}% of ${formatMoney(props.sharedSpend)} shared`
              : 'Add the card limit and available amount to split shared spending'
          }
        />
        <div className="my-3">
          <PurchaseList
            personName={person.name}
            purchases={props.purchases}
            defaultDate={props.defaultPurchaseDate}
            onAdd={props.onAddPurchase}
            onRemove={props.onRemovePurchase}
          />
        </div>
        <Row label="Total Visa owing" value={formatMoney(result.totalVisaOwing)} strong />
      </Section>

      {/* Left over */}
      <section
        aria-label={`${person.name} left over`}
        className={`mt-auto flex items-center justify-between rounded-2xl px-4 py-3 ${
          green ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
        }`}
      >
        <h4 className="flex items-center gap-2 font-bold">
          <PiggyBank className="size-5" aria-hidden />
          Left over
        </h4>
        <p className="text-2xl font-black tabular-nums">{formatMoney(result.balance)}</p>
      </section>
    </article>
  )
}

function NameInput({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  return (
    <label className="min-w-0 flex-1">
      <span className="sr-only">Name</span>
      {/* Uncontrolled so an empty field while typing never reaches the store. */}
      <input
        key={name}
        defaultValue={name}
        maxLength={100}
        className="w-full rounded-xl border-2 border-transparent bg-transparent px-2 py-1 text-2xl font-extrabold text-slate-900 transition outline-none hover:border-violet-100 hover:bg-violet-50/70 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-200/60"
        onBlur={(e) => {
          const trimmed = e.target.value.trim()
          if (trimmed && trimmed !== name) onRename(trimmed)
          else e.target.value = name
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
    </label>
  )
}

function Section({ icon, title, tint, children }: { icon: ReactNode; title: string; tint: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-slate-500 uppercase">
        <span className={tint}>{icon}</span>
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function Row({ label, value, hint, strong, icon }: { label: string; value: string; hint?: string; strong?: boolean; icon?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1">
      <div>
        <p className={`flex items-center gap-1.5 ${strong ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
          {icon}
          {label}
        </p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
      <p className={`tabular-nums ${strong ? 'text-lg font-black text-slate-900' : 'font-semibold text-slate-700'}`}>{value}</p>
    </div>
  )
}
