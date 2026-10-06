'use client'

import { useRef, useState } from 'react'
import { FileText, Loader2, Trash2, TriangleAlert, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Dict } from '@/lib/tenderpack/i18n'
import { MAX_FILES, MAX_TOTAL_BYTES, formatBytes, inspectPdf } from '@/lib/tenderpack/inspect-pdf'
import type { Lang, Matches, Requirement, UploadedPdf } from '@/lib/tenderpack/types'
import { cn } from '@/lib/utils'
import { StepSection } from './step-section'
import { STEP_IDS } from './workflow-steps'

interface Props {
  t: Dict
  lang: Lang
  files: UploadedPdf[]
  requirements: Requirement[]
  matches: Matches
  onAdd: (files: UploadedPdf[]) => void
  onRemove: (id: string) => void
}

export function UploadStep({ t, lang, files, requirements, matches, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rejections, setRejections] = useState<string[]>([])

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0)

  const processFiles = async (list: FileList | File[]) => {
    const incoming = Array.from(list)
    if (!incoming.length) return
    setBusy(true)
    const accepted: UploadedPdf[] = []
    const problems: string[] = []
    let count = files.length
    let bytes = totalBytes

    for (const file of incoming) {
      if (count >= MAX_FILES) {
        problems.push(t.rejectCount(file.name, MAX_FILES))
        continue
      }
      if (bytes + file.size > MAX_TOTAL_BYTES) {
        problems.push(t.rejectSize(file.name))
        continue
      }
      const result = await inspectPdf(file)
      if (!result.ok) {
        const map = { 'not-pdf': t.rejectNotPdf, damaged: t.rejectDamaged, encrypted: t.rejectEncrypted, empty: t.rejectEmpty }
        problems.push(map[result.reason](file.name))
        continue
      }
      const duplicate = [...files, ...accepted].find((f) => f.hash === result.hash)
      if (duplicate) {
        problems.push(t.rejectDuplicate(file.name, duplicate.name))
        continue
      }
      accepted.push({ id: crypto.randomUUID(), name: file.name, size: file.size, pages: result.pages, hash: result.hash, bytes: result.bytes })
      count++
      bytes += file.size
    }

    if (accepted.length) onAdd(accepted)
    setRejections(problems)
    setBusy(false)
  }

  const reqName = (fileId: string) => {
    const reqId = Object.keys(matches).find((k) => matches[k] === fileId)
    const req = requirements.find((r) => r.id === reqId)
    return req ? (lang === 'bn' ? req.name_bn : req.name_en) : null
  }

  return (
    <StepSection id={STEP_IDS[1]} number={2} title={t.step2Title} description={t.step2Desc}>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          processFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
          dragging ? 'border-primary bg-accent' : 'border-input',
        )}
      >
        {busy ? (
          <Loader2 className="size-7 animate-spin text-primary" aria-hidden="true" />
        ) : (
          <UploadCloud className="size-7 text-primary" aria-hidden="true" />
        )}
        <p className="text-sm">
          {t.dropHere}{' '}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-semibold text-primary underline underline-offset-4"
            disabled={busy}
          >
            {t.browse}
          </button>
        </p>
        <p className="text-xs text-muted-foreground">{t.limits(MAX_FILES, 50)}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          className="sr-only"
          aria-label={t.browse}
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {rejections.length > 0 && (
        <div role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <ul className="flex-1 space-y-1">
              {rejections.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <button type="button" onClick={() => setRejections([])} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">{t.dismiss}</span>
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{t.usage(files.length, MAX_FILES, formatBytes(totalBytes))}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, (totalBytes / MAX_TOTAL_BYTES) * 100)}%` }} />
      </div>

      {files.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t.noFiles}</p>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border">
          {files.map((f) => {
            const usedFor = reqName(f.id)
            return (
              <li key={f.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium" title={f.name}>
                    {f.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.pages(f.pages)} · {formatBytes(f.size)} ·{' '}
                    <span className={usedFor ? 'text-success' : ''}>{usedFor ? `${t.matchedTo}: ${usedFor}` : t.notMatched}</span>
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onRemove(f.id)} aria-label={`${t.remove} ${f.name}`}>
                  <Trash2 aria-hidden="true" />
                  <span className="hidden sm:inline">{t.remove}</span>
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </StepSection>
  )
}
