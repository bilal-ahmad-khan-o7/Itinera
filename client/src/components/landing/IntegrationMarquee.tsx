import { BookOpenText, Brain, Buildings, CloudSun, CurrencyCircleDollar, MapPin, Mountains, Train, HardDrives } from '@phosphor-icons/react';

const ITEMS = [
  { icon: Brain, name: 'Groq LLM', note: 'JSON mode · SSE' },
  { icon: MapPin, name: 'Nominatim', note: 'geocoding' },
  { icon: Buildings, name: 'Overpass', note: 'real hotels' },
  { icon: CloudSun, name: 'Open-Meteo', note: 'forecast' },
  { icon: Mountains, name: 'Open-Meteo', note: 'fallback geocoder' },
  { icon: BookOpenText, name: 'Wikipedia', note: 'destination guide' },
  { icon: CurrencyCircleDollar, name: 'Frankfurter', note: 'ECB FX rates' },
  { icon: HardDrives, name: 'Express 5', note: 'API gateway' },
  { icon: Train, name: 'Railway', note: 'hosting' },
];

export function IntegrationMarquee() {
  return (
    <section aria-label="Integrated services" className="border-y border-white/6 bg-night py-6">
      <div className="mask-fade-x overflow-hidden">
        <div className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
          {[...ITEMS, ...ITEMS].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-sm whitespace-nowrap" aria-hidden={i >= ITEMS.length}>
              <item.icon size={18} className="text-saffron" />
              <span className="font-medium text-cream/85">{item.name}</span>
              <span className="text-cream/35">{item.note}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
