'use client';

import { motion } from 'framer-motion';
import { Cpu, Code2, Database, Users, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const SKILL_CATEGORIES = [
  {
    tag: '// STACK_01',
    title: 'Frontend Architecture',
    icon: Code2,
    color: 'text-cyan-400',
    skills: [
      'React 19 & Next.js 15 (App Router)',
      'TypeScript & Modern JavaScript ES6+',
      'Micro Frontend Architectures',
      'Tailwind CSS v4 & Brutalist Void UI',
      'Framer Motion & Three.js / WebGL',
      'Redux Toolkit & Zustand State Store',
      'Webpack, Vite & Turbopack',
      'WCAG AA Accessibility & Performance'
    ]
  },
  {
    tag: '// STACK_02',
    title: 'AI & RAG Engineering',
    icon: Cpu,
    color: 'text-indigo-400',
    skills: [
      'OpenRouter API Provider Layer',
      'Retrieval-Augmented Generation (RAG)',
      'LangChain & LangGraph Workflows',
      'Function Tool Calling & Memory',
      'System Prompt Engineering',
      'Vector Ingestion & Embeddings',
      'Streaming SSE & WebSockets',
      'AI-Powered UI Automation'
    ]
  },
  {
    tag: '// STACK_03',
    title: 'Backend & Cloud Microservices',
    icon: Database,
    color: 'text-purple-400',
    skills: [
      'Python 3.12+ (FastAPI, AsyncIO, Uvicorn)',
      'Node.js & Express.js REST APIs',
      'Supabase PostgreSQL & Realtime',
      'MongoDB & Redis Caching',
      'GraphQL & Microservices Architecture',
      'Docker & Containerization',
      'AWS & GCP Cloud Infrastructure',
      'CI/CD Pipelines (Jenkins, GitHub Actions)'
    ]
  },
  {
    tag: '// STACK_04',
    title: 'Leadership & Domain',
    icon: Users,
    color: 'text-emerald-400',
    skills: [
      'Technical Architecture & System Design',
      'Order Management Systems (OMS & SKU Ranking)',
      'High-Scale Retail E-Commerce (Kohl’s, Adidas)',
      'Life Sciences & Healthcare Platforms (Bayer)',
      'Cross-Functional Mentorship (8+ Engineers)',
      'Code Review & Governance Best Practices',
      'Agile / Scrum Sprint Leadership',
      'Client Relationship & Technical Specs'
    ]
  }
];

export function SkillsMatrix() {
  return (
    <section id="skills" className="py-24 px-4 sm:px-6 relative z-10 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col items-start gap-3 mb-16 border-l-2 border-cyan-400 pl-4">
        <Badge variant="outline" className="font-mono text-xs tracking-widest uppercase text-cyan-400 border-cyan-500/30 bg-cyan-950/40">
          // 04. TECH CONSTELLATION
        </Badge>
        <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
          Technical Stack & Engineering Mastery
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl">
          Core capabilities across Modern Web Architecture, AI RAG Pipelines, Cloud Backend Services, and Technical Leadership.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SKILL_CATEGORIES.map((cat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="p-6 sm:p-8 rounded-3xl bg-slate-950/50 border border-slate-800/80 hover:border-cyan-500/50 transition-all duration-300 backdrop-blur-2xl relative group shadow-2xl overflow-hidden"
          >
            <div className="space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 ${cat.color} shadow-sm backdrop-blur-md`}>
                    <cat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 tracking-widest block font-semibold">{cat.tag}</span>
                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">{cat.title}</h3>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cat.skills.map((skill, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 hover:border-slate-700 transition-colors backdrop-blur-sm"
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${cat.color} shrink-0`} />
                    <span className="text-xs text-slate-300 font-mono">[{skill}]</span>
                  </div>
                ))}
              </div>

            </div>
          </motion.div>
        ))}
      </div>

    </section>
  );
}
