'use client';

import { motion } from 'framer-motion';
import { Award, Calendar, MapPin, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const EXPERIENCES = [
  {
    tag: 'Exp_01',
    company: 'Nextuple Inc.',
    location: 'Coimbatore, Tamil Nadu, India',
    period: 'Aug 2022 – Present',
    roles: [
      { title: 'Lead Software Engineer (Leading 8 Engineers)', duration: 'Aug 2023 – Present' },
      { title: 'Senior Software Engineer', duration: 'Aug 2022 – July 2023' }
    ],
    award: 'Top Performer of the Year 2023 & Monthly Spot Award',
    highlights: [
      'Leading an engineering team of 8 developers across frontend and backend, establishing engineering standards, code reviews, and solution design.',
      'Designed and delivered Micro Frontend Architecture using Module Federation across 15+ enterprise modules and Nextuple OMS platforms (SKU Ranking, Promise Engine, Picking, Packing, Staging, Hub).',
      'Pioneered Claude Skills Initiative, designing reusable Claude Skills that automated UI Schema Generation, Design Docs, Code Gen, and Unit Test Gen—reducing engineering effort from ~20 days to 5 days.',
      'Led integration of IBM AI-powered chatbot into Call Center & Order Management applications and contributed to IBM Sterling OMS customizations for Tapestry, DSG, and Ashley Furniture.'
    ],
    tech: ['React 19', 'Next.js 15', 'TypeScript', 'Micro Frontends', 'Claude Skills', 'IBM AI', 'IBM Sterling OMS', 'Node.js', 'Python', 'Spring Boot']
  },
  {
    tag: 'Exp_02',
    company: 'Cognizant Technology Solutions',
    location: 'Coimbatore, Tamil Nadu, India',
    period: 'Nov 2018 – Aug 2022',
    roles: [
      { title: 'Senior Associate', duration: 'Nov 2018 – Aug 2022' }
    ],
    award: 'Best Performer Award (2019 & 2020 Performance Cycles)',
    highlights: [
      'Architected 30+ global multi-localized responsive digital platforms for BAYER (Bepanthenol, Elevit, Bayer HR Career, Heavy Menstrual Bleeding).',
      'Engineered US Bank Login Help authentication portal with React.js, Transmit, and high security compliance.',
      'Utilized Acquia DX8, Drupal theming, JavaScript ES6+, and SASS to standardize global content management.',
      'Managed offshore technical delivery, task estimation, code reviews, and P1 issue resolution.'
    ],
    tech: ['React.js', 'Drupal DX8', 'JavaScript ES6+', 'Acquia', 'SASS', 'Jest', 'Styleguidist']
  },
  {
    tag: 'Exp_03',
    company: 'Skava Systems (An Infosys Company)',
    location: 'Coimbatore, Tamil Nadu, India',
    period: 'July 2012 – Nov 2018',
    roles: [
      { title: 'Dev Lead', duration: 'March 2016 – Nov 2018' },
      { title: 'Senior Software Engineer', duration: 'Jan 2015 – Feb 2016' },
      { title: 'Software Engineer', duration: 'Feb 2014 – Dec 2015' },
      { title: 'Associate Software Engineer', duration: 'July 2012 – Dec 2013' }
    ],
    award: 'Skava Star Performer of the Year (2013 & 2015)',
    highlights: [
      'Led development of Kohl’s Omnichannel Mobile & Tablet platforms (m.kohls.com) managing 8+ engineers across Home, Checkout, BOPUS, and Loyalty modules.',
      'Pioneered Visa Checkout integration in mobile/tablet e-commerce, driving high conversion rates.',
      'Architected sportswear e-commerce platforms for Adidas & Reebok (shop.adidas.co.in, shop4reebok.com) using React, Redux, Node.js, Express, and MongoDB.',
      'Built Kraft Foods responsive culinary platform (kraftrecipes.com) serving millions of monthly active users.'
    ],
    tech: ['React.js', 'Redux', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'HTML5/CSS3', 'Visa Checkout']
  }
];

export function ExperienceSection() {
  return (
    <section id="experience" className="py-8 md:py-16 px-4 sm:px-6 relative z-10 max-w-6xl mx-auto">

      {/* Section Header */}
      <div className="flex flex-col items-start gap-3 mb-16 border-l-2 border-primary pl-4">
        <Badge variant="default" className="font-mono text-xs tracking-wider uppercase bg-primary/10 text-primary border-primary/20">
          CAREER MILESTONES
        </Badge>
        <h2 className="text-3xl sm:text-5xl font-black text-foreground uppercase tracking-tight">
          13+ Years of Lead Engineering
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl font-normal">
          Track record leading frontend architecture and high-impact engineering teams.
        </p>
      </div>

      {/* Timeline List with Structural Connector & Uniform Glass Cards */}
      <div className="space-y-8 relative">
        {EXPERIENCES.map((exp, idx) => (
          <motion.div
            key={idx}
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
