import { NotebookPen, Pin, PinOff, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { formatShortDate } from '../format'
import type { Note } from '../schema'
import { cardClass, fieldRowClass, inputClass, primaryButtonClass } from './styles'

interface Props {
  notes: Note[]
  defaultDate: string
  onAdd: (note: Omit<Note, 'id'>) => void
  onTogglePin: (noteId: string, pinned: boolean) => void
  onRemove: (noteId: string) => void
}

export function NotesPanel({ notes, defaultDate, onAdd, onTogglePin, onRemove }: Props) {
  const [text, setText] = useState('')
  const [date, setDate] = useState(defaultDate)
  const trimmed = text.trim()
  const sorted = [...notes].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <section aria-label="Notes" className={`${cardClass} flex flex-col gap-4`}>
      <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-500 uppercase">
        <NotebookPen className="size-5 text-amber-500" aria-hidden />
        Notes
      </h2>

      {sorted.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-400">
          Jot down reminders like “car rego due in March”. Pin a note to carry it into next month.
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Notes for this month">
          {sorted.map((note) => (
            <li
              key={note.id}
              className={`flex items-start gap-2 rounded-2xl px-3 py-2 ${
                note.pinned ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-slate-50'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="break-words text-slate-800">{note.text}</p>
                <p className="text-xs text-slate-400">
                  {formatShortDate(note.date)}
                  {note.pinned && ' · carries forward'}
                </p>
              </div>
              <button
                type="button"
                aria-pressed={note.pinned}
                aria-label={`Pin: ${note.text}`}
                title={note.pinned ? 'Pinned: carries into next month' : 'Pin to carry into next month'}
                className={`rounded-lg p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                  note.pinned ? 'bg-amber-200 text-amber-800 hover:bg-amber-300' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                }`}
                onClick={() => onTogglePin(note.id, !note.pinned)}
              >
                {note.pinned ? <Pin className="size-4" aria-hidden /> : <PinOff className="size-4" aria-hidden />}
              </button>
              <button
                type="button"
                aria-label={`Remove note: ${note.text}`}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-100 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                onClick={() => onRemove(note.id)}
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        aria-label="Add a note"
        className={`mt-auto grid grid-cols-[1fr_auto] gap-2 ${fieldRowClass}`}
        onSubmit={(e) => {
          e.preventDefault()
          if (!trimmed) return
          onAdd({ text: trimmed, date, pinned: false })
          setText('')
        }}
      >
        <label className="col-span-2">
          <span className="sr-only">Note</span>
          <input
            className={inputClass}
            placeholder="Add a note…"
            value={text}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Note date</span>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <button type="submit" className={primaryButtonClass} disabled={!trimmed || !date}>
          <Plus className="size-4" aria-hidden />
          Add note
        </button>
      </form>
    </section>
  )
}
