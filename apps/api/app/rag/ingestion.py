import os
import re
from typing import List, Dict, Any

DOCS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "docs")

DEFAULT_SUMMARY = """
Sathyanantham V is a Lead Software Engineer, AI-Enabled Full Stack Engineer, and Frontend Architect with 13+ years of experience.
Currently leading an engineering team of 8 developers at Nextuple Private Ltd (Bangalore), architecting Order Management System (OMS) platforms, SKU Ranking Services, Promise Engines, Micro Frontends, and Generative AI UI automation.
Created reusable Claude Skills for engineering teams, integrated IBM AI-powered chatbots into Call Center applications, and contributed to IBM Sterling OMS customizations.
Formerly Senior Associate at Cognizant (leading 30+ Bayer global platforms and US Bank applications) and Dev Lead at Skava Systems (Infosys) leading Kohls Mobile/Tablet, ToysRUs, Kraft, Adidas & Reebok platforms.
Key Awards: Top Performer of 2023 at Nextuple; Best Performer 2019/2020 at Cognizant; Skava Star Performer 2013 & 2015.
Contact: v.sathyanantham@gmail.com | Phone: +91 8870956756 | Location: Coimbatore / Bangalore, India.
"""

class KnowledgeBase:
    def __init__(self):
        self.raw_text: str = ""
        self.sections: Dict[str, str] = {}
        self.chunks: List[Dict[str, Any]] = []
        self.load_documents()

    def load_documents(self):
        context_files = [
            "extracted_full_resume.txt",
            "extracted_cover_letter.txt",
            "extracted_ai_fullstack_cover_letter.txt",
            "extracted_resume_context.txt"
        ]
        
        combined_text = []
        for cfile in context_files:
            cpath = os.path.join(DOCS_DIR, cfile)
            if os.path.exists(cpath):
                try:
                    with open(cpath, "r", encoding="utf-8") as f:
                        combined_text.append(f.read())
                except Exception as e:
                    print(f"Error reading {cfile}: {e}")

        self.raw_text = "\n\n".join(combined_text) if combined_text else DEFAULT_SUMMARY

        # Parse chunks
        lines = [line.strip() for line in self.raw_text.splitlines() if line.strip()]
        curr_chunk = []
        chunk_id = 1

        for line in lines:
            curr_chunk.append(line)
            if len("\n".join(curr_chunk)) > 400:
                self.chunks.append({
                    "id": f"doc-{chunk_id}",
                    "section": "Career & Cover Letter Knowledge",
                    "content": "\n".join(curr_chunk),
                    "source": "Sathyanantham V Resume & Cover Letter Documents"
                })
                chunk_id += 1
                curr_chunk = []
        if curr_chunk:
            self.chunks.append({
                "id": f"doc-{chunk_id}",
                "section": "Career & Cover Letter Knowledge",
                "content": "\n".join(curr_chunk),
                "source": "Sathyanantham V Resume & Cover Letter Documents"
            })

    def retrieve_context(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        query_words = set(re.findall(r'\w+', query.lower()))
        if not query_words:
            return self.chunks[:top_k]

        scored_chunks = []
        for chunk in self.chunks:
            chunk_words = set(re.findall(r'\w+', chunk["content"].lower()))
            overlap = len(query_words.intersection(chunk_words))
            scored_chunks.append((overlap, chunk))

        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        results = [item[1] for item in scored_chunks if item[0] > 0]
        if not results:
            results = self.chunks[:top_k]
        return results[:top_k]

    def build_system_prompt(self, user_query: str = "") -> str:
        retrieved = self.retrieve_context(user_query, top_k=5)
        context_str = "\n\n".join([f"({c['source']}):\n{c['content']}" for c in retrieved])

        return f"""
# ROLE & PERSONALITY
You are the AI Digital Twin of Sathyanantham V, representing him on his interactive portfolio platform.
You answer questions accurately, professionally, and engagingly about Sathyanantham's 13+ years career, cover letter, technical skills, frontend architecture, AI integration work, project leadership, and achievements.

# SATHYANANTHAM V - CORE SUMMARY & COVER LETTER
- **Name**: Sathyanantham V
- **Role**: Lead Software Engineer | AI-Enabled Full Stack Engineer | Frontend Architect
- **Experience**: 13+ Years in Large-Scale Web Apps, E-Commerce, Order Management Systems, Life Sciences & Banking
- **Current Position**: Leading a team of 8 engineers at Nextuple Private Ltd (Aug 2022 - Present)
- **Previous Roles**: Senior Associate at Cognizant (2018-2022), Dev Lead at Skava Systems / Infosys (2012-2018)
- **Core Stack**: React 19, Next.js 15, TypeScript, Node.js, Python FastAPI, OpenRouter AI RAG, Tailwind CSS v4, Micro Frontends, IBM Sterling OMS, Claude Skills
- **AI Innovations**: Created reusable Claude Skills for engineering teams, integrated IBM AI chatbot into Call Center & OMS platforms.
- **Key Awards**: Top Performer 2023 (Nextuple), Best Performer 2019 & 2020 (Cognizant), Skava Star Performer 2013 & 2015
- **Contact**: v.sathyanantham@gmail.com | +91 8870956756 | Location: Coimbatore / Bangalore, India

# RETRIEVED RESUME & COVER LETTER CONTEXT
{context_str}

# GUIDELINES & RULES
1. Speak as Sathyanantham's AI Digital Twin ("I", "my experience").
2. Answer questions accurately based on the cover letter and resume context.
3. Offer the downloadable PDF resume (`/resume.pdf`) when requested.
4. If a visitor greets you (e.g. "hi", "hello"), respond warmly and professionally like a real human. Ask how they are doing, what they are looking for, and ask for their contact details: Name, Email address, Phone number, and Purpose of connection, so that you can get them connected to Sathyanantham V.
5. Once the visitor provides these details (Name, Email, Phone, Purpose) during the chat, immediately execute the `record_user_details` tool to save the information and trigger the email/push notification alerts.
6. Execute tools (`record_user_details`, `record_unknown_question`, `request_human_handoff`) immediately and automatically when appropriate.
""".strip()

kb = KnowledgeBase()
