import { BellRing, CalendarDays, Check, ChevronDown, Clock, Download, PiggyBank, Upload, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { daysSince, isBackupDue, isUpdateStale } from '../calculations'
import { formatDate, formatPeriodLabel, formatRelative } from '../format'
import type { AppData } from '../schema'
import { useNow } from '../useNow'
import { ghostButtonClass, pageWidthClass, primaryButtonClass } from './styles'

export type BackupStatus = 'idle' | 'working' | 'done'

interface Props {
  data: AppData
  selectedPeriodId: string
  onSelectPeriod: (periodId: string) => void
  /** Person using the app on this device, if chosen. */
  meId: string | null
  onChangeMe: (personId: string) => void
  onRestore: () => void
  onBackUp: () => void
  backupStatus: BackupStatus
  /** ISO timestamp of this browser's last backup, or null if never. */
  lastBackupAt: string | null
}

export function Header(props: Props) {
  const { data, selectedPeriodId, backupStatus, lastBackupAt } = props
  const now = useNow()
  const { lastUpdated } = data
  const updatedBy = data.people.find((p) => p.id === lastUpdated?.by)?.name
  const updateStale = lastUpdated !== null && isUpdateStale(lastUpdated.at, now)
  const backupDue = isBackupDue(lastBackupAt, now)
  const newestFirst = [...data.periods].sort((a, b) => b.id.localeCompare(a.id))

  return (
    <header className="z-10 border-b border-orange-100/70 bg-amber-50/80 backdrop-blur-md sm:sticky sm:top-0">
      <div className={`mx-auto flex ${pageWidthClass} flex-wrap items-center gap-x-3 gap-y-3 px-4 pt-3 pb-2`}>
        <div className="mr-auto flex items-center gap-2.5">
          <div className="flex size-10 rotate-[-6deg] items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-orange-400 text-white shadow-md shadow-pink-300/50">
            <PiggyBank className="size-6" strokeWidth={2} aria-hidden />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Our Money</h1>
        </div>

        <PickerSelect
          id="period-picker"
          label="Month"
          icon={<CalendarDays className="size-4 text-violet-500" aria-hidden />}
          value={selectedPeriodId}
          onChange={props.onSelectPeriod}
        >
          {newestFirst.map((period) => (
            <option key={period.id} value={period.id}>
              {formatPeriodLabel(period.id)}
              {period.status === 'closed' ? ' (closed)' : ''}
            </option>
          ))}
        </PickerSelect>

        {data.people.length > 1 && (
          <PickerSelect
            id="me-picker"
            label="Who's using Our Money"
            icon={<UserRound className="size-4 text-pink-500" aria-hidden />}
            value={props.meId ?? ''}
            onChange={props.onChangeMe}
            highlight={props.meId === null}
          >
            {props.meId === null && (
              <option value="" disabled>
                Who are you?
              </option>
            )}
            {data.people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </PickerSelect>
        )}

        <div className="flex items-center gap-2">
          <p className="mr-1 text-right text-xs leading-tight text-slate-500">
            Last backed up
            <br />
            <span className={`font-semibold ${lastBackupAt ? 'text-slate-700' : 'text-amber-700'}`}>
              {lastBackupAt ? formatDate(lastBackupAt) : 'Never'}
            </span>
          </p>
          <button type="button" className={`${ghostButtonClass} bg-white shadow-sm`} onClick={props.onRestore}>
            <Upload className="size-4" aria-hidden />
            Restore
          </button>
          <button
            type="button"
            className={primaryButtonClass}
            onClick={props.onBackUp}
            disabled={backupStatus === 'working'}
          >
            {backupStatus === 'done' ? <Check className="size-4" aria-hidden /> : <Download className="size-4" aria-hidden />}
            {backupStatus === 'done' ? 'Backed up' : 'Back up'}
          </button>
        </div>
      </div>

      {(lastUpdated || backupDue) && (
        <div className={`mx-auto flex ${pageWidthClass} flex-col gap-1.5 px-4 pb-2.5`}>
          {lastUpdated &&
            (updateStale ? (
              <Reminder>
                <strong>It’s been {daysSince(lastUpdated.at, now)} days since the last update.</strong>
                {updatedBy ? ` ${updatedBy} made the last change.` : ''} A quick check-in keeps the numbers right.
              </Reminder>
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-slate-500">
                <Clock className="size-3.5" aria-hidden />
                Updated {formatRelative(lastUpdated.at, now)}
                {updatedBy ? ` by ${updatedBy}` : ''}
              </p>
            ))}
          {backupDue && lastBackupAt && (
            <Reminder icon={<Download className="size-4 shrink-0" aria-hidden />}>
              <strong>It’s been {daysSince(lastBackupAt, now)} days since your last backup.</strong> Back up now to keep
              a safe copy of your numbers.
            </Reminder>
          )}
        </div>
      )}
    </header>
  )
}

function Reminder({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-1.5 text-sm text-amber-900">
      {icon ?? <BellRing className="size-4 shrink-0" aria-hidden />}
      <span>{children}</span>
    </p>
  )
}

function PickerSelect({
  id,
  label,
  icon,
  value,
  onChange,
  highlight,
  children,
}: {
  id: string
  label: string
  icon: ReactNode
  value: string
  onChange: (value: string) => void
  highlight?: boolean
  children: ReactNode
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">{icon}</span>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        className={`appearance-none rounded-xl border-2 bg-white py-2 pr-9 pl-9 font-semibold text-slate-700 shadow-sm transition outline-none hover:border-violet-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-200/60 ${
          highlight ? 'border-pink-300 ring-4 ring-pink-100' : 'border-violet-100'
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
    </div>
  )
}
