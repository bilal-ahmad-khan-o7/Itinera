import { useEffect } from 'react';
import { LandingNav } from '@/components/landing/LandingNav';
import { Hero } from '@/components/landing/Hero';
import { IntegrationMarquee } from '@/components/landing/IntegrationMarquee';
import { Workflow } from '@/components/landing/Workflow';
import { IntegrationMap } from '@/components/landing/IntegrationMap';
import { Bento } from '@/components/landing/Bento';
import { UnderTheHood } from '@/components/landing/UnderTheHood';
import { CtaBand, Faq, Footer } from '@/components/landing/Closing';

export default function Landing() {
  useEffect(() => {
    document.title = 'Itinera: AI travel desk';
  }, []);

  // The landing page is always dark, independent of the workspace theme.
  return (
    <div className="dark min-h-dvh bg-night text-cream [color-scheme:dark]">
      <LandingNav />
      <main>
        <Hero />
        <IntegrationMarquee />
        <Workflow />
        <IntegrationMap />
        <Bento />
        <UnderTheHood />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}
