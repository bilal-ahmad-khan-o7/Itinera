import { useState } from 'react';
import { Link } from 'react-router';
import { FilePlus, GlobeHemisphereEast, MagnifyingGlass } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, PageHeader } from '@/components/app/common';
import { DestinationPanel } from '@/components/quote/DestinationPanel';
import { POPULAR_DESTINATIONS } from '@/lib/samples';

export default function Destinations() {
  const [input, setInput] = useState('');
  const [city, setCity] = useState('');

  const go = (c: string) => {
    setInput(c);
    setCity(c);
  };

  return (
    <>
      <PageHeader
        eyebrow="Destination intelligence"
        title="Destinations"
        description="One request to our API fans out to geocoding, weather, Wikipedia and exchange rates. Open the trace chip to see how."
      />

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim().length >= 2) setCity(input.trim());
        }}
      >
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Try Goa, Kerala, Bali, Paris…" className="h-11 pl-10 text-base" aria-label="Destination" />
        </div>
        <Button type="submit" size="lg">
          Look up
        </Button>
      </form>
      <div className="mb-8 flex flex-wrap gap-1.5">
        {POPULAR_DESTINATIONS.map((d) => (
          <button key={d} type="button" onClick={() => go(d)} className="rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
            {d}
          </button>
        ))}
      </div>

      {city ? (
        <div className="space-y-4">
          <DestinationPanel key={city} city={city} />
          <div className="flex justify-end">
            <Button asChild variant="outline">
              <Link to={`/app/quotes/new?destination=${encodeURIComponent(city)}`}>
                <FilePlus /> Start a quote for {city}
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={GlobeHemisphereEast}
          title="Pick a destination"
          body="Regions like Goa or Kerala resolve through OpenStreetMap Nominatim. If it is unavailable, the server falls back to Open-Meteo's geocoder automatically."
        />
      )}
    </>
  );
}
