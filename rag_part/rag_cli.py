import os
import uuid
from pathlib import Path

import chromadb
from chromadb.utils import embedding_functions
from pypdf import PdfReader


# -------- CONFIG --------
DATA_FOLDER = "data"          # folder with PDFs
CHROMA_PATH = "chroma_db"     # where DB will be stored
COLLECTION_NAME = "agribro_docs"
CHUNK_SIZE = 800
CHUNK_OVERLAP = 150
# ------------------------


def chunk_text(text, chunk_size=800, overlap=150):
    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap

    return chunks


def extract_text_from_pdf(pdf_path):
    reader = PdfReader(pdf_path)
    full_text = ""

    for page in reader.pages:
        text = page.extract_text()
        if text:
            full_text += text + "\n"

    return full_text


def main():
    print("🚀 Starting PDF ingestion...")

    # Create persistent Chroma client
    client = chromadb.PersistentClient(path=CHROMA_PATH)

    # Embedding model
    embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=embedding_function
    )

    pdf_files = list(Path(DATA_FOLDER).glob("*.pdf"))

    if not pdf_files:
        print("❌ No PDFs found in data folder.")
        return

    for pdf_file in pdf_files:
        print(f"📄 Processing: {pdf_file.name}")

        text = extract_text_from_pdf(pdf_file)
        chunks = chunk_text(text, CHUNK_SIZE, CHUNK_OVERLAP)

        ids = []
        documents = []
        metadatas = []

        for chunk in chunks:
            ids.append(str(uuid.uuid4()))
            documents.append(chunk)
            metadatas.append({"source": pdf_file.name})

        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )

        print(f"✅ Added {len(chunks)} chunks from {pdf_file.name}")

    print("\n🎉 All PDFs embedded successfully!")
    print(f"📂 Chroma DB stored at: {CHROMA_PATH}")


if __name__ == "__main__":
    main()