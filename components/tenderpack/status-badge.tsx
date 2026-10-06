import { STATUS_BN } from '@/lib/tenderpack/i18n'
import type { Lang, Status } from '@/lib/tenderpack/types'
import { cn } from '@/lib/utils'

const styles: Record<Status, string> = {
  Missing: 'bg-destructive/15 text-destructive border-destructive/30',
  'Expiry date needed': 'bg-warning/15 text-warning border-warning/40',
  Expired: 'bg-destructive/15 text-destructive border-destructive/30',
  'Not provided': 'bg-muted text-muted-foreground border-border',
  OK: 'bg-success/15 text-success border-success/30',
}

export function StatusBadge({ status, lang }: { status: Status; lang: Lang }) {
  return (
    <span className={cn('inline-flex flex-col rounded-md border px-2 py-0.5 text-xs font-semibold leading-tight', styles[status])}>
      <span data-status={status}>{status}</span>
      {lang === 'bn' && <span className="font-normal opacity-80">{STATUS_BN[status]}</span>}
    </span>
  )
}
