import { CustomCursor } from '@/components/ui/CustomCursor';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/footer';
import { SmoothScroll } from '@/components/layout/SmoothScroll';
import { HeroSection } from '@/components/sections/HeroSection';
import { GlassmorphismPortfolioBlock } from '@/components/ui/glassmorphism-portfolio-block-shadcnui';
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
      <div className="relative min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-cyan-400 selection:text-slate-950 overflow-x-hidden">
        
        {/* Custom Glowing Cursor */}
        <CustomCursor />

        {/* Global Glass Navigation Header */}
        <Navbar />

        {/* Main Content Sections */}
        <main className="relative z-10 space-y-4">
          <HeroSection />
          
          {/* Glassmorphism Portfolio Showcase Block */}
          <GlassmorphismPortfolioBlock />

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
