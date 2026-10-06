'use client'

import { useRef, useState } from 'react'
import { CalendarClock, FileJson, Sparkles, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDeadline } from '@/lib/tenderpack/format'
import type { Dict } from '@/lib/tenderpack/i18n'
import { parseRequirementsJson } from '@/lib/tenderpack/parse-requirements'
import type { Lang, Requirement, Tender } from '@/lib/tenderpack/types'
import { StepSection } from './step-section'
import { STEP_IDS } from './workflow-steps'

interface Props {
  t: Dict
  lang: Lang
  tender: Tender | null
  requirements: Requirement[]
  onLoad: (tender: Tender, requirements: Requirement[]) => void
}

export function RequirementsStep({ t, lang, tender, requirements, onLoad }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<string[]>([])

  const handleText = (text: string) => {
    const result = parseRequirementsJson(text)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors([])
    onLoad(result.tender, result.requirements)
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      setErrors([`"${file.name}" is not a .json file. Please choose requirements.json.`])
      return
    }
    handleText(await file.text())
  }

  const loadSample = async () => {
    try {
      const res = await fetch('/sample-requirements.json')
      handleText(await res.text())
    } catch {
      setErrors(['The sample tender could not be loaded.'])
    }
  }

  const actions = (
    <div className="flex flex-wrap gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        aria-label={t.chooseJson}
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <Button variant={tender ? 'outline' : 'default'} size="lg" onClick={() => inputRef.current?.click()}>
        <FileJson aria-hidden="true" />
        {tender ? t.replaceJson : t.chooseJson}
      </Button>
      {!tender && (
        <Button variant="outline" size="lg" onClick={loadSample}>
          <Sparkles aria-hidden="true" />
          {t.loadSample}
        </Button>
      )}
    </div>
  )

  return (
    <StepSection id={STEP_IDS[0]} number={1} title={t.step1Title} description={t.step1Desc} action={actions}>
      {errors.length > 0 && (
        <div role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-destructive">
            <TriangleAlert className="size-4" aria-hidden="true" />
            {t.importErrorTitle}
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-6">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {!tender ? (
        <p className="text-sm text-muted-foreground">{t.needRequirements}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <dl className="grid gap-x-6 gap-y-3 rounded-lg bg-muted/60 p-4 text-sm sm:grid-cols-2">
            <Field label={t.tenderId} value={<span className="font-mono font-semibold">{tender.tender_id}</span>} />
            <Field
              label={t.deadline}
              value={
                <span className="flex items-center gap-1.5 font-semibold">
                  <CalendarClock className="size-4 text-primary" aria-hidden="true" />
                  {formatDeadline(tender)}
                </span>
              }
            />
            <Field label={t.title} value={lang === 'bn' && tender.title_bn ? tender.title_bn : tender.title} />
            <Field
              label={t.procuringEntity}
              value={lang === 'bn' && tender.procuring_entity_bn ? tender.procuring_entity_bn : tender.procuring_entity}
            />
          </dl>

          <div>
            <h3 className="mb-2 text-sm font-semibold">{t.requirementsCount(requirements.length)}</h3>
            <ol className="divide-y rounded-lg border">
              {requirements.map((r, i) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm">
                  <span className="w-6 font-mono text-xs text-muted-foreground">{i + 1}.</span>
                  <span className="min-w-0 flex-1 font-medium">{lang === 'bn' ? r.name_bn : r.name_en}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {r.expiry_required && <Tag tone="warning">{t.expiryRequired}</Tag>}
                    <Tag tone={r.optional ? 'muted' : 'primary'}>{r.optional ? t.optional : t.required}</Tag>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </StepSection>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-pretty">{value}</dd>
    </div>
  )
}

function Tag({ tone, children }: { tone: 'warning' | 'muted' | 'primary'; children: React.ReactNode }) {
  const toneClass = {
    warning: 'border-warning/40 text-warning',
    muted: 'border-border text-muted-foreground',
    primary: 'border-primary/40 text-primary',
  }[tone]
  return <span className={`rounded-md border px-1.5 py-0.5 text-xs font-medium ${toneClass}`}>{children}</span>
}
