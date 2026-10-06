import { Check } from 'lucide-react'
import type { Dict } from '@/lib/tenderpack/i18n'
import { cn } from '@/lib/utils'

export const STEP_IDS = ['step-requirements', 'step-upload', 'step-match', 'step-generate']

export function WorkflowSteps({ t, steps }: { t: Dict; steps: { done: boolean }[] }) {
  const current = steps.findIndex((s) => !s.done)
  return (
    <nav aria-label="Workflow">
      <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {t.steps.map((label, i) => {
          const done = steps[i].done
          const active = i === current
          return (
            <li key={label}>
              <a
                href={`#${STEP_IDS[i]}`}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-sm transition-colors hover:border-primary/50',
                  active && 'border-primary ring-1 ring-primary',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    done ? 'bg-success text-success-foreground' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {done ? <Check className="size-3.5" aria-label="done" /> : i + 1}
                </span>
                <span className={cn('font-medium', !done && !active && 'text-muted-foreground')}>{label}</span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
