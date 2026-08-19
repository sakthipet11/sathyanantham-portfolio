'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { ExternalLink, ArrowUpRight, CheckCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export interface ProjectItem {
  id: string | number;
  num: string;
  year?: string;
  title: string;
  category: string;
  client: string;
  description: string;
  architecture: string;
  highlights: string[];
  tech: string[];
  link: string;
}

export function ProjectsSection() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 });

  useEffect(() => {
    setMounted(true);
    async function loadProjectsFromDB() {
      try {
        const res = await fetch('/api/portfolio/projects');
        if (res.ok) {
          const data = await res.json();
          if (data.projects && Array.isArray(data.projects) && data.projects.length > 0) {
            const mapped: ProjectItem[] = data.projects.map((p: any, idx: number) => ({
              id: p.id || `proj-${idx}`,
              num: `Project_0${idx + 1}`,
              year: p.year || (idx === 0 ? '2023 - PRESENT' : idx === 1 ? '2018 - 2022' : '2013 - 2018'),
              title: p.title || '',
              category: p.category || (idx === 0 ? 'Micro Frontend & AI UI Automation' : 'Enterprise Digital Platforms'),
              client: p.client || (idx === 0 ? 'Nextuple Inc. & Dick’s Sporting Goods' : idx === 1 ? 'BAYER AG (Global)' : 'Enterprise Retail'),
              description: p.description || p.overview || '',
              architecture: p.overview || p.solution || 'Micro Frontend & Cloud Microservices Architecture',
              highlights: Array.isArray(p.highlights) ? p.highlights : [p.challenges, p.results].filter(Boolean),
              tech: Array.isArray(p.tech_stack) ? p.tech_stack : ['React', 'TypeScript', 'Node.js'],
              link: p.live_url || 'https://github.com/sakthipet11'
            }));
            setProjects(mapped);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to load projects from DB:', err);
      }
      setLoading(false);
    }
    loadProjectsFromDB();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedProject]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    }
  };

  return (
    <section id="projects" className="py-8 md:py-16 px-4 sm:px-8 relative z-10 max-w-7xl mx-auto">

      {/* Section Header */}
      <div className="flex flex-col items-start gap-3 mb-16 border-l-2 border-primary pl-4">
        <Badge variant="default" className="font-mono text-xs tracking-wider uppercase bg-primary/10 text-primary border-primary/20">
          FEATURED WORKS & ARCHITECTURE GALLERY (LIVE DB)
        </Badge>
        <h2 className="text-3xl sm:text-5xl font-black text-foreground uppercase tracking-tight">
          Selected Enterprise Platforms
        </h2>
        <p className="text-muted-foreground text-sm max-w-xl font-normal">
          High-availability Order Management Systems, Global Digital Ecosystems, and Omnichannel E-commerce Solutions loaded from PostgreSQL Database.
        </p>
      </div>

      {/* Interactive Glass List View */}
      <div ref={containerRef} onMouseMove={handleMouseMove} className="relative space-y-3">
        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-muted-foreground animate-pulse">
            Loading enterprise project records from database...
          </div>
        ) : projects.map((proj, index) => (
          <motion.div
            key={proj.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.08 }}
            whileHover={{ y: -2 }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => setSelectedProject(proj)}
          >
            <Card className="group relative rounded-2xl border border-border/80 bg-card/60 p-6 md:p-8 cursor-pointer transition-all hover:border-primary/50 hover:bg-card/80 backdrop-blur-xl shadow-xs hover:shadow-md overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">

                {/* Index & Year */}
                <div className="flex items-center gap-4 shrink-0 font-mono text-xs text-muted-foreground">
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-medium text-muted-foreground bg-muted/60 border border-border/60">{proj.num}</span>
                  <span className="tracking-wider text-[11px]">{proj.year}</span>
                </div>

                {/* Title */}
                <motion.h3
                  className="font-sans text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors flex-1"
                  animate={{
                    x: hoveredIndex === index ? 6 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {proj.title}
                </motion.h3>

                {/* Category Tag & Icon */}
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground px-3 py-1 bg-muted/40 border-border/60 group-hover:text-primary transition-colors">
                    {proj.category}
                  </Badge>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-primary group-hover:border-primary transition-colors">
                    <ArrowUpRight className="w-4 h-4 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>

              </div>
            </Card>
          </motion.div>
        ))}

        {/* Floating Glass Preview Card on Hover */}
        <motion.div
          className="absolute pointer-events-none z-50 w-80 h-48 bg-card/95 border border-primary/40 rounded-2xl overflow-hidden shadow-2xl p-5 flex flex-col justify-between hidden md:flex backdrop-blur-2xl"
          style={{
            x: springX,
            y: springY,
            translateX: '-50%',
            translateY: '-130%',
          }}
          animate={{
            opacity: hoveredIndex !== null && projects[hoveredIndex] ? 1 : 0,
            scale: hoveredIndex !== null && projects[hoveredIndex] ? 1 : 0.8,
          }}
          transition={{ duration: 0.2 }}
        >
          {hoveredIndex !== null && projects[hoveredIndex] && (
            <>
              <div>
                <span className="text-[10px] font-mono text-primary font-semibold block mb-1">
                  {projects[hoveredIndex].num} // {projects[hoveredIndex].client}
                </span>
                <h4 className="text-sm font-bold text-foreground tracking-tight line-clamp-2">
                  {projects[hoveredIndex].title}
                </h4>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed font-normal">
                  {projects[hoveredIndex].description}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
                {projects[hoveredIndex].tech.slice(0, 3).map((t, idx) => (
                  <Badge key={idx} variant="outline" className="text-[9px] font-mono px-2 py-0.5 bg-muted/80 border-border/60 text-muted-foreground">
                    {t}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </motion.div>

      </div>

      {/* Deep-Dive Glass Modal */}
      {mounted && selectedProject && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-background/80 backdrop-blur-2xl animate-in fade-in duration-200"
          onClick={() => setSelectedProject(null)}
        >
          <Card
            className="relative w-full max-w-2xl bg-card/95 border border-border/90 rounded-3xl shadow-2xl max-h-[85vh] flex flex-col backdrop-blur-2xl overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Header */}
            <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-xl border-b border-border/70 p-6 sm:p-8 flex items-start justify-between gap-4 shrink-0">
              <div>
                <Badge variant="default" className="text-xs font-mono px-3 py-1 bg-primary/10 text-primary border-primary/20">
                  {selectedProject.num} // {selectedProject.category}
                </Badge>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mt-3">{selectedProject.title}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">Client: {selectedProject.client}</p>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-2.5 rounded-full bg-muted border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0 cursor-pointer shadow-xs"
                aria-label="Close project modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
              <div>
                <h4 className="text-xs font-mono font-semibold uppercase text-muted-foreground mb-2">// OVERVIEW</h4>
                <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed font-normal">{selectedProject.description}</p>
              </div>

              <div>
                <h4 className="text-xs font-mono font-semibold uppercase text-muted-foreground mb-2">// ARCHITECTURE & STACK</h4>
                <p className="text-xs text-primary font-mono bg-muted/50 p-4 rounded-2xl border border-border/60 leading-relaxed">
                  {selectedProject.architecture}
                </p>
              </div>

              {selectedProject.highlights.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono font-semibold uppercase text-muted-foreground mb-2">// ENGINEERING ACCOMPLISHMENTS</h4>
                  <ul className="space-y-2">
                    {selectedProject.highlights.map((h, hIdx) => (
                      <li key={hIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/80">
                        <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4 border-t border-border/70 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-1.5">
                  {selectedProject.tech.map((t, idx) => (
                    <Badge key={idx} variant="outline" className="text-[10px] font-mono px-2.5 py-1 bg-muted/60 border-border/60 text-muted-foreground">
                      {t}
                    </Badge>
                  ))}
                </div>
                <a
                  href={selectedProject.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button size="sm" className="gap-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                    <span>Visit Platform</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
              </div>
            </div>

          </Card>
        </div>,
        document.body
      )}

    </section>
  );
}
