import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  FileText,
  HourglassMedium,
  Receipt,
  Sparkle,
  Sun,
  XCircle,
  type Icon,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { useServerStatus } from '@/hooks/useServerStatus';
import type { LeadStatus, QuoteStatus, WeatherIconKey } from '@/lib/types';
import { cn } from '@/lib/utils';

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-2 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: IconCmp, title, body, action, className }: { icon: Icon; title: string; body: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col items-center rounded-3xl border border-dashed px-6 py-14 text-center', className)}
    >
      <div className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <IconCmp size={26} weight="duotone" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

const LEAD_STATUS: Record<LeadStatus, { label: string; icon: Icon; className: string }> = {
  new: { label: 'New', icon: Sparkle, className: 'bg-primary/15 text-foreground border-primary/30' },
  quoted: { label: 'Quoted', icon: FileText, className: 'bg-lagoon/12 text-foreground border-lagoon/30' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, className: 'bg-success/12 text-foreground border-success/30' },
  invoiced: { label: 'Invoiced', icon: Receipt, className: 'bg-clay/12 text-foreground border-clay/30' },
  lost: { label: 'Lost', icon: XCircle, className: 'bg-muted text-muted-foreground border-border' },
};

const QUOTE_STATUS: Record<QuoteStatus, { label: string; icon: Icon; className: string }> = {
  draft: { label: 'Draft', icon: HourglassMedium, className: 'bg-muted text-muted-foreground border-border' },
  sent: { label: 'Sent', icon: FileText, className: 'bg-lagoon/12 text-foreground border-lagoon/30' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, className: 'bg-success/12 text-foreground border-success/30' },
  invoiced: { label: 'Invoiced', icon: Receipt, className: 'bg-clay/12 text-foreground border-clay/30' },
};

export const leadStatusMeta = LEAD_STATUS;

export function StatusBadge({ status, kind = 'lead' }: { status: LeadStatus | QuoteStatus; kind?: 'lead' | 'quote' }) {
  const meta = kind === 'lead' ? LEAD_STATUS[status as LeadStatus] : QUOTE_STATUS[status as QuoteStatus];
  return (
    <Badge variant="outline" className={cn('gap-1 rounded-full font-medium', meta.className)}>
      <meta.icon weight="fill" size={12} />
      {meta.label}
    </Badge>
  );
}

const WEATHER_ICONS: Record<WeatherIconKey, Icon> = {
  sun: Sun,
  'cloud-sun': CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudRain,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

export function WeatherIcon({ icon, className, size = 20 }: { icon: WeatherIconKey; className?: string; size?: number }) {
  const C = WEATHER_ICONS[icon] ?? Cloud;
  return <C size={size} weight="duotone" className={className} />;
}

/** Shows whether AI output came from the live model or the demo generator. */
export function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const demo = source === 'demo';
  return (
    <Badge variant="outline" className={cn('gap-1 rounded-full font-mono text-[10.5px]', demo ? 'border-warning/40 bg-warning/10' : 'border-success/40 bg-success/10')}>
      <span className={cn('size-1.5 rounded-full', demo ? 'bg-warning' : 'bg-success')} />
      {demo ? 'demo output' : source}
    </Badge>
  );
}

export function DemoModeNotice() {
  const { data } = useServerStatus();
  if (!data?.demoMode) return null;
  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <Sparkle weight="fill" className="mt-0.5 shrink-0 text-warning" />
      <p>
        <span className="font-medium">Demo mode.</span> <span className="text-muted-foreground">No LLM key is configured, so AI features return deterministic sample output. Weather, maps, Wikipedia and FX calls are still live. Set <code className="font-mono text-xs">LLM_API_KEY</code> on the server to switch to the real model.</span>
      </p>
    </div>
  );
}
