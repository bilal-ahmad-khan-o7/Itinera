import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { ApiError } from '@/lib/api';
import { PageFallback } from '@/components/app/PageFallback';
import { RouteError } from '@/components/app/RouteError';

// Every route is code-split: the landing page never downloads workspace code and vice versa.
const Landing = lazy(() => import('@/pages/Landing'));
const AppShell = lazy(() => import('@/components/app/AppShell').then((m) => ({ default: m.AppShell })));
const Dashboard = lazy(() => import('@/pages/app/Dashboard'));
const Enquiries = lazy(() => import('@/pages/app/Enquiries'));
const Hotels = lazy(() => import('@/pages/app/Hotels'));
const Quotes = lazy(() => import('@/pages/app/Quotes'));
const QuoteBuilder = lazy(() => import('@/pages/app/QuoteBuilder'));
const Destinations = lazy(() => import('@/pages/app/Destinations'));
const ApiConsole = lazy(() => import('@/pages/app/ApiConsole'));
const Settings = lazy(() => import('@/pages/app/Settings'));
const NotFound = lazy(() => import('@/pages/NotFound'));

const page = (el: React.ReactNode) => <Suspense fallback={<PageFallback />}>{el}</Suspense>;

const router = createBrowserRouter([
  { path: '/', element: <Suspense fallback={<div className="min-h-dvh bg-night" />}><Landing /></Suspense>, errorElement: <RouteError /> },
  {
    path: '/app',
    element: <Suspense fallback={<div className="min-h-dvh bg-background" />}><AppShell /></Suspense>,
    errorElement: <RouteError />,
    children: [
      { index: true, element: page(<Dashboard />) },
      { path: 'enquiries', element: page(<Enquiries />) },
      { path: 'hotels', element: page(<Hotels />) },
      { path: 'quotes', element: page(<Quotes />) },
      { path: 'quotes/new', element: page(<QuoteBuilder />) },
      { path: 'quotes/:id', element: page(<QuoteBuilder />) },
      { path: 'destinations', element: page(<Destinations />) },
      { path: 'api', element: page(<ApiConsole />) },
      { path: 'settings', element: page(<Settings />) },
    ],
  },
  { path: '*', element: page(<NotFound />) },
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      // Don't hammer the API on client errors (validation, not found); retry transient ones once.
      retry: (count, err) => count < 1 && !(err instanceof ApiError && err.status >= 400 && err.status < 500),
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
      </MotionConfig>
    </QueryClientProvider>
  );
}
