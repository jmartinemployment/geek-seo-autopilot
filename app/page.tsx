export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/marketing/navbar";
import { HeroSection } from "@/components/marketing/hero-section";
import { ProblemSection } from "@/components/marketing/problem-section";
import { ProcessSection } from "@/components/marketing/process-section";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { TestimonialsSection } from "@/components/marketing/testimonials";
import { PricingSection } from "@/components/marketing/pricing-section";
import { ContentQualitySection } from "@/components/marketing/content-quality";
import { AutoPublishSection } from "@/components/marketing/auto-publish-section";
import { FAQSection } from "@/components/marketing/faq-section";
import { FinalCTA } from "@/components/marketing/final-cta";
import { Footer } from "@/components/marketing/footer";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <ProcessSection />
        <FeaturesGrid />
        <TestimonialsSection />
        <PricingSection />
        <ContentQualitySection />
        <AutoPublishSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
