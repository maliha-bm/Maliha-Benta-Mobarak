'use client'

import { useState } from 'react'
import { CircleCheck, Download, FileDown, Loader2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildPackage, packageFileName } from '@/lib/tenderpack/generate-package'
import type { Dict } from '@/lib/tenderpack/i18n'
import type { Lang, Matches, Requirement, Status, Tender, UploadedPdf } from '@/lib/tenderpack/types'
import { cn } from '@/lib/utils'
import { STEP_IDS } from './workflow-steps'
import { StepSection } from './step-section'

interface Props {
  t: Dict
  lang: Lang
  tender: Tender | null
  requirements: Requirement[]
  files: UploadedPdf[]
  matches: Matches
  statuses: Record<string, Status>
  blockers: Requirement[]
  bidder: string
  onBidderChange: (value: string) => void
  isReady: boolean
  matchedCount: number
}

function download(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function GenerateStep(props: Props) {
  const { t, lang, tender, requirements, files, matches, statuses, blockers, bidder, onBidderChange, isReady, matchedCount } = props
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ bytes: Uint8Array; name: string } | null>(null)

  const docPages = requirements.reduce((sum, r) => sum + (files.find((f) => f.id === matches[r.id])?.pages ?? 0), 0)
  const bidderMissing = bidder.trim().length === 0

  const generate = async () => {
    if (!tender || !isReady) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const bytes = await buildPackage({
        tender,
        bidder: bidder.trim(),
        requirements,
        matches,
        files,
        notProvided: requirements.filter((r) => statuses[r.id] === 'Not provided'),
      })
      const name = packageFileName(tender.tender_id)
      download(bytes, name)
      setResult({ bytes, name })
    } catch (e) {
      console.error('Package generation failed', e)
      setError(t.genError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <StepSection id={STEP_IDS[3]} number={4} title={t.step4Title} description={t.step4Desc}>
      {!tender ? (
        <p className="text-sm text-muted-foreground">{t.needRequirements}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex max-w-md flex-col gap-1.5">
            <label htmlFor="bidder" className="text-sm font-medium">
              {t.bidder}
            </label>
            <input
              id="bidder"
              value={bidder}
              onChange={(e) => onBidderChange(e.target.value)}
              placeholder={t.bidderPlaceholder}
              autoComplete="organization"
              aria-invalid={bidderMissing}
              className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div
            className={cn(
              'rounded-lg border p-4',
              isReady ? 'border-success/40 bg-success/10' : 'border-destructive/40 bg-destructive/10',
            )}
          >
            <p className={cn('flex items-center gap-2 text-sm font-bold tracking-wide', isReady ? 'text-success' : 'text-destructive')}>
              {isReady ? <CircleCheck className="size-5" aria-hidden="true" /> : <TriangleAlert className="size-5" aria-hidden="true" />}
              {isReady ? t.ready : t.actionRequired}
            </p>
            {isReady ? (
              <p className="mt-1 text-sm">{t.summary(matchedCount, docPages)}</p>
            ) : (
              <>
                <p className="mt-1 text-sm">{t.fixFirst}</p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-6 text-sm">
                  {blockers.map((r) => (
                    <li key={r.id}>
                      <a href={`#match-${r.id}`} className="underline-offset-4 hover:underline">
                        {t.blockerLine(lang === 'bn' ? r.name_bn : r.name_en, statuses[r.id])}
                      </a>
                    </li>
                  ))}
                  {bidderMissing && (
                    <li>
                      <a href="#bidder" className="underline-offset-4 hover:underline">
                        {t.bidderNeeded}
                      </a>
                    </li>
                  )}
                </ul>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" className="h-11 px-5 text-base" disabled={!isReady || busy} onClick={generate}>
              {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileDown aria-hidden="true" />}
              {busy ? t.generating : t.generate}
            </Button>
            <span className="font-mono text-xs text-muted-foreground">{packageFileName(tender.tender_id)}</span>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {result && (
            <div role="status" className="flex flex-wrap items-center gap-3 text-sm text-success">
              <CircleCheck className="size-4" aria-hidden="true" />
              {t.done(result.name)}
              <Button variant="outline" size="sm" onClick={() => download(result.bytes, result.name)}>
                <Download aria-hidden="true" />
                {t.downloadAgain}
              </Button>
            </div>
          )}
        </div>
      )}
    </StepSection>
  )
}
