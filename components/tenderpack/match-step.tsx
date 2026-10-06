'use client'

import { Unlink, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDisplayDate } from '@/lib/tenderpack/format'
import type { Dict } from '@/lib/tenderpack/i18n'
import type { ExpiryDates, Lang, Matches, Requirement, Status, Tender, UploadedPdf } from '@/lib/tenderpack/types'
import { cn } from '@/lib/utils'
import { StatusBadge } from './status-badge'
import { StepSection } from './step-section'
import { STEP_IDS } from './workflow-steps'

interface Props {
  t: Dict
  lang: Lang
  tender: Tender | null
  requirements: Requirement[]
  files: UploadedPdf[]
  matches: Matches
  expiry: ExpiryDates
  statuses: Record<string, Status>
  onMatch: (requirementId: string, fileId: string | null) => void
  onAutoMatch: (matches: Matches) => void
  onExpiryChange: (requirementId: string, value: string) => void
}

const STOP = new Set(['the', 'and', 'for', 'of', 'certificate', 'copy', 'scan', 'pdf', 'doc', 'document', 'with'])
const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/\.pdf$/, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))

function suggestMatches(requirements: Requirement[], files: UploadedPdf[], current: Matches): Matches {
  const next = { ...current }
  const used = new Set(Object.values(next))
  const candidates: { reqId: string; fileId: string; score: number }[] = []
  for (const req of requirements) {
    if (next[req.id]) continue
    const reqTokens = new Set([...tokens(req.name_en), req.id.toLowerCase()])
    for (const file of files) {
      if (used.has(file.id)) continue
      const score = tokens(file.name).filter((w) => reqTokens.has(w)).length
      if (score > 0) candidates.push({ reqId: req.id, fileId: file.id, score })
    }
  }
  candidates.sort((a, b) => b.score - a.score)
  for (const c of candidates) {
    if (next[c.reqId] || used.has(c.fileId)) continue
    next[c.reqId] = c.fileId
    used.add(c.fileId)
  }
  return next
}

export function MatchStep(props: Props) {
  const { t, lang, tender, requirements, files, matches, expiry, statuses, onMatch, onAutoMatch, onExpiryChange } = props
  const fileOwner = Object.fromEntries(Object.entries(matches).map(([reqId, fileId]) => [fileId, reqId]))

  const action =
    tender && files.length > 0 ? (
      <Button variant="outline" size="lg" onClick={() => onAutoMatch(suggestMatches(requirements, files, matches))}>
        <Wand2 aria-hidden="true" />
        {t.autoMatch}
      </Button>
    ) : null

  return (
    <StepSection id={STEP_IDS[2]} number={3} title={t.step3Title} description={t.step3Desc} action={action}>
      {!tender ? (
        <p className="text-sm text-muted-foreground">{t.needRequirements}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {requirements.map((req, i) => {
            const status = statuses[req.id]
            const fileId = matches[req.id]
            const name = lang === 'bn' ? req.name_bn : req.name_en
            const help = t.statusHelp[status]
            const helpText = typeof help === 'function' ? help(formatDisplayDate(tender.deadlineDate)) : help
            const selectId = `match-${req.id}`
            const expiryId = `expiry-${req.id}`
            return (
              <li
                key={req.id}
                className={cn(
                  'rounded-lg border p-3 md:p-4',
                  (status === 'Missing' || status === 'Expired') && 'border-destructive/40',
                  status === 'Expiry date needed' && 'border-warning/50',
                )}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <span className="mt-0.5 w-6 font-mono text-xs text-muted-foreground">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.optional ? t.optional : t.required}
                      {req.expiry_required ? ` · ${t.expiryRequired}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={status} lang={lang} />
                </div>

                <div className="mt-3 flex flex-col gap-3 pl-9 md:flex-row md:items-end">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <label htmlFor={selectId} className="sr-only">
                      {t.selectPdf} {name}
                    </label>
                    <select
                      id={selectId}
                      value={fileId ?? ''}
                      onChange={(e) => onMatch(req.id, e.target.value || null)}
                      disabled={files.length === 0}
                      className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                    >
                      <option value="">{files.length ? t.selectPdf : t.noFiles}</option>
                      {files.map((f) => {
                        const owner = fileOwner[f.id]
                        const ownerReq = owner && owner !== req.id ? requirements.find((r) => r.id === owner) : null
                        return (
                          <option key={f.id} value={f.id}>
                            {f.name}
                            {ownerReq ? ` (${t.inUse(lang === 'bn' ? ownerReq.name_bn : ownerReq.name_en)})` : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  {req.expiry_required && fileId && (
                    <div className="flex flex-col gap-1">
                      <label htmlFor={expiryId} className="text-xs font-medium text-muted-foreground">
                        {t.expiryDate}
                      </label>
                      <input
                        id={expiryId}
                        type="date"
                        value={expiry[req.id] ?? ''}
                        onChange={(e) => onExpiryChange(req.id, e.target.value)}
                        aria-invalid={status === 'Expired' || status === 'Expiry date needed'}
                        className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
                      />
                    </div>
                  )}

                  {fileId && (
                    <Button variant="ghost" size="lg" onClick={() => onMatch(req.id, null)}>
                      <Unlink aria-hidden="true" />
                      {t.clear}
                    </Button>
                  )}
                </div>

                <p
                  className={cn(
                    'mt-2 pl-9 text-sm',
                    status === 'OK' && 'text-success',
                    (status === 'Missing' || status === 'Expired') && 'text-destructive',
                    status === 'Expiry date needed' && 'text-warning',
                    status === 'Not provided' && 'text-muted-foreground',
                  )}
                >
                  {helpText}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </StepSection>
  )
}
