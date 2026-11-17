import { ArrowRight } from 'lucide-react'
import { useId, useState } from 'react'
import { inputClass, primaryButtonClass } from './styles'

interface Props {
  label: string
  placeholder: string
  submitLabel: string
  onSubmit: (name: string) => void
  onCancel?: () => void
  autoFocus?: boolean
}

export function NameForm({ label, placeholder, submitLabel, onSubmit, onCancel, autoFocus }: Props) {
  const id = useId()
  const [name, setName] = useState('')
  const trimmed = name.trim()

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault()
        if (trimmed) onSubmit(trimmed)
      }}
    >
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`${inputClass} text-lg`}
        placeholder={placeholder}
        value={name}
        maxLength={100}
        autoComplete="given-name"
        autoFocus={autoFocus}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel?.()
        }}
      />
      <div className="flex gap-2">
        {onCancel && (
          <button type="button" className="rounded-xl px-3 py-2 font-semibold text-slate-500 hover:bg-slate-100" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className={`${primaryButtonClass} whitespace-nowrap`} disabled={!trimmed}>
          {submitLabel}
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </form>
  )
}
