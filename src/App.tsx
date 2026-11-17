import { FolderOpen, History } from 'lucide-react'
import { useEffect, useState } from 'react'
import { calculatePeriod, shareFractions } from './calculations'
import { AddPersonCard } from './components/AddPersonCard'
import { CloseMonth } from './components/CloseMonth'
import { FirstRun } from './components/FirstRun'
import { Header, type SaveStatus } from './components/Header'
import { HeroBalance } from './components/HeroBalance'
import { Modal } from './components/Modal'
import { Notice, type NoticeData } from './components/Notice'
import { NotesPanel } from './components/NotesPanel'
import { PersonCard } from './components/PersonCard'
import { ghostButtonClass, primaryButtonClass } from './components/styles'
import { VisaCard } from './components/VisaCard'
import { VisaSplit } from './components/VisaSplit'
import { FileTooBigError, openFile, saveToFile } from './fileSave'
import { formatPeriodLabel, todayIso } from './format'
import { parseSaveFile } from './saveFile'
import type { AppData, Period } from './schema'
import type { Action } from './store/reducer'
import { useAppStore } from './store/useAppStore'
import { usePreference } from './usePreference'

const newId = () => crypto.randomUUID()

/** Today if it falls inside the period, otherwise the period's start. */
function defaultDateFor(period: Period): string {
  const today = todayIso()
  return today >= period.start && today <= period.end ? today : period.start
}

interface PendingOpen {
  data: AppData
  fileName: string
  remember: () => Promise<void>
}

export default function App() {
  const { state, dispatch } = useAppStore()
  const [selectedId, setSelectedId] = useState(state.currentPeriodId)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [notice, setNotice] = useState<NoticeData | null>(null)
  const [pendingOpen, setPendingOpen] = useState<PendingOpen | null>(null)
  const [storedMeId, setMeId] = usePreference('our-money:me')

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
    if (saveStatus !== 'saved') return
    const timer = setTimeout(() => setSaveStatus('idle'), 2000)
    return () => clearTimeout(timer)
  }, [saveStatus])

  useEffect(() => {
    if (notice?.kind !== 'success') return
    const timer = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(timer)
  }, [notice])

  const addPerson = (name: string) => {
    const id = newId()
    const firstPerson = state.people.length === 0
    act({ type: 'addPerson', person: { id, name, salary: 0, payFrequency: 'fortnightly', housing: 0 } })
    if (firstPerson) setMeId(id)
  }

  const loadFile = async ({ data, fileName, remember }: PendingOpen) => {
    setPendingOpen(null)
    dispatch({ type: 'replaceState', data })
    setSelectedId(data.currentPeriodId)
    setLastCurrentId(data.currentPeriodId)
    await remember()
    setNotice({ kind: 'success', message: `Opened ${fileName}.` })
  }

  const handleOpen = async () => {
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
      // Nothing on screen to lose yet: load straight away.
      if (state.people.length === 0) await loadFile(pending)
      else setPendingOpen(pending)
    } catch (error) {
      setNotice({
        kind: 'error',
        message:
          error instanceof FileTooBigError
            ? "That file is too big to be an Our Money save file. Nothing was loaded."
            : "Couldn't open that file. Nothing was loaded.",
      })
    }
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    setNotice(null)
    try {
      const outcome = await saveToFile(state)
      if (outcome.status === 'cancelled') return setSaveStatus('idle')
      setSaveStatus('saved')
      setNotice({
        kind: 'success',
        message:
          outcome.status === 'saved'
            ? `Saved to ${outcome.fileName}.`
            : `Downloaded ${outcome.fileName}. This browser can't save back to the same file, so keep the newest copy.`,
      })
    } catch {
      setSaveStatus('idle')
      setNotice({ kind: 'error', message: "Couldn't save the file. Your changes are still kept in this browser." })
    }
  }

  const noticeBanner = notice && <Notice notice={notice} onDismiss={() => setNotice(null)} />
  const openDialog = pendingOpen && (
    <Modal title={`Open ${pendingOpen.fileName}?`} onCancel={() => setPendingOpen(null)}>
      <p className="text-slate-600">
        This replaces everything on screen with what’s in the file. Save first if you want to keep your current
        numbers.
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className={ghostButtonClass} onClick={() => setPendingOpen(null)} data-autofocus>
          Cancel
        </button>
        <button type="button" className={primaryButtonClass} onClick={() => loadFile(pendingOpen)}>
          <FolderOpen className="size-4" aria-hidden />
          Open file
        </button>
      </div>
    </Modal>
  )

  if (state.people.length === 0) return <FirstRun onAddPerson={addPerson} onOpen={handleOpen} notice={noticeBanner} />

  const period =
    state.periods.find((p) => p.id === selectedId) ??
    state.periods.find((p) => p.id === state.currentPeriodId)!
  const isClosed = period.status === 'closed'
  const monthName = formatPeriodLabel(period.id)
  const people = period.snapshot?.people ?? state.people
  const card = period.snapshot?.card ?? state.card
  const result = calculatePeriod(state, period)
  const fractions = shareFractions(people, card)

  return (
    <div className="min-h-screen pb-16">
      <Header
        data={state}
        selectedPeriodId={period.id}
        onSelectPeriod={setSelectedId}
        meId={meId}
        onChangeMe={setMeId}
        onOpen={handleOpen}
        onSave={handleSave}
        saveStatus={saveStatus}
      />

      <main className="mx-auto max-w-5xl space-y-6 px-4 pt-6">
        {noticeBanner}

        {isClosed && (
          <p className="flex items-start gap-2 rounded-2xl bg-sky-100 px-4 py-3 text-sm font-medium text-sky-800">
            <History className="mt-0.5 size-4 shrink-0" aria-hidden />
            {monthName} is closed. It uses the pay, housing and card limit saved when it closed, so changes here only
            affect {monthName}.
          </p>
        )}

        <HeroBalance result={result} periodId={period.id} household={people.length > 1} />

        <div className="grid gap-6 md:grid-cols-2">
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
              onUpdate={(changes) =>
                act({ type: 'updatePerson', id: person.id, changes, periodId: period.id }, person.id)
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
          {!isClosed && <AddPersonCard onAdd={addPerson} />}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <VisaCard
            card={result.card}
            onChangeLimit={(limit) => act({ type: 'updateCard', periodId: period.id, changes: { limit } })}
            onChangeAvailable={(available) => act({ type: 'updateCard', periodId: period.id, changes: { available } })}
          />
          <VisaSplit result={result} fractions={fractions} />
        </div>

        <NotesPanel
          key={period.id}
          notes={period.notes}
          defaultDate={defaultDateFor(period)}
          onAdd={(note) => act({ type: 'addNote', periodId: period.id, note: { ...note, id: newId() } })}
          onTogglePin={(noteId, pinned) => act({ type: 'updateNote', periodId: period.id, noteId, changes: { pinned } })}
          onRemove={(noteId) => act({ type: 'removeNote', periodId: period.id, noteId })}
        />

        {!isClosed && (
          <CloseMonth
            periodId={period.id}
            leftover={result.summary.balance}
            onConfirm={() => act({ type: 'closeMonth' })}
          />
        )}
      </main>
      {openDialog}
    </div>
  )
}
