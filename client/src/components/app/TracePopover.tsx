import { Graph } from '@phosphor-icons/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ResponseMeta } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * A compact "network" chip for any API response. Opening it shows the
 * upstream calls the server made for this request, drawn as a waterfall.
 */
export function TracePopover({ meta, className }: { meta?: ResponseMeta; className?: string }) {
  if (!meta) return null;
  const calls = meta.upstream;
  const live = calls.filter((c) => !c.cached).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn('inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground', className)}
        >
          <Graph size={13} />
          {calls.length} upstream · {meta.durationMs} ms
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,420px)] p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-medium">Request trace</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            x-request-id {meta.requestId} · {live} live, {calls.length - live} cached
          </p>
        </div>
        <Waterfall meta={meta} />
      </PopoverContent>
    </Popover>
  );
}

export function Waterfall({ meta, className }: { meta: ResponseMeta; className?: string }) {
  const calls = meta.upstream;
  if (!calls.length) {
    return <p className={cn('px-4 py-4 text-sm text-muted-foreground', className)}>No third-party calls. This was answered by the server alone (demo output or cache).</p>;
  }
  // Bars are placed on a shared time axis: offset = when the call started
  // relative to the inbound request, width = how long it took.
  const total = Math.max(meta.durationMs, ...calls.map((c) => (c.offsetMs ?? 0) + c.ms), 1);
  const rows = [...calls].sort((a, b) => (a.offsetMs ?? 0) - (b.offsetMs ?? 0));

  return (
    <ul className={cn('space-y-2.5 px-4 py-3', className)}>
      {rows.map((c, i) => (
        <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">
              {c.provider}
              {c.label && <span className="font-normal text-muted-foreground"> · {c.label}</span>}
            </p>
          </div>
          <span className="text-right font-mono text-[11px] text-muted-foreground tabular-nums">
            {c.cached ? 'cache' : `${c.ms} ms`}
            {c.status && c.status >= 400 ? ` · ${c.status}` : ''}
          </span>
          <div className="relative col-span-2 h-2 rounded-full bg-muted" title={`${c.method} ${c.url}`}>
            <div
              className={cn('absolute inset-y-0 rounded-[4px]', c.error || (c.status ?? 200) >= 400 ? 'bg-destructive' : c.cached ? 'bg-muted-foreground/40' : 'bg-primary')}
              style={{ left: `${((c.offsetMs ?? 0) / total) * 100}%`, width: `${Math.max(1.5, (c.ms / total) * 100)}%` }}
            />
          </div>
          {c.tokens?.total ? <p className="col-span-2 font-mono text-[10.5px] text-muted-foreground">{c.tokens.total} tokens</p> : null}
        </li>
      ))}
    </ul>
  );
}
