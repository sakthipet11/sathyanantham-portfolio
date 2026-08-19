'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, Calendar, MapPin, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getApiHost } from '@/lib/utils';

export interface ExperienceItem {
  id: string | number;
  tag: string;
  company: string;
  location: string;
  period: string;
  roles: { title: string; duration: string }[];
  award?: string;
  highlights: string[];
  tech: string[];
}

export function ExperienceSection() {
  const [experiences, setExperiences] = useState<ExperienceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExperienceFromDB() {
      try {
        const apiHost = getApiHost();
        const res = await fetch(`${apiHost}/api/portfolio/experience`);
        if (res.ok) {
          const data = await res.json();
          if (data.experience && Array.isArray(data.experience) && data.experience.length > 0) {
            const mapped: ExperienceItem[] = data.experience.map((e: any, idx: number) => ({
              id: e.id || `exp-${idx}`,
              tag: `Exp_0${idx + 1}`,
              company: e.company || '',
              location: e.location || 'Coimbatore, Tamil Nadu, India',
              period: e.duration || (idx === 0 ? 'Aug 2022 – Present' : idx === 1 ? 'Nov 2018 – Aug 2022' : 'July 2012 – Nov 2018'),
              roles: [
                { title: e.role || 'Lead Software Engineer', duration: e.duration || '2022 - Present' }
              ],
              award: idx === 0 ? 'Top Performer of the Year 2023 & Monthly Spot Award' : idx === 1 ? 'Best Performer Award' : 'Star Performer of the Year',
              highlights: Array.isArray(e.highlights) ? e.highlights : [],
              tech: Array.isArray(e.technologies) ? e.technologies : ['React', 'TypeScript', 'Node.js']
            }));
            setExperiences(mapped);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to load experience from API:', err);
      }
      setLoading(false);
    }
    loadExperienceFromDB();
  }, []);

  return (
    <section id="experience" className="py-8 md:py-16 px-4 sm:px-6 relative z-10 max-w-6xl mx-auto">

      {/* Section Header */}
      <div className="flex flex-col items-start gap-3 mb-16 border-l-2 border-primary pl-4">
        <Badge variant="default" className="font-mono text-xs tracking-wider uppercase bg-primary/10 text-primary border-primary/20">
          CAREER MILESTONES (LIVE DB)
        </Badge>
        <h2 className="text-3xl sm:text-5xl font-black text-foreground uppercase tracking-tight">
          13+ Years of Lead Engineering
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl font-normal">
          Track record leading frontend architecture and high-impact engineering teams loaded dynamically from PostgreSQL Database.
        </p>
      </div>

      {/* Timeline List */}
      <div className="space-y-8 relative">
        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-muted-foreground animate-pulse">
            Loading career milestone records from database...
          </div>
        ) : experiences.map((exp, idx) => (
          <motion.div
            key={exp.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.15 }}
            className="relative"
          >
            <Card className="p-6 sm:p-10 rounded-3xl bg-card/60 border border-border/80 backdrop-blur-2xl hover:border-primary/40 transition-all duration-300 relative group shadow-xs hover:shadow-md overflow-hidden">

              {/* Glass Overlay Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Header info */}
              <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-6 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-medium text-muted-foreground bg-muted/60 border border-border/60">
                      {exp.tag}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground tracking-tight mt-1">{exp.company}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 font-sans">
                    <MapPin className="w-3.5 h-3.5 opacity-70" />
                    <span>{exp.location}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/40 px-3.5 py-1.5 rounded-xl border border-border/60 backdrop-blur-md">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{exp.period}</span>
                </div>
              </div>

              {/* Roles */}
              <div className="relative space-y-2 mb-6 bg-muted/40 p-4 rounded-2xl border border-border/60 backdrop-blur-sm">
                {exp.roles.map((r, rIdx) => (
                  <div key={rIdx} className="flex items-center justify-between text-xs sm:text-sm font-mono">
                    <span className="font-semibold text-foreground">{r.title}</span>
                    <span className="text-muted-foreground text-xs">{r.duration}</span>
                  </div>
                ))}
              </div>

              {/* Award Banner */}
              {exp.award && (
                <div className="relative flex items-center gap-3 p-4 mb-6 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-xs font-mono backdrop-blur-md shadow-xs">
                  <Award className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium">{exp.award}</span>
                </div>
              )}

              {/* Bullet Highlights */}
              <ul className="relative space-y-3 mb-8">
                {exp.highlights.map((h, hIdx) => (
                  <li key={hIdx} className="flex items-start gap-3 text-xs sm:text-sm text-foreground/85 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              {/* Tech Stack Tags */}
              <div className="relative flex flex-wrap gap-2 pt-6 border-t border-border/70">
                {exp.tech.map((t, tIdx) => (
                  <Badge
                    key={tIdx}
                    variant="outline"
                    className="text-[11px] font-mono px-3 py-1 rounded-xl bg-muted/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                  >
                    {t}
                  </Badge>
                ))}
              </div>

            </Card>
          </motion.div>
        ))}
      </div>

    </section>
  );
}
