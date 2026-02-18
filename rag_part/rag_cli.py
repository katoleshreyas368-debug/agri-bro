import os

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.llms import Ollama

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough


PDF_PATH = "data/documents/ICAR-En-Kharif-Agro-Advisories-for-Farmers-2025.pdf"
VECTORSTORE_PATH = "vectorstore"


def get_embeddings():
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )


def build_vectorstore():
    if not os.path.exists(PDF_PATH):
        raise FileNotFoundError(f"PDF not found at {PDF_PATH}")

    print("📄 Loading PDF...")
    loader = PyPDFLoader(PDF_PATH)
    documents = loader.load()

    print("✂ Splitting into chunks...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150
    )
    docs = splitter.split_documents(documents)

    print("🧠 Creating embeddings...")
    embeddings = get_embeddings()

    print("💾 Building FAISS index...")
    vectorstore = FAISS.from_documents(docs, embeddings)
    vectorstore.save_local(VECTORSTORE_PATH)

    print("✅ Vectorstore built successfully!")


def load_rag_chain():
    embeddings = get_embeddings()

    if not os.path.exists(VECTORSTORE_PATH):
        raise FileNotFoundError("Vectorstore not found.")

    print("📂 Loading vectorstore...")
    vectorstore = FAISS.load_local(
        VECTORSTORE_PATH,
        embeddings,
        allow_dangerous_deserialization=True
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

    print("🤖 Loading Ollama model...")
    llm = Ollama(model="mistral")

    prompt = PromptTemplate.from_template(
        """Use the following context to answer the question.

Context:
{context}

Question:
{question}

Answer:"""
    )

    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    rag_chain = (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough()
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    return rag_chain


def main():
    try:
        if not os.path.exists(VECTORSTORE_PATH):
            build_vectorstore()

        rag_chain = load_rag_chain()

        print("\n🚀 RAG CLI Ready! Type 'exit' to quit.\n")

        while True:
            query = input("❓ Ask: ")

            if query.lower() == "exit":
                break

            answer = rag_chain.invoke(query)

            print("\n💬 Answer:")
            print(answer)
            print("\n" + "-" * 50 + "\n")

    except Exception as e:
        print(f"\n❌ Error: {e}")


if __name__ == "__main__":
    main()
