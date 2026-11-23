import { useMemo } from 'react';
import { cn } from '@/lib/utils';

const TOKEN = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

/** Dependency-free JSON highlighter that renders React nodes (no innerHTML). */
export function JsonView({ value, className }: { value: unknown; className?: string }) {
  const nodes = useMemo(() => {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? '';
    const out: React.ReactNode[] = [];
    let last = 0;
    let i = 0;
    for (const m of text.matchAll(TOKEN)) {
      if (m.index! > last) out.push(text.slice(last, m.index));
      const tok = m[0];
      let cls = 'text-[#d9a441]';
      if (tok.startsWith('"')) cls = m[2] ? 'text-paper' : 'text-[#9fd7a8]';
      else if (/true|false/.test(tok)) cls = 'text-[#e8956b]';
      else if (tok === 'null') cls = 'text-paper/40';
      out.push(
        <span key={i++} className={cls}>
          {tok}
        </span>,
      );
      last = m.index! + tok.length;
    }
    out.push(text.slice(last));
    return out;
  }, [value]);

  return <pre className={cn('scrollbar-thin overflow-auto rounded-xl bg-ink p-4 font-mono text-[12px] leading-relaxed text-paper/70', className)}>{nodes}</pre>;
}
