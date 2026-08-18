import { CustomCursor } from '@/components/ui/CustomCursor';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/footer';
import { SmoothScroll } from '@/components/layout/SmoothScroll';
import { HeroSection } from '@/components/sections/HeroSection';
import { CoverLetterSection } from '@/components/sections/CoverLetterSection';
import { ExperienceSection } from '@/components/sections/ExperienceSection';
import { ProjectsSection } from '@/components/sections/ProjectsSection';
import { TechMarquee } from '@/components/sections/TechMarquee';
import { SkillsMatrix } from '@/components/sections/SkillsMatrix';
import { LiveHandoffSection } from '@/components/sections/LiveHandoffSection';
import { AITwinDrawer } from '@/components/ai/AITwinDrawer';

export default function Home() {
  return (
    <SmoothScroll>
      <div className="relative min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground overflow-x-hidden transition-colors duration-300">
        
        {/* Custom Glowing Cursor */}
        <CustomCursor />

        {/* Global Glass Navigation Header */}
        <Navbar />

        {/* Main Portfolio Sections */}
        <main className="relative z-10 space-y-4">
          <HeroSection />
          <CoverLetterSection />
          <ExperienceSection />
          <ProjectsSection />
          <TechMarquee />
          <SkillsMatrix />
          <LiveHandoffSection />
        </main>

        {/* Global Glass Footer */}
        <Footer />

        {/* AI Digital Twin Slide-Over Drawer */}
        <AITwinDrawer />

      </div>
    </SmoothScroll>
  );
}
