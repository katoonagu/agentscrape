export function renderNextPage(): string {
  return `import type { ReactNode } from "react";
import siteContent from "@/content/site-content.json";
import { ContactSection } from "@/components/site/ContactSection";
import { DraftBanner } from "@/components/site/DraftBanner";
import { HeroSection } from "@/components/site/HeroSection";
import { PlannedPagesNav } from "@/components/site/PlannedPagesNav";
import { ServicesSection } from "@/components/site/ServicesSection";
import { TrustSection } from "@/components/site/TrustSection";
import type { ScaffoldSectionId, SiteContentModel } from "@/components/site/types";

const content = siteContent as SiteContentModel;

export default function Page() {
  const registry: Record<ScaffoldSectionId, ReactNode> = {
    hero: <HeroSection hero={content.page.hero} />,
    "planned-pages": <PlannedPagesNav plannedPages={content.page.plannedPages} />,
    services: <ServicesSection cards={content.page.services} />,
    trust: <TrustSection trust={content.page.trust} />,
    contact: <ContactSection contact={content.page.contact} />
  };

  return (
    <main className="site-shell">
      <DraftBanner draft={content.draft} />
      <div className="site-frame">
        {content.page.sectionOrder.map((sectionId) => (
          <div key={sectionId}>{registry[sectionId]}</div>
        ))}
      </div>
    </main>
  );
}
`;
}
