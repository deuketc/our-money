// Reading a save file: parse and validate, with messages people can act on.

import { appDataSchema, type AppData } from './schema'

export type ParseResult =
  | { ok: true; data: AppData }
  | { ok: false; message: string; details: string[] }

/** Biggest file we'll read. Real save files are a few KB. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024

export function parseSaveFile(text: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return {
      ok: false,
      message: "This file isn't an Our Money save file. It couldn't be read as JSON.",
      details: [],
    }
  }

  const version = (json as { version?: unknown } | null)?.version
  if (typeof version === 'number' && version > 1) {
    return {
      ok: false,
      message: 'This file was saved by a newer version of Our Money. Update the app and try again.',
      details: [],
    }
  }

  const result = appDataSchema.safeParse(json)
  if (result.success) return { ok: true, data: result.data }

  return {
    ok: false,
    message:
      "This file doesn't look like an Our Money save file, or it's been changed outside the app. Nothing was loaded.",
    details: result.error.issues.slice(0, 3).map((issue) => {
      const where = issue.path.length ? issue.path.join(' › ') : 'File'
      return `${where}: ${issue.message}`
    }),
  }
}
