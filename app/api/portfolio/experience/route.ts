import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const res = await fetch(`${backendUrl}/api/portfolio/experience`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.warn('Backend experience endpoint offline, returning verified fallback:', error);
  }

  // Resilient fallback from Candidate Truth Store
  return NextResponse.json({
    status: 'success',
    experience: [
      {
        id: "exp-1",
        company: "Nextuple Inc.",
        role: "Lead Software Engineer",
        location: "Coimbatore, Tamil Nadu, India",
        duration: "Aug 2022 – Present",
        highlights: [
          "Architected and deployed Micro Frontend Platform using Module Federation, Webpack, and React 19.",
          "Engineered AI-powered Automated Testing & UI Discovery suites reducing regression cycles by 65%.",
          "Mentored 15+ senior engineers across US and India engineering pods."
        ],
        technologies: ["React", "TypeScript", "Next.js", "Module Federation", "TailwindCSS", "FastAPI", "Python"]
      },
      {
        id: "exp-2",
        company: "Cognizant Technology Solutions",
        role: "Senior Associate",
        location: "Coimbatore, Tamil Nadu, India",
        duration: "Nov 2018 – Aug 2022",
        highlights: [
          "Architected 30+ global responsive digital platforms for Bayer and US Bank authentication portal."
        ],
        technologies: ["React", "Redux", "TypeScript", "Microservices", "Jest", "GraphQL"]
      },
      {
        id: "exp-3",
        company: "Skava Systems (Infosys)",
        role: "Dev Lead",
        location: "Coimbatore, Tamil Nadu, India",
        duration: "July 2012 – Nov 2018",
        highlights: [
          "Led Kohl's Omnichannel Mobile & Tablet platforms (m.kohls.com), Toys'R'Us, Adidas, Reebok, and Kraft Foods."
        ],
        technologies: ["JavaScript", "HTML5/CSS3", "Responsive Design", "Performance Optimization"]
      }
    ]
  });
}
