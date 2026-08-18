'use client';

import { motion } from 'framer-motion';
import { Award, Calendar, MapPin, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const EXPERIENCES = [
  {
    tag: '// EXP_01',
    company: 'Nextuple Private Ltd',
    location: 'Bangalore, India',
    period: 'Aug 2022 – Present',
    roles: [
      { title: 'Senior Software Engineer', duration: 'June 2023 – Present' },
      { title: 'Senior UI Engineer', duration: 'Aug 2022 – June 2023' }
    ],
    award: 'Awarded Top Performer of the Year 2023',
    highlights: [
      'Spearheaded frontend architecture for Nextuple Enterprise Order Management System (SKU Ranking Service, Picking/Packing/Staging App, Promise Engine, and Hub App).',
      'Designed and implemented Micro Frontend Architectures with React.js, Node.js, and TypeScript, improving modularity and rendering speed by 40%.',
      'Integrated AI-powered UI automation, real-time collaboration tools, and intelligent design tokens.',
      'Led technical strategy, code reviews, and mentorship for a high-performing engineering team.'
    ],
    tech: ['React 19', 'Next.js 15', 'Micro Frontends', 'Node.js', 'TypeScript', 'AI UI Automation', 'Redux']
  },
  {
    tag: '// EXP_02',
    company: 'Cognizant',
    location: 'Coimbatore, India',
    period: 'Nov 2018 – Aug 2022',
    roles: [
      { title: 'Senior Associate', duration: 'Nov 2018 – Aug 2022' }
    ],
    award: 'Best Performer Award (2019 & 2020 Performance Cycles)',
    highlights: [
      'Architected 30+ global multi-localized responsive digital platforms for BAYER (Bepanthenol, Elevit, Bayer HR Career, Heavy Menstrual Bleeding).',
      'Engineered US Bank Login Help authentication portal with React.js, Transmit, and high security compliance.',
      'Utilized Acquia DX8, Drupal theming, JavaScript ES6+, and SASS to standardize global content management.',
      'Managed offshore technical delivery, task estimation, and P1 issue resolution.'
    ],
    tech: ['React.js', 'Drupal DX8', 'JavaScript ES6+', 'Acquia', 'SASS', 'Jest', 'Styleguidist']
  },
  {
    tag: '// EXP_03',
    company: 'Skava Systems (An Infosys Company)',
    location: 'Coimbatore, India',
    period: 'Feb 2012 – Nov 2018',
    roles: [
      { title: 'Dev Lead', duration: 'March 2016 – Nov 2018' },
      { title: 'Senior Software Engineer', duration: 'Jan 2015 – Feb 2016' },
      { title: 'Software Engineer', duration: 'Feb 2014 – Dec 2015' },
      { title: 'Associate Software Engineer', duration: 'Feb 2012 – Dec 2013' }
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
    <section id="experience" className="py-24 px-4 sm:px-6 relative z-10 max-w-6xl mx-auto">
      
      {/* Section Header */}
      <div className="flex flex-col items-start gap-3 mb-16 border-l-2 border-cyan-400 pl-4">
        <Badge variant="outline" className="font-mono text-xs tracking-widest uppercase text-cyan-400 border-cyan-500/30 bg-cyan-950/40">
          // 02. CAREER MILESTONES
        </Badge>
        <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
          13+ Years of Lead Engineering
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl">
          Track record leading frontend architecture and high-impact engineering teams.
        </p>
      </div>

      {/* Timeline List with Glass Cards */}
      <div className="space-y-10 relative">
        {EXPERIENCES.map((exp, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.15 }}
            className="p-6 sm:p-10 rounded-3xl bg-slate-950/50 border border-slate-800/80 backdrop-blur-2xl hover:border-cyan-500/50 transition-all duration-300 relative group shadow-2xl overflow-hidden"
          >
            {/* Glass Overlay Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-indigo-500/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Header info */}
            <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6 mb-6">
              <div>
                <span className="text-[11px] font-mono text-cyan-400 tracking-widest block font-semibold">{exp.tag}</span>
                <h3 className="text-2xl font-bold text-white tracking-tight mt-1">{exp.company}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{exp.location}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800 shadow-inner backdrop-blur-md">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>{exp.period}</span>
              </div>
            </div>

            {/* Roles */}
            <div className="relative space-y-2 mb-6 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 backdrop-blur-sm">
              {exp.roles.map((r, rIdx) => (
                <div key={rIdx} className="flex items-center justify-between text-xs sm:text-sm font-mono">
                  <span className="font-bold text-slate-100">{r.title}</span>
                  <span className="text-slate-400 text-xs">{r.duration}</span>
                </div>
              ))}
            </div>

            {/* Award Banner */}
            {exp.award && (
              <div className="relative flex items-center gap-3 p-4 mb-6 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-mono backdrop-blur-md shadow-md">
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{exp.award}</span>
              </div>
            )}

            {/* Bullet Highlights */}
            <ul className="relative space-y-3 mb-8">
              {exp.highlights.map((h, hIdx) => (
                <li key={hIdx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>

            {/* Tech Stack Bracket Tags */}
            <div className="relative flex flex-wrap gap-2 pt-6 border-t border-slate-800/80">
              {exp.tech.map((t, tIdx) => (
                <span
                  key={tIdx}
                  className="text-[11px] font-mono px-3 py-1 rounded-xl bg-slate-900/80 text-cyan-300 border border-slate-800 shadow-sm"
                >
                  [{t}]
                </span>
              ))}
            </div>

          </motion.div>
        ))}
      </div>

    </section>
  );
}
