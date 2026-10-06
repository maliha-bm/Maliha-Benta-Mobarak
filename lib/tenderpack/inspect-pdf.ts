import { PDFDocument } from 'pdf-lib'

export const MAX_FILES = 30
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024

export type InspectResult =
  | { ok: true; pages: number; hash: string; bytes: Uint8Array }
  | { ok: false; reason: 'not-pdf' | 'damaged' | 'encrypted' | 'empty' }

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function hasPdfSignature(bytes: Uint8Array) {
  // "%PDF-" may be preceded by a few junk bytes in some real-world files.
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024))
  return head.includes('%PDF-')
}

export async function inspectPdf(file: File): Promise<InspectResult> {
  const looksLikePdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!looksLikePdf) return { ok: false, reason: 'not-pdf' }
  if (file.size === 0) return { ok: false, reason: 'empty' }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!hasPdfSignature(bytes)) return { ok: false, reason: 'not-pdf' }

  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
    if (doc.isEncrypted) return { ok: false, reason: 'encrypted' }
    const pages = doc.getPageCount()
    if (pages < 1) return { ok: false, reason: 'damaged' }
    return { ok: true, pages, hash: await sha256Hex(bytes), bytes }
  } catch {
    return { ok: false, reason: 'damaged' }
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
