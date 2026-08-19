import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const res = await fetch(`${backendUrl}/api/portfolio/projects`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.warn('Backend projects endpoint offline, returning verified fallback:', error);
  }

  // Resilient fallback from Candidate Truth Store
  return NextResponse.json({
    status: 'success',
    projects: [
      {
        id: "proj-1",
        title: "Omnichannel Micro Frontend Architecture",
        category: "Enterprise Platform Architecture",
        client: "Nextuple Inc. & Tier-1 Retailers",
        overview: "Modular micro frontend platform enabling decoupled deployments across multiple distributed engineering squads.",
        tech_stack: ["React 19", "TypeScript", "Module Federation", "Webpack 5", "Tailwind CSS"],
        highlights: [
          "Eliminated monolith deployment bottlenecks, achieving zero-downtime micro-app releases.",
          "Standardized enterprise UI design system library adopted across 12+ application modules."
        ],
        live_url: "https://github.com/sakthipet11"
      },
      {
        id: "proj-2",
        title: "Multi-Agent AI Portfolio & Recruiter OS",
        category: "AI & Autonomous Systems",
        client: "Independent Platform",
        overview: "Full-stack multi-agent autonomous career platform with Model Context Protocol (MCP) servers and automated ATS evaluation.",
        tech_stack: ["Next.js 15", "FastAPI", "Python", "MCP Protocol", "Supabase / PostgreSQL", "Gemini 2.5"],
        highlights: [
          "Engineered 10-tool Job Discovery MCP server querying live external career portals.",
          "Architected real-time WebSocket live handoff with presence heartbeats and visitor analytics."
        ],
        live_url: "https://github.com/sakthipet11"
      },
      {
        id: "proj-3",
        title: "Global Enterprise Digital Banking & Healthcare Portals",
        category: "Digital Transformation",
        client: "Bayer AG & US Bank (Cognizant)",
        overview: "High-security responsive enterprise web portals serving millions of daily active global users.",
        tech_stack: ["React", "Redux", "TypeScript", "GraphQL", "Jest", "Microservices"],
        highlights: [
          "Delivered WCAG 2.1 AA compliant design systems across global clinical and banking workflows.",
          "Optimized Core Web Vitals to achieve 98+ Lighthouse performance scores."
        ],
        live_url: "https://github.com/sakthipet11"
      }
    ]
  });
}
