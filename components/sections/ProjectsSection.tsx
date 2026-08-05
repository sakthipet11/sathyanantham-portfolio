'use client';

import { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { ExternalLink, ArrowUpRight, CheckCircle, X, Terminal, Code2 } from 'lucide-react';

const PROJECTS = [
  {
    num: '01',
    id: 'nextuple-oms',
    year: '2023 - PRESENT',
    title: 'Nextuple Enterprise Order Management System',
    category: 'Micro Frontend & AI UI Automation',
    client: 'Nextuple Inc. & Dick’s Sporting Goods',
    description: 'High-performance order fulfillment suite including SKU Ranking Service, picking/packing/staging apps, Inventory Promise Engine, and Hub Web Application.',
    architecture: 'Micro Frontend Architecture with React 19, Node.js, TypeScript, and AI-driven automated UI rendering.',
    highlights: [
      'Engineered scalable micro frontends serving high-throughput fulfillment orders.',
      'Built real-time inventory promise engine and staging workflows.',
      'Integrated AI UI automation checks and performance monitors.'
    ],
    tech: ['React 19', 'Micro Frontends', 'Node.js', 'TypeScript', 'Jest', 'AI UI Automation'],
    link: 'https://nextuple.com'
  },
  {
    num: '02',
    id: 'bayer-ecosystem',
    year: '2018 - 2022',
    title: 'BAYER 30+ Global Digital Ecosystem',
    category: 'Enterprise Digital Platforms',
    client: 'BAYER AG (Global)',
    description: 'Multi-localized responsive platforms across 30+ global markets including Bepanthenol, Elevit, Bayer HR Career, and Heavy Menstrual Bleeding.',
    architecture: 'Acquia DX8, Drupal theming engine, React.js components, and multi-tenant localization routing.',
    highlights: [
      'Architected and delivered 30+ country-specific web platforms.',
      'Standardized component library using Acquia DX8 and React.',
      'Managed offshore delivery teams with zero P1 production outages.'
    ],
    tech: ['React.js', 'Drupal DX8', 'Acquia', 'SASS', 'JavaScript ES6+', 'Multi-localization'],
    link: 'https://www.elevit.com.au'
  },
  {
    num: '03',
    id: 'kohls-omnichannel',
    year: '2014 - 2018',
    title: 'Kohl’s Omnichannel Mobile & Tablet Engine',
    category: 'High-Scale E-Commerce',
    client: 'Kohl’s Department Stores (USA)',
    description: 'Mobile and tablet e-commerce suite (m.kohls.com, mobile.kohls.com) managing Home, Product List, Cart, BOPUS (Buy Online Pick Up In Store), and Checkout.',
    architecture: 'High-throughput JavaScript/Handlebars/FTL engine integrated with REST APIs, Visa Checkout, and Omniture analytics.',
    highlights: [
      'Directed 8+ developers for core e-commerce shopping bag & checkout modules.',
      'Pioneered Visa Checkout integration across mobile and tablet platforms.',
      'Achieved peak holiday performance handling millions of concurrent users.'
    ],
    tech: ['JavaScript', 'Handlebars', 'Visa Checkout', 'REST APIs', 'Node.js', 'Omniture'],
    link: 'https://m.kohls.com'
  },
  {
    num: '04',
    id: 'adidas-reebok',
    year: '2015 - 2017',
    title: 'Adidas & Reebok E-Commerce Platform',
    category: 'Sportswear Retail Engine',
    client: 'Adidas & Reebok India',
    description: 'Responsive online shopping experience (shop.adidas.co.in, shop4reebok.com) with product discovery, cart management, and payment gateway.',
    architecture: 'Full-stack React, Redux, Node.js, Express, and MongoDB micro-services architecture.',
    highlights: [
      'Implemented full-stack product catalog and dynamic cart management.',
      'Optimized catalog search and checkout flow for high mobile conversion.',
      'Configured Webpack build pipelines and Babel transpilation.'
    ],
    tech: ['React.js', 'Redux', 'Node.js', 'ExpressJS', 'MongoDB', 'Webpack'],
    link: 'https://shop.adidas.co.in'
  },
  {
    num: '05',
    id: 'us-bank',
    year: '2019 - 2021',
    title: 'US Bank Login & Authentication Help Portal',
    category: 'Banking & Security',
    client: 'US Bank (USA)',
    description: 'Secure, accessible responsive web application for bank account login assistance, identity verification, and security retrieval.',
    architecture: 'React.js, Styleguidist, Transmit framework, and WCAG AA accessibility compliance.',
    highlights: [
      'Delivered ultra-secure banking login assistance workflows.',
      'Ensured strict compliance with banking accessibility standards (WCAG).',
      'Automated unit testing using Jest and React Testing Library.'
    ],
    tech: ['React JS', 'Jest', 'Transmit', 'WCAG AA Accessibility', 'SASS'],
    link: 'https://usbank.com'
  },
  {
    num: '06',
    id: 'kraft-recipes',
    year: '2013 - 2015',
    title: 'Kraft Foods Culinary Platform',
    category: 'Food Service & Content Engine',
    client: 'Kraft Heinz (USA)',
    description: 'Interactive recipe discovery and food service platform (kraftrecipes.com) serving culinary content and ingredient search.',
    architecture: 'Responsive frontend template engine (FTL/Handlebars) integrated with CMS and REST APIs.',
    highlights: [
      'Built fast recipe search, filterable ingredients, and shopping list features.',
      'Optimized page load speed and Google AMP performance.',
      'Integrated CMS backend with real-time content updates.'
    ],
    tech: ['JavaScript', 'Handlebars', 'FTL Templates', 'REST APIs', 'CSS3/SASS'],
    link: 'http://kraftrecipes.com'
  }
];

export function ProjectsSection() {
  const [selectedProject, setSelectedProject] = useState<typeof PROJECTS[0] | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    }
  };

  return (
    <section id="projects" className="py-24 px-4 sm:px-8 relative z-10 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col items-start gap-2 mb-16 border-l-2 border-cyan-400 pl-4">
        <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase">
          // 03. FEATURED WORKS & ARCHITECTURE GALLERY
        </span>
        <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
          Selected Enterprise Platforms
        </h2>
        <p className="text-slate-400 text-sm max-w-xl">
          High-availability Order Management Systems, Global Digital Ecosystems, and Omnichannel E-commerce Solutions.
        </p>
      </div>

      {/* Interactive List View matching Reference Template Works.tsx */}
      <div ref={containerRef} onMouseMove={handleMouseMove} className="relative space-y-0">
        {PROJECTS.map((proj, index) => (
          <motion.div
            key={proj.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => setSelectedProject(proj)}
            className="group relative border-t border-slate-800 py-8 md:py-10 cursor-pointer transition-colors hover:bg-slate-900/40 px-4 rounded-xl"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

              {/* Index & Year */}
              <div className="flex items-center gap-4 shrink-0 font-mono text-xs text-slate-500">
                <span className="text-cyan-400 font-bold text-sm">// {proj.num}</span>
                <span className="tracking-widest">{proj.year}</span>
              </div>

              {/* Title */}
              <motion.h3
                className="font-sans text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors flex-1"
                animate={{
                  x: hoveredIndex === index ? 15 : 0,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {proj.title}
              </motion.h3>

              {/* Tags & Action */}
              <div className="flex items-center gap-3 shrink-0 flex-wrap">
                <span className="text-[10px] font-mono text-cyan-400 px-3 py-1 rounded bg-slate-900 border border-cyan-900/60">
                  {proj.category}
                </span>
                <ArrowUpRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
              </div>

            </div>
          </motion.div>
        ))}

        {/* Bottom Line */}
        <div className="border-t border-slate-800" />

        {/* Floating Preview Card on Hover */}
        <motion.div
          className="absolute pointer-events-none z-50 w-72 h-44 bg-slate-900 border border-cyan-500/40 rounded-xl overflow-hidden shadow-2xl p-4 flex flex-col justify-between hidden md:flex"
          style={{
            x: springX,
            y: springY,
            translateX: '-50%',
            translateY: '-130%',
          }}
          animate={{
            opacity: hoveredIndex !== null ? 1 : 0,
            scale: hoveredIndex !== null ? 1 : 0.8,
          }}
          transition={{ duration: 0.2 }}
        >
          {hoveredIndex !== null && (
            <>
              <div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold block mb-1">
                  {PROJECTS[hoveredIndex].num} // {PROJECTS[hoveredIndex].client}
                </span>
                <h4 className="text-sm font-bold text-white tracking-tight line-clamp-2">
                  {PROJECTS[hoveredIndex].title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {PROJECTS[hoveredIndex].description}
                </p>
              </div>

              <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-800">
                {PROJECTS[hoveredIndex].tech.slice(0, 3).map((t, idx) => (
                  <span key={idx} className="text-[9px] font-mono text-slate-300 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                    [{t}]
                  </span>
                ))}
              </div>
            </>
          )}
        </motion.div>

      </div>

      {/* Deep-Dive Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[70vh] overflow-y-auto">

            <button
              onClick={() => setSelectedProject(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white transition-colors z-10 sm:top-6 sm:right-6"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 pr-10">
              <div>
                <span className="text-xs font-mono text-cyan-400 px-2.5 py-1 rounded bg-cyan-950 border border-cyan-800">
                  {selectedProject.num} // {selectedProject.category}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-2">{selectedProject.title}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Client: {selectedProject.client}</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-mono font-bold uppercase text-slate-400 mb-2">// OVERVIEW</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{selectedProject.description}</p>
            </div>

            <div>
              <h4 className="text-xs font-mono font-bold uppercase text-slate-400 mb-2">// ARCHITECTURE & STACK</h4>
              <p className="text-xs text-cyan-300 font-mono bg-slate-950 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
                {selectedProject.architecture}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-mono font-bold uppercase text-slate-400 mb-2">// ENGINEERING ACCOMPLISHMENTS</h4>
              <ul className="space-y-2">
                {selectedProject.highlights.map((h, hIdx) => (
                  <li key={hIdx} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-1.5">
                {selectedProject.tech.map((t, idx) => (
                  <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                    [{t}]
                  </span>
                ))}
              </div>
              <a
                href={selectedProject.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-colors"
              >
                <span>Visit Platform</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>
        </div>
      )}

    </section>
  );
}
