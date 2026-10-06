'use client'

import { useMemo, useState } from 'react'
import { dictionaries } from '@/lib/tenderpack/i18n'
import { getAllStatuses, isBlocking } from '@/lib/tenderpack/status'
import type { ExpiryDates, Lang, Matches, Requirement, Tender, UploadedPdf } from '@/lib/tenderpack/types'
import { AppHeader } from './app-header'
import { WorkflowSteps } from './workflow-steps'
import { RequirementsStep } from './requirements-step'
import { UploadStep } from './upload-step'
import { MatchStep } from './match-step'
import { GenerateStep } from './generate-step'

export function TenderPackApp() {
  const [lang, setLang] = useState<Lang>('en')
  const [tender, setTender] = useState<Tender | null>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [files, setFiles] = useState<UploadedPdf[]>([])
  const [matches, setMatches] = useState<Matches>({})
  const [expiry, setExpiry] = useState<ExpiryDates>({})
  const [bidder, setBidder] = useState('')

  const t = dictionaries[lang]

  const statuses = useMemo(
    () => (tender ? getAllStatuses(requirements, matches, expiry, tender.deadlineDate) : {}),
    [tender, requirements, matches, expiry],
  )
  const blockers = requirements.filter((r) => isBlocking(statuses[r.id]))
  const matchedCount = requirements.filter((r) => matches[r.id]).length
  const isReady = Boolean(tender) && blockers.length === 0 && bidder.trim().length > 0

  const loadTender = (next: Tender, reqs: Requirement[]) => {
    setTender(next)
    setRequirements(reqs)
    setMatches({})
    setExpiry({})
    if (next.bidder) setBidder(next.bidder)
  }

  const matchFile = (requirementId: string, fileId: string | null) => {
    setMatches((prev) => {
      const next: Matches = {}
      // Enforce one-to-one: a file can only be linked to a single requirement.
      for (const [reqId, fId] of Object.entries(prev)) {
        if (reqId !== requirementId && fId !== fileId) next[reqId] = fId
      }
      if (fileId) next[requirementId] = fileId
      return next
    })
  }

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
    setMatches((prev) => Object.fromEntries(Object.entries(prev).filter(([, fId]) => fId !== fileId)))
  }

  const steps = [
    { done: Boolean(tender) },
    { done: files.length > 0 },
    { done: Boolean(tender) && blockers.length === 0 },
    { done: false },
  ]

  return (
    <div className="min-h-dvh" lang={lang === 'bn' ? 'bn' : 'en'}>
      <AppHeader t={t} lang={lang} onLangChange={setLang} hasTender={Boolean(tender)} isReady={isReady} />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <WorkflowSteps t={t} steps={steps} />
        <RequirementsStep t={t} lang={lang} tender={tender} requirements={requirements} onLoad={loadTender} />
        <UploadStep
          t={t}
          files={files}
          requirements={requirements}
          matches={matches}
          lang={lang}
          onAdd={(added) => setFiles((prev) => [...prev, ...added])}
          onRemove={removeFile}
        />
        <MatchStep
          t={t}
          lang={lang}
          tender={tender}
          requirements={requirements}
          files={files}
          matches={matches}
          expiry={expiry}
          statuses={statuses}
          onMatch={matchFile}
          onAutoMatch={setMatches}
          onExpiryChange={(id, value) => setExpiry((prev) => ({ ...prev, [id]: value }))}
        />
        <GenerateStep
          t={t}
          lang={lang}
          tender={tender}
          requirements={requirements}
          files={files}
          matches={matches}
          statuses={statuses}
          blockers={blockers}
          bidder={bidder}
          onBidderChange={setBidder}
          isReady={isReady}
          matchedCount={matchedCount}
        />
      </main>
      <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted-foreground md:px-6">{t.privacy}</footer>
    </div>
  )
}
