import { Link } from 'react-router';
import { Compass } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="dark grid min-h-dvh place-items-center bg-night p-6 text-center text-cream">
      <div>
        <Compass size={48} weight="duotone" className="mx-auto text-saffron" />
        <h1 className="mt-4 font-display text-4xl font-semibold">Off the map</h1>
        <p className="mt-2 text-cream/60">This page isn't on any itinerary.</p>
        <Button asChild className="mt-6 bg-saffron text-night hover:bg-saffron/90">
          <Link to="/">Take me home</Link>
        </Button>
      </div>
    </div>
  );
}
