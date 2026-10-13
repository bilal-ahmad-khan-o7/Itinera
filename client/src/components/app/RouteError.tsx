import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { WarningOctagon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error instanceof Error ? error.message : 'Unknown error';
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6 text-center">
      <div className="max-w-md">
        <WarningOctagon size={40} className="mx-auto text-destructive" weight="duotone" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Something broke on this page</h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">{message}</p>
        <Button asChild className="mt-6">
          <Link to="/app">Back to the dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
