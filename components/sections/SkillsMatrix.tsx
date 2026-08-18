'use client';

import { motion } from 'framer-motion';
import { Cpu, Code2, Database, Users, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const SKILL_CATEGORIES = [
  {
    tag: '// STACK_01',
    title: 'Frontend Architecture',
    icon: Code2,
    skills: [
      'React 19 & Next.js 15 (App Router)',
      'TypeScript & Modern JavaScript ES6+',
      'Micro Frontend Architectures',
      'Tailwind CSS v4 & Glassmorphic UI',
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
    <section id="skills" className="py-8 md:py-16 px-4 sm:px-6 relative z-10 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col items-start gap-3 mb-16 border-l-2 border-primary pl-4">
        <Badge variant="default" className="font-mono text-xs tracking-wider uppercase bg-primary/10 text-primary border-primary/20">
          TECH CONSTELLATION
        </Badge>
        <h2 className="text-3xl sm:text-5xl font-black text-foreground uppercase tracking-tight">
          Technical Stack & Engineering Mastery
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl font-normal">
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
          >
            <Card className="p-6 sm:p-8 rounded-3xl bg-card/60 border border-border/80 hover:border-primary/50 transition-all duration-300 backdrop-blur-2xl relative group shadow-md hover:shadow-xl overflow-hidden">
              <div className="space-y-6">

                <div className="flex items-center justify-between border-b border-border/70 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-xs backdrop-blur-md">
                      <cat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-muted-foreground tracking-wider block font-semibold">{cat.tag}</span>
                      <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">{cat.title}</h3>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {cat.skills.map((skill, sIdx) => (
                    <div
                      key={sIdx}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-border transition-colors backdrop-blur-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-xs text-foreground/85 font-mono">{skill}</span>
                    </div>
                  ))}
                </div>

              </div>
            </Card>
          </motion.div>
        ))}
      </div>

    </section>
  );
}
