import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { NameForm } from './NameForm'

export function AddPersonCard({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-[2rem] border-2 border-dashed border-violet-200 bg-white/40 p-6 font-bold text-violet-600 transition hover:border-violet-400 hover:bg-white/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
        onClick={() => setOpen(true)}
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-violet-100">
          <UserPlus className="size-6" aria-hidden />
        </span>
        Add person
      </button>
    )
  }

  return (
    <div className="flex min-h-40 flex-col justify-center rounded-[2rem] border-2 border-dashed border-violet-300 bg-white/70 p-6">
      <h3 className="mb-3 font-bold text-slate-700">Who else is in this budget?</h3>
      <NameForm
        label="Their name"
        placeholder="Their name"
        submitLabel="Add to budget"
        autoFocus
        onSubmit={(name) => {
          onAdd(name)
          setOpen(false)
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  )
}
