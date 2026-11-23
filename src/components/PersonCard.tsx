import { CreditCard, PiggyBank, Receipt, Wallet } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import type { PersonResult } from '../calculations'
import { formatMoney } from '../format'
import type { BudgetLine, Person, Purchase } from '../schema'
import type { LineList as LineListName } from '../store/reducer'
import { LineList } from './LineList'
import { PurchaseList } from './PurchaseList'
import { avatarColours } from './styles'

interface Props {
  person: Person
  result: PersonResult
  index: number
  /** This person's fraction of shared spend (0–1). */
  shareFraction: number
  sharedSpend: number
  cardIsSetUp: boolean
  /** False for closed periods: renaming only makes sense on the live person. */
  canEditName: boolean
  purchases: Purchase[]
  defaultPurchaseDate: string
  onRename: (name: string) => void
  onAddLine: (list: LineListName) => void
  onUpdateLine: (list: LineListName, lineId: string, changes: Partial<Omit<BudgetLine, 'id'>>) => void
  onRemoveLine: (list: LineListName, lineId: string) => void
  onAddPurchase: (purchase: Omit<Purchase, 'id' | 'personId'>) => void
  onRemovePurchase: (purchaseId: string) => void
}

/**
 * One person's card, in four sections: Income, Expenses, Visa, then Left over
 * (income − expenses − total Visa owing, all monthly).
 */
export function PersonCard(props: Props) {
  const { person, result, index, canEditName } = props
  const green = result.balance >= 0

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
          <NameInput name={person.name} onRename={props.onRename} />
        ) : (
          <h3 className="text-2xl font-extrabold text-slate-900">{person.name}</h3>
        )}
      </header>

      <div className="flex flex-1 flex-col divide-y divide-dashed divide-slate-200">
        <Section icon={<Wallet className="size-5" aria-hidden />} title="Income" tint="text-sky-500">
          <LineList
            kind="income"
            personName={person.name}
            lines={person.incomes}
            namePlaceholder="Income"
            onAdd={() => props.onAddLine('incomes')}
            onUpdate={(lineId, changes) => props.onUpdateLine('incomes', lineId, changes)}
            onRemove={(lineId) => props.onRemoveLine('incomes', lineId)}
          />
          <Row label="Monthly income" value={formatMoney(result.monthlyIncome)} strong />
        </Section>

        <Section icon={<Receipt className="size-5" aria-hidden />} title="Expenses" tint="text-amber-500">
          <LineList
            kind="expense"
            personName={person.name}
            lines={person.expenses}
            namePlaceholder="Expense"
            onAdd={() => props.onAddLine('expenses')}
            onUpdate={(lineId, changes) => props.onUpdateLine('expenses', lineId, changes)}
            onRemove={(lineId) => props.onRemoveLine('expenses', lineId)}
          />
          <Row
            label="Monthly expenses"
            hint="Non-Visa costs, like rent or mortgage"
            value={formatMoney(result.monthlyExpenses)}
            strong
          />
        </Section>

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
          <div className="py-1">
            <PurchaseList
              personName={person.name}
              purchases={props.purchases}
              defaultDate={props.defaultPurchaseDate}
              onAdd={props.onAddPurchase}
              onRemove={props.onRemovePurchase}
            />
          </div>
          <Row label="Personal purchases" value={formatMoney(result.personalPurchases)} />
          <Row label="Total Visa owing" value={formatMoney(result.totalVisaOwing)} strong />
        </Section>

        <div className="mt-auto pt-5">
          <section
            aria-label={`${person.name} left over`}
            className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${
              green ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            <div>
              <h4 className="flex items-center gap-2 font-bold">
                <PiggyBank className="size-5" aria-hidden />
                Left over
              </h4>
              <p className="text-xs opacity-75">Income − expenses − Visa, per month</p>
            </div>
            <p className="text-2xl font-black tabular-nums">{formatMoney(result.balance)}</p>
          </section>
        </div>
      </div>
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

/** A card section with an icon heading. Sections are separated by a dashed divider. */
function Section({ icon, title, tint, children }: { icon: ReactNode; title: string; tint: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="py-5 first:pt-0">
      <h4 id={headingId} className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-slate-500 uppercase">
        <span className={tint}>{icon}</span>
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function Row({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1">
      <div>
        <p className={strong ? 'font-bold text-slate-800' : 'text-slate-600'}>{label}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
      <p className={`tabular-nums ${strong ? 'text-lg font-black text-slate-900' : 'font-semibold text-slate-700'}`}>{value}</p>
    </div>
  )
}
