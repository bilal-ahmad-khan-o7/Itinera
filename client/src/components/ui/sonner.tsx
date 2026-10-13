import { CheckCircle, Info, SpinnerGap, Warning, XCircle } from '@phosphor-icons/react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useResolvedTheme } from '@/hooks/useTheme';

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useResolvedTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CheckCircle weight="fill" className="size-4 text-success" />,
        info: <Info weight="fill" className="size-4" />,
        warning: <Warning weight="fill" className="size-4 text-warning" />,
        error: <XCircle weight="fill" className="size-4 text-destructive" />,
        loading: <SpinnerGap className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
