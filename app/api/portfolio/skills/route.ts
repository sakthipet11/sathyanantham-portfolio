import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const res = await fetch(`${backendUrl}/api/portfolio/skills`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.warn('Backend skills endpoint offline, returning verified fallback:', error);
  }

  // Resilient fallback from Candidate Truth Store
  return NextResponse.json({
    status: 'success',
    skills: [
      { name: "React 19 & Next.js 15", category: "frontend", proficiency: 98 },
      { name: "TypeScript 5.x", category: "frontend", proficiency: 96 },
      { name: "Micro Frontend (Module Federation)", category: "frontend", proficiency: 98 },
      { name: "Tailwind CSS & Design Systems", category: "frontend", proficiency: 95 },
      { name: "State Management (Redux/Zustand)", category: "frontend", proficiency: 94 },
      { name: "Web Performance & Core Web Vitals", category: "frontend", proficiency: 95 },
      { name: "Claude Code / Agent Skills SDK", category: "ai", proficiency: 96 },
      { name: "Model Context Protocol (MCP)", category: "ai", proficiency: 95 },
      { name: "Gemini / OpenAI API Orchestration", category: "ai", proficiency: 94 },
      { name: "RAG Architecture & Vector Embeddings", category: "ai", proficiency: 92 },
      { name: "Python 3.12+ (FastAPI / Uvicorn)", category: "backend", proficiency: 92 },
      { name: "Node.js & Express / NestJS", category: "backend", proficiency: 90 },
      { name: "PostgreSQL & Supabase RLS", category: "backend", proficiency: 92 },
      { name: "Docker & Containerization", category: "backend", proficiency: 88 },
      { name: "Google Cloud Platform (GCP)", category: "backend", proficiency: 88 },
      { name: "Engineering Team Leadership", category: "leadership", proficiency: 95 },
      { name: "System Architecture & RFC Design", category: "leadership", proficiency: 96 },
      { name: "Agile Pod Mentorship & Code Reviews", category: "leadership", proficiency: 94 }
    ]
  });
}
