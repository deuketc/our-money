import { useId, useState } from 'react'
import { inputClass, inputOnDarkClass } from './styles'

interface Props {
  label: string
  value: number
  onChange: (value: number) => void
  placeholder?: string
  /** Visually hide the label (it's still read by screen readers). */
  hideLabel?: boolean
  className?: string
  /** 'dark' for inputs on a coloured background, like the Visa card face. */
  tone?: 'light' | 'dark'
  prefix?: string
}

/** Parses "1,200", "$1200.50" or "" (→ 0). Returns null if invalid. */
function parseNumber(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, '')
  if (cleaned === '') return 0
  if (!/^\d*\.?\d*$/.test(cleaned)) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

const toText = (value: number) => (value === 0 ? '' : String(value))

/**
 * A number input that keeps what the user typed (e.g. "12." mid-edit) and
 * only reports valid, non-negative numbers.
 */
export function MoneyInput({
  label,
  value,
  onChange,
  placeholder = '0',
  hideLabel,
  className,
  tone = 'light',
  prefix = '$',
}: Props) {
  const id = useId()
  const [text, setText] = useState(() => toText(value))
  const [lastValue, setLastValue] = useState(value)

  // The value changed from outside (e.g. switching month): show it.
  if (value !== lastValue) {
    setLastValue(value)
    if (parseNumber(text) !== value) setText(toText(value))
  }

  const invalid = parseNumber(text) === null
  const dark = tone === 'dark'
  const affix = dark ? 'text-white/60' : 'text-slate-400'

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={
          hideLabel ? 'sr-only' : `mb-1 block text-sm font-medium ${dark ? 'text-white/80' : 'text-slate-600'}`
        }
      >
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className={`pointer-events-none absolute inset-y-0 left-3 flex items-center ${affix}`}>{prefix}</span>
        )}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className={`${dark ? inputOnDarkClass : inputClass} tabular-nums ${prefix ? 'pl-7' : ''}`}
          value={text}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          maxLength={15}
          onChange={(e) => {
            setText(e.target.value)
            const parsed = parseNumber(e.target.value)
            if (parsed !== null) {
              setLastValue(parsed)
              onChange(parsed)
            }
          }}
        />
      </div>
    </div>
  )
}
