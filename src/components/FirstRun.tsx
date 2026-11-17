import { FolderOpen, PiggyBank } from 'lucide-react'
import type { ReactNode } from 'react'
import { NameForm } from './NameForm'

interface Props {
  onAddPerson: (name: string) => void
  onOpen: () => void
  notice?: ReactNode
}

export function FirstRun({ onAddPerson, onOpen, notice }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {notice}
        <div className="rounded-[2rem] border border-white bg-white/90 p-8 text-center shadow-xl shadow-orange-200/50 backdrop-blur">
          <div className="mx-auto mb-5 flex size-20 rotate-[-6deg] items-center justify-center rounded-3xl bg-gradient-to-br from-pink-400 to-orange-400 text-white shadow-lg shadow-pink-300/50">
            <PiggyBank className="size-11" strokeWidth={1.75} aria-hidden />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Our Money</h1>
          <p className="mt-2 text-slate-500">One clear answer each month: are we in the green?</p>

          <h2 className="mt-8 mb-3 text-lg font-bold text-slate-800">Add yourself to get started</h2>
          <NameForm label="Your name" placeholder="Your name" submitLabel="Let's go" onSubmit={onAddPerson} autoFocus />
          <p className="mt-4 text-sm text-slate-400">You can add a partner or family member next. Everything stays on this device.</p>

          <div className="mt-6 border-t border-dashed border-slate-200 pt-5">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-violet-600 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
              onClick={onOpen}
            >
              <FolderOpen className="size-4" aria-hidden />
              Already have a save file? Open it
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
