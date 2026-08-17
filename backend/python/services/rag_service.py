import os
import re
from typing import List, Dict, Any

DOCS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs"))

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
        self.chunks = []
        chunk_id = 1
        
        if not os.path.exists(DOCS_DIR):
            print(f"Docs directory {DOCS_DIR} not found. Using default profile summary.")
            lines = [line.strip() for line in DEFAULT_SUMMARY.splitlines() if line.strip()]
            self.chunks.append({
                "id": "doc-1",
                "section": "Default Profile",
                "content": DEFAULT_SUMMARY,
                "source": "Default Summary"
            })
            return

        files = os.listdir(DOCS_DIR)
        has_loaded_any = False

        for filename in sorted(files):
            filepath = os.path.join(DOCS_DIR, filename)
            if not os.path.isfile(filepath):
                continue
                
            ext = os.path.splitext(filename)[1].lower()
            file_text = ""
            
            if ext in ['.txt', '.md']:
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        file_text = f.read()
                except Exception as e:
                    print(f"Error reading text file {filename}: {e}")
            elif ext == '.pdf':
                try:
                    import pypdf
                    reader = pypdf.PdfReader(filepath)
                    extracted = [page.extract_text() for page in reader.pages if page.extract_text()]
                    file_text = "\n".join(extracted)
                except Exception as e:
                    print(f"Error reading PDF file {filename}: {e}")
            elif ext == '.docx':
                try:
                    import docx
                    doc = docx.Document(filepath)
                    extracted = [para.text.strip() for para in doc.paragraphs if para.text.strip()]
                    file_text = "\n".join(extracted)
                except Exception as e:
                    print(f"Error reading DOCX file {filename}: {e}")
                    
            if file_text.strip():
                has_loaded_any = True
                lines = [line.strip() for line in file_text.splitlines() if line.strip()]
                curr_chunk = []
                for line in lines:
                    curr_chunk.append(line)
                    if len("\n".join(curr_chunk)) > 500:
                        self.chunks.append({
                            "id": f"doc-{chunk_id}",
                            "section": f"Profile Document: {filename}",
                            "content": "\n".join(curr_chunk),
                            "source": filename
                        })
                        chunk_id += 1
                        curr_chunk = []
                if curr_chunk:
                    self.chunks.append({
                        "id": f"doc-{chunk_id}",
                        "section": f"Profile Document: {filename}",
                        "content": "\n".join(curr_chunk),
                        "source": filename
                    })
                    chunk_id += 1

        if not has_loaded_any:
            self.chunks.append({
                "id": f"doc-{chunk_id}",
                "section": "Default Career Summary",
                "content": DEFAULT_SUMMARY,
                "source": "Default Profile Summary"
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

# SATHYANANTHAM V - CORE SUMMARY
- **Name**: Sathyanantham V
- **Title**: Frontend Architect | Lead Software Engineer | AI-Enabled Full Stack Engineer
- **Experience**: 13+ Years in Enterprise Web Platforms, Micro Frontends (Module Federation), AI Agents, and OMS Platforms.

# RETRIEVED CONTEXT
{context_str}
"""

kb = KnowledgeBase()
