import { CircleAlert, CircleCheck, FileStack, ShieldCheck } from 'lucide-react'
import type { Dict } from '@/lib/tenderpack/i18n'
import type { Lang } from '@/lib/tenderpack/types'
import { cn } from '@/lib/utils'

interface Props {
  t: Dict
  lang: Lang
  onLangChange: (lang: Lang) => void
  hasTender: boolean
  isReady: boolean
}

export function AppHeader({ t, lang, onLangChange, hasTender, isReady }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileStack className="size-5" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <p className="font-semibold tracking-tight">TenderPack AI</p>
            <p className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {t.privacy}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div
            role="status"
            aria-live="polite"
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold tracking-wide',
              !hasTender && 'bg-muted text-muted-foreground',
              hasTender && isReady && 'bg-success text-success-foreground',
              hasTender && !isReady && 'bg-destructive text-destructive-foreground',
            )}
          >
            {hasTender && isReady ? (
              <CircleCheck className="size-4" aria-hidden="true" />
            ) : (
              <CircleAlert className="size-4" aria-hidden="true" />
            )}
            {!hasTender ? t.noTender : isReady ? t.ready : t.actionRequired}
          </div>

          <div role="group" aria-label={t.language} className="flex rounded-lg border p-0.5 text-sm">
            {(['en', 'bn'] as const).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={lang === code}
                onClick={() => onLangChange(code)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition-colors',
                  lang === code ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {code === 'en' ? 'English' : 'বাংলা'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
