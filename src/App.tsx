import { History, TriangleAlert, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { calculatePeriod, shareFractions } from './calculations'
import { AddPersonCard } from './components/AddPersonCard'
import { CloseMonth } from './components/CloseMonth'
import { FirstRun } from './components/FirstRun'
import { Header, type BackupStatus } from './components/Header'
import { HeroBalance } from './components/HeroBalance'
import { Modal } from './components/Modal'
import { Notice, type NoticeData } from './components/Notice'
import { NotesPanel } from './components/NotesPanel'
import { PersonCard } from './components/PersonCard'
import { dangerButtonClass, ghostButtonClass, pageWidthClass } from './components/styles'
import { VisaCard } from './components/VisaCard'
import { VisaSplit } from './components/VisaSplit'
import { FileTooBigError, openFile, saveToFile } from './fileSave'
import { formatDate, formatPeriodRange, todayIso } from './format'
import { useLastBackup } from './lastBackup'
import { mainLayout } from './layout'
import { parseSaveFile } from './saveFile'
import type { AppData, Period } from './schema'
import { createPerson, type Action } from './store/reducer'
import { useAppStore } from './store/useAppStore'
import { usePreference } from './usePreference'

const newId = () => crypto.randomUUID()

/** Today if it falls inside the period (an open one has no end yet), otherwise the period's start. */
function defaultDateFor(period: Period): string {
  const today = todayIso()
  return today >= period.start && (period.end === null || today <= period.end) ? today : period.start
}

interface PendingRestore {
  data: AppData
  fileName: string
  remember: () => Promise<void>
}

export default function App() {
  const { state, dispatch } = useAppStore()
  const [selectedId, setSelectedId] = useState(state.currentPeriodId)
  const [backupStatus, setBackupStatus] = useState<BackupStatus>('idle')
  const [notice, setNotice] = useState<NoticeData | null>(null)
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null)
  const [storedMeId, setMeId] = usePreference('our-money:me')
  const [lastBackupAt, setLastBackupAt] = useLastBackup()

  // Who's making changes on this device. With one person it's always them.
  const meId = state.people.some((p) => p.id === storedMeId) ? storedMeId : null
  const by = meId ?? (state.people.length === 1 ? state.people[0].id : null)
  /** Dispatch, crediting the current user (or `fallback` if unknown). */
  const act = (action: Action, fallback: string | null = null) => dispatch(action, by ?? fallback)

  // After a month closes, jump to the new current month.
  const [lastCurrentId, setLastCurrentId] = useState(state.currentPeriodId)
  if (state.currentPeriodId !== lastCurrentId) {
    setLastCurrentId(state.currentPeriodId)
    setSelectedId(state.currentPeriodId)
  }

  useEffect(() => {
    if (backupStatus !== 'done') return
    const timer = setTimeout(() => setBackupStatus('idle'), 2000)
    return () => clearTimeout(timer)
  }, [backupStatus])

  useEffect(() => {
    if (notice?.kind !== 'success') return
    const timer = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(timer)
  }, [notice])

  const addPerson = (name: string) => {
    const id = newId()
    const firstPerson = state.people.length === 0
    act({
      type: 'addPerson',
      person: createPerson({ id, salaryLineId: newId(), housingLineId: newId() }, name),
    })
    if (firstPerson) setMeId(id)
  }

  const restore = async ({ data, fileName, remember }: PendingRestore) => {
    setPendingRestore(null)
    dispatch({ type: 'replaceState', data })
    setSelectedId(data.currentPeriodId)
    setLastCurrentId(data.currentPeriodId)
    await remember()
    setNotice({ kind: 'success', message: `Restored from ${fileName}.` })
  }

  const handleRestore = async () => {
    setNotice(null)
    try {
      const opened = await openFile()
      if (!opened) return
      const parsed = parseSaveFile(opened.text)
      if (!parsed.ok) {
        setNotice({ kind: 'error', message: parsed.message, details: parsed.details })
        return
      }
      const pending = { data: parsed.data, fileName: opened.fileName, remember: opened.remember }
      // Nothing here to overwrite yet: restore straight away.
      if (state.people.length === 0) await restore(pending)
      else setPendingRestore(pending)
    } catch (error) {
      setNotice({
        kind: 'error',
        message:
          error instanceof FileTooBigError
            ? 'That file is too big to be an Our Money backup. Nothing was changed.'
            : "Couldn't restore from that file. Nothing was changed.",
      })
    }
  }

  const handleBackUp = async () => {
    setBackupStatus('working')
    setNotice(null)
    try {
      const outcome = await saveToFile(state)
      if (outcome.status === 'cancelled') return setBackupStatus('idle')
      setBackupStatus('done')
      setLastBackupAt(new Date().toISOString())
      setNotice({
        kind: 'success',
        message:
          outcome.status === 'saved'
            ? `Backed up to ${outcome.fileName}.`
            : `Downloaded a backup, ${outcome.fileName}. This browser can't save back to the same file, so keep the newest copy.`,
      })
    } catch {
      setBackupStatus('idle')
      setNotice({ kind: 'error', message: "Couldn't back up. Your data is still kept in this browser." })
    }
  }

  // Changes made since the last backup would be lost by a restore.
  const unbackedChanges =
    state.lastUpdated !== null && (lastBackupAt === null || lastBackupAt < state.lastUpdated.at)

  const noticeBanner = notice && <Notice notice={notice} onDismiss={() => setNotice(null)} />
  const restoreDialog = pendingRestore && (
    <Modal title={`Restore from ${pendingRestore.fileName}?`} onCancel={() => setPendingRestore(null)}>
      <p className="flex gap-2 rounded-2xl bg-rose-50 p-3 font-semibold text-rose-800">
        <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
        This will overwrite everything in Our Money right now with what’s in the backup. It can’t be undone.
      </p>
      <p className="mt-3 text-slate-600">
        People, pay, the Visa, purchases, notes and every past month are replaced.{' '}
        {unbackedChanges
          ? lastBackupAt
            ? `You’ve made changes since your last backup on ${formatDate(lastBackupAt)}. Back up first if you want to keep them.`
            : 'You haven’t backed up yet. Back up first if you want to keep your current numbers.'
          : 'Everything here is already in your last backup.'}
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className={ghostButtonClass} onClick={() => setPendingRestore(null)} data-autofocus>
          Cancel
        </button>
        <button type="button" className={dangerButtonClass} onClick={() => restore(pendingRestore)}>
          <Upload className="size-4" aria-hidden />
          Overwrite and restore
        </button>
      </div>
    </Modal>
  )

  if (state.people.length === 0) {
    return <FirstRun onAddPerson={addPerson} onRestore={handleRestore} notice={noticeBanner} />
  }

  const period =
    state.periods.find((p) => p.id === selectedId) ??
    state.periods.find((p) => p.id === state.currentPeriodId)!
  const isClosed = period.status === 'closed'
  const periodLabel = formatPeriodRange(period)
  const people = period.snapshot?.people ?? state.people
  const card = period.snapshot?.card ?? state.card
  const result = calculatePeriod(state, period)
  const fractions = shareFractions(people, card)
  const layout = mainLayout(people.length)

  return (
    <div className="min-h-screen pb-16">
      <Header
        data={state}
        selectedPeriodId={period.id}
        onSelectPeriod={setSelectedId}
        meId={meId}
        onChangeMe={setMeId}
        onRestore={handleRestore}
        onBackUp={handleBackUp}
        backupStatus={backupStatus}
        lastBackupAt={lastBackupAt}
      />

      <main className={`mx-auto space-y-6 px-4 pt-6 ${pageWidthClass}`}>
        {noticeBanner}

        {isClosed && (
          <p className="flex items-start gap-2 rounded-2xl bg-sky-100 px-4 py-3 text-sm font-medium text-sky-800">
            <History className="mt-0.5 size-4 shrink-0" aria-hidden />
            {periodLabel} is closed. It uses the income, expenses and card limit saved when it closed, so changes here
            only affect this period.
          </p>
        )}

        {/*
          Below xl: hero, people, the Visa and its split, then notes, stacked.
          xl: hero full width, then a column per person and a Visa/split/notes column.
          3xl: four columns, with the hero moving to the top of the last one.
          See layout.ts.
        */}
        <div className={`grid items-start gap-6 ${layout.grid}`}>
          <div className={layout.hero}>
            <HeroBalance
              result={result}
              periodLabel={periodLabel}
              household={people.length > 1}
              action={
                !isClosed && (
                  <CloseMonth
                    start={period.start}
                    leftover={result.summary.balance}
                    onConfirm={(date) => act({ type: 'closeMonth', date, nextPeriodId: newId() })}
                  />
                )
              }
            />
          </div>

          <div className={`grid gap-6 md:grid-cols-2 ${layout.people}`}>
            {people.map((person, index) => (
              <PersonCard
                key={`${period.id}-${person.id}`}
                person={person}
                result={result.people[index]}
                index={index}
                shareFraction={fractions.get(person.id) ?? 0}
                sharedSpend={result.card.sharedSpend}
                cardIsSetUp={card.limit > 0}
                canEditName={!isClosed}
                purchases={period.purchases.filter((p) => p.personId === person.id)}
                defaultPurchaseDate={defaultDateFor(period)}
                onRename={(name) =>
                  act({ type: 'updatePerson', id: person.id, changes: { name }, periodId: period.id }, person.id)
                }
                onAddLine={(list) =>
                  act(
                    {
                      type: 'addLine',
                      personId: person.id,
                      list,
                      line: { id: newId(), name: '', amount: 0, frequency: 'monthly' },
                      periodId: period.id,
                    },
                    person.id,
                  )
                }
                onUpdateLine={(list, lineId, changes) =>
                  act({ type: 'updateLine', personId: person.id, list, lineId, changes, periodId: period.id }, person.id)
                }
                onRemoveLine={(list, lineId) =>
                  act({ type: 'removeLine', personId: person.id, list, lineId, periodId: period.id }, person.id)
                }
                onAddPurchase={(purchase) =>
                  act(
                    {
                      type: 'addPurchase',
                      periodId: period.id,
                      purchase: { ...purchase, id: newId(), personId: person.id },
                    },
                    person.id,
                  )
                }
                onRemovePurchase={(purchaseId) =>
                  act({ type: 'removePurchase', periodId: period.id, purchaseId }, person.id)
                }
              />
            ))}
            {!isClosed && (
              <div className={`grid ${layout.addPerson}`}>
                <AddPersonCard onAdd={addPerson} />
              </div>
            )}
          </div>

          <div className={`flex flex-col gap-6 ${layout.side}`}>
            <div className={`grid gap-6 md:grid-cols-2 xl:grid-cols-1 ${layout.visa}`}>
              <VisaCard
                card={result.card}
                onChangeLimit={(limit) => act({ type: 'updateCard', periodId: period.id, changes: { limit } })}
                onChangeAvailable={(available) => act({ type: 'updateCard', periodId: period.id, changes: { available } })}
              />
              <VisaSplit result={result} fractions={fractions} />
            </div>

            <div className={layout.notes}>
              <NotesPanel
                key={period.id}
                notes={period.notes}
                defaultDate={defaultDateFor(period)}
                onAdd={(note) => act({ type: 'addNote', periodId: period.id, note: { ...note, id: newId() } })}
                onTogglePin={(noteId, pinned) =>
                  act({ type: 'updateNote', periodId: period.id, noteId, changes: { pinned } })
                }
                onRemove={(noteId) => act({ type: 'removeNote', periodId: period.id, noteId })}
              />
            </div>
          </div>
        </div>
      </main>
      {restoreDialog}
    </div>
  )
}
