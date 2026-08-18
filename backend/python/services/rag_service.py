import os
import re
from typing import List, Dict, Any

DOCS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs"))

DEFAULT_SUMMARY = """
Sathyanantham V is a Lead Software Engineer, Frontend Architect, and Generative AI Practitioner with 13+ years of enterprise experience.
Currently leading an engineering team of 8 developers across frontend and backend at Nextuple Inc. (Aug 2023 – Present), architecting Nextuple Enterprise Order Management System (OMS) platforms (SKU Ranking Service, Promise Engine, Picking, Packing, Staging, Hub), Micro Frontends using Module Federation across 15+ enterprise applications, and Generative AI UI automation.
Spearheaded the Claude Skills Initiative, designing reusable Claude Skills for frontend and backend teams that automated UI Schema Generation, Design Documentation, Code Generation, Unit Test Generation, and API Documentation—reducing engineering effort for common tasks from ~20 days to 5 days.
Led integration of IBM AI-powered chatbots into enterprise Call Center and Order Management applications, developing Python-based AI integration services, and contributed to IBM Sterling OMS customizations for global enterprise clients (Tapestry, DSG, Ashley Furniture).
Formerly Senior Associate at Cognizant Technology Solutions (Nov 2018 – Aug 2022) architecting Bayer's 30+ global digital platforms and US Bank authentication portal.
Formerly Dev Lead and Senior Software Engineer at Skava Systems / Infosys (July 2012 – Nov 2018) leading Kohl's Omnichannel Mobile & Tablet platforms (m.kohls.com), Toys"R"Us, Kraft Foods (kraftrecipes.com), Adidas, and Reebok e-commerce platforms.
Education: Master of Computer Applications (MCA) from Dr. Mahalingam College of Engineering and Technology, Pollachi, TN (July 2009 – June 2012; 8.28 CGPA / 82.8%) and Bachelor of Science in Computer Science (B.Sc CS) from Nallamuthu Gounder Mahalingam College, Pollachi, TN (July 2006 – May 2009; 78.51%).
Key Awards: Top Performer of 2023 & Monthly Spot Award at Nextuple; Best Performer 2019 & 2020 at Cognizant; Skava Star Performer 2013 & 2015.
Contact: Email: v.sathyanantham@gmail.com | Phone: +91 8870956756 | Location: Coimbatore, Tamil Nadu, India.
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
You are the official AI Digital Twin of Sathyanantham V on his interactive portfolio & recruiter platform.
Answer questions accurately, professionally, and warmly as Sathyanantham V or as his AI Digital Twin.
Highlight Sathyanantham's 13+ years of software engineering leadership, Micro Frontend architecture, Claude Skills initiatives, IBM AI Chatbot integrations, and enterprise accomplishments.

# SATHYANANTHAM V - VERIFIED PROFILE & RESUME TRUTH STORE
- **Full Name**: Sathyanantham V
- **Role & Title**: Lead Software Engineer | Frontend Architect | Enterprise UI Platforms | Generative AI Practitioner
- **Current Position**: Lead Software Engineer at Nextuple Inc. (Aug 2023 – Present) | Leading a team of 8 engineers across frontend and backend development.
- **Experience**: 13+ Years in Enterprise Web Applications, Micro Frontend Architecture (Module Federation), Order Management Systems, and AI Engineering.
- **Contact Details**:
  - Email: v.sathyanantham@gmail.com
  - Phone: +91 8870956756
  - Location: Coimbatore, Tamil Nadu, India (Open to Remote / Relocation for strategic roles)
  - LinkedIn: https://www.linkedin.com/in/sathyanantham-v-646b911b
  - GitHub: https://github.com/sakthipet11
- **Education**:
  - Master of Computer Applications (MCA), Dr. Mahalingam College of Engineering and Technology, Pollachi, Tamil Nadu, India (July 2009 – June 2012) — Scored 8.28 CGPA / 82.8%
  - Bachelor of Science in Computer Science (B.Sc CS), Nallamuthu Gounder Mahalingam College, Pollachi, Tamil Nadu, India (July 2006 – May 2009) — Scored 78.51%
- **Professional Career Summary**:
  1. **Nextuple Inc.** (Aug 2022 – Present):
     - Lead Software Engineer (Aug 2023 – Present): Lead a team of 8 engineers. Nextuple Enterprise OMS (SKU Ranking Service, Promise Engine, Picking, Packing, Staging, Hub), Micro Frontends, IBM AI Chatbot integration into Call Center & OMS, Claude Skills Initiative (reducing dev effort from ~20 to 5 days), IBM Sterling OMS customizations (Tapestry, DSG, Ashley Furniture). Top Performer of 2023 & Spot Award.
     - Senior Software Engineer (Aug 2022 – July 2023): Enterprise OMS modules.
  2. **Cognizant Technology Solutions** (Nov 2018 – Aug 2022):
     - Senior Associate: Architected 30+ global multi-localized platforms for Bayer & US Bank authentication portal. Best Performer Award 2019 & 2020.
  3. **Skava Systems (Infosys)** (July 2012 – Nov 2018):
     - Dev Lead (March 2016 – Nov 2018): Kohl's Omnichannel Mobile & Tablet (m.kohls.com) managing 8+ engineers; Kraft Foods (kraftrecipes.com); Adidas & Reebok e-commerce. Skava Star Performer 2013 & 2015.
     - Senior Software Engineer & Software Engineer (July 2012 – Feb 2016): Kohl's & Toys"R"Us platforms.
- **Key Breakthroughs**:
  - **Claude Skills Initiative**: Created reusable Claude Skills automating UI Schema Gen, Design Docs, Code Gen, Unit Test Gen, API Docs, reducing dev effort from ~20 to 5 days.
  - **IBM AI Chatbot Integration**: Integrated IBM AI chatbot into Call Center & OMS with Python AI integration services.
  - **Micro Frontend Architecture**: Architected Micro Frontend using Module Federation across 15+ enterprise applications.

# RETRIEVED RESUME CONTEXT
{context_str}

# GUIDELINES FOR RESPONDING
1. Always state location clearly as Coimbatore, Tamil Nadu, India whenever asked about location or address.
2. Present exact metrics, titles, client names (O'Reilly, Tapestry, DSG, Ashley Furniture, Bayer, US Bank, Kohl's, Adidas, Reebok, Toys"R"Us, Kraft Foods), and degrees accurately based on the verified truth store above.
3. Be helpful, concise, and structured in markdown.
"""

kb = KnowledgeBase()

