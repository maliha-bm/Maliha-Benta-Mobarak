import type { ReactNode } from 'react'

interface Props {
  id: string
  number: number
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}

export function StepSection({ id, number, title, description, action, children }: Props) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-xl border bg-card text-card-foreground">
      <div className="flex flex-wrap items-start gap-3 border-b px-4 py-4 md:px-5">
        <span className="font-mono text-sm font-semibold text-primary" aria-hidden="true">
          {String(number).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-title`} className="text-base font-semibold tracking-tight text-balance">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground text-pretty">{description}</p>
        </div>
        {action}
      </div>
      <div className="px-4 py-4 md:px-5">{children}</div>
    </section>
  )
}
