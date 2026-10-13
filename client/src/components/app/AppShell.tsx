import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowSquareOut,
  Buildings,
  ChatsCircle,
  FileText,
  GearSix,
  GlobeHemisphereEast,
  List,
  Monitor,
  Moon,
  SquaresFour,
  Sun,
  TerminalWindow,
} from '@phosphor-icons/react';
import { Logo } from '@/components/brand/Logo';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { useApplyTheme } from '@/hooks/useTheme';
import { useServerStatus } from '@/hooks/useServerStatus';
import { useSettings, type ThemeMode } from '@/store/settings';
import { useCrm } from '@/store/crm';
import { cn } from '@/lib/utils';

const NAV = [
  {
    group: 'Workspace',
    items: [
      { to: '/app', label: 'Dashboard', icon: SquaresFour, end: true },
      { to: '/app/enquiries', label: 'Enquiries', icon: ChatsCircle, badge: 'leads' as const },
      { to: '/app/quotes', label: 'Quotes', icon: FileText },
      { to: '/app/hotels', label: 'Hotel finder', icon: Buildings },
      { to: '/app/destinations', label: 'Destinations', icon: GlobeHemisphereEast },
    ],
  },
  {
    group: 'Developer',
    items: [
      { to: '/app/api', label: 'API Console', icon: TerminalWindow },
      { to: '/app/settings', label: 'Settings', icon: GearSix },
    ],
  },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const newLeads = useCrm((s) => s.leads.filter((l) => l.status === 'new').length);
  return (
    <nav className="space-y-6">
      {NAV.map((section) => (
        <div key={section.group}>
          <p className="mb-2 px-3 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{section.group}</p>
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                      isActive ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <motion.span layoutId="nav-pill" className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-primary" />}
                      <item.icon size={18} weight={isActive ? 'fill' : 'regular'} className={isActive ? 'text-foreground' : ''} />
                      {item.label}
                      {item.badge === 'leads' && newLeads > 0 && (
                        <span className="ml-auto rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular-nums">{newLeads}</span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

const THEMES: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
  { mode: 'light', icon: Sun, label: 'Light' },
  { mode: 'dark', icon: Moon, label: 'Dark' },
  { mode: 'system', icon: Monitor, label: 'System' },
];

function ThemeSwitch() {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  return (
    <div className="flex rounded-xl border bg-background/60 p-0.5" role="radiogroup" aria-label="Theme">
      {THEMES.map((t) => (
        <Tooltip key={t.mode}>
          <TooltipTrigger asChild>
            <button
              type="button"
              role="radio"
              aria-checked={theme === t.mode}
              aria-label={t.label}
              onClick={() => setTheme(t.mode)}
              className={cn('grid h-7 flex-1 place-items-center rounded-lg transition-colors', theme === t.mode ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              <t.icon size={15} />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function ServerBadge() {
  const { data, isError, isLoading } = useServerStatus();
  const state = isLoading ? 'checking' : isError ? 'offline' : data?.demoMode ? 'demo' : 'live';
  const copy = {
    checking: ['Connecting…', 'Contacting the API'],
    offline: ['API offline', 'Start the server with npm run dev'],
    demo: ['Demo mode', 'No LLM key set; AI returns samples'],
    live: ['Live AI', data?.model ?? ''],
  }[state];
  return (
    <Link to="/app/api" className="block rounded-xl border bg-background/60 p-3 transition-colors hover:border-primary/40">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className={cn('size-2 rounded-full', state === 'live' && 'bg-success', state === 'demo' && 'bg-warning', state === 'offline' && 'bg-destructive', state === 'checking' && 'animate-pulse bg-muted-foreground')} />
        {copy[0]}
      </div>
      <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{copy[1]}</p>
    </Link>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link to="/" className="px-2 pt-1" onClick={onNavigate}>
        <Logo />
      </Link>
      <div className="flex-1 overflow-y-auto">
        <NavItems onNavigate={onNavigate} />
      </div>
      <div className="space-y-2">
        <ServerBadge />
        <ThemeSwitch />
        <Link to="/" className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowSquareOut size={14} /> Back to the site
        </Link>
      </div>
    </div>
  );
}

export function AppShell() {
  useApplyTheme(true);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-sidebar lg:block">
        <SidebarBody />
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/">
          <Logo />
        </Link>
        <button type="button" onClick={() => setMobileOpen(true)} className="grid size-9 place-items-center rounded-lg hover:bg-secondary" aria-label="Open navigation">
          <List size={20} />
        </button>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="lg:pl-64">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Toaster position="bottom-right" />
    </div>
    </TooltipProvider>
  );
}
