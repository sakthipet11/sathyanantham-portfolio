import os
import sys

# Add apps/api to path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "apps", "api"))

def test_ingestion():
    from app.rag.ingestion import KnowledgeBase
    kb = KnowledgeBase()
    print(f"Total loaded chunks: {len(kb.chunks)}")
    print("\nSample Chunks:")
    for chunk in kb.chunks[:3]:
        print(f"--- Chunk ID: {chunk['id']} | Source: {chunk['source']} ---")
        print(chunk['content'][:200])
        print("...")

if __name__ == "__main__":
    test_ingestion()
