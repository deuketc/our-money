// Shared class names. Editable fields are shaded boxes; calculated values
// are plain text (see Design in CLAUDE.md).

/**
 * Page content width, shared by the header and main so they line up: the
 * original width below xl, room for three columns at xl (capped at 1536px),
 * then room for four at 3xl (capped at 2240px, so each column gets about
 * 450–530px). Always centred with mx-auto, so it doesn't stretch on
 * ultra-wide screens.
 */
export const pageWidthClass = 'max-w-5xl xl:max-w-screen-2xl 3xl:max-w-[140rem]'

/** Caps a row of form fields so inputs stay a sensible width in wide columns. */
export const fieldRowClass = 'max-w-xl'

export const inputClass =
  'w-full rounded-xl border-2 border-violet-100 bg-violet-50/70 px-3 py-2 text-slate-800 ' +
  'placeholder:text-slate-400 transition outline-none ' +
  'hover:border-violet-200 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-200/60 ' +
  'aria-invalid:border-rose-300 aria-invalid:bg-rose-50'

export const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white ' +
  'shadow-md shadow-violet-600/25 transition hover:bg-violet-700 active:scale-95 ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100'

/** For actions that overwrite or destroy data. */
export const dangerButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white ' +
  'shadow-md shadow-rose-600/25 transition hover:bg-rose-700 active:scale-95 ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300'

export const ghostButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 font-semibold text-slate-600 ' +
  'transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300'

/** Avatar colours, picked by person index. */
export const avatarColours = [
  'bg-sky-100 text-sky-700',
  'bg-pink-100 text-pink-700',
  'bg-amber-100 text-amber-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
]

/** Editable field on a coloured background (the Visa card face). */
export const inputOnDarkClass =
  'w-full rounded-xl border-2 border-white/25 bg-white/15 px-3 py-2 text-lg font-bold text-white ' +
  'placeholder:text-white/50 transition outline-none backdrop-blur-sm ' +
  'hover:border-white/40 focus:border-white focus:bg-white/25 focus:ring-4 focus:ring-white/30 ' +
  'aria-invalid:border-rose-300 aria-invalid:bg-rose-500/30'

export const cardClass =
  'rounded-[2rem] border border-white bg-white/90 p-5 shadow-lg shadow-orange-200/40 sm:p-6'
