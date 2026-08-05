import pypdf

def extract_pdf():
    reader = pypdf.PdfReader("public/resume.pdf")
    extracted = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        extracted.append(f"=== PAGE {i+1} ===\n{text}")
    
    with open("scratch/extracted_resume_text.txt", "w", encoding="utf-8") as f:
        f.write("\n\n".join(extracted))
    print("Successfully extracted resume text to scratch/extracted_resume_text.txt")

if __name__ == "__main__":
    extract_pdf()
