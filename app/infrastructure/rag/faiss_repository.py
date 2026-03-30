from __future__ import annotations

from pathlib import Path

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

from app.core.settings import Settings
from app.domain.ports.repositories import VectorRepository


class FAISSVectorRepository(VectorRepository):
    def __init__(self, settings: Settings) -> None:
        self._base_path = Path(settings.vector_store_path)
        self._embeddings = OpenAIEmbeddings(
            model=settings.openai_embedding_model,
            api_key=settings.openai_api_key,
        )
        self._splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

    async def index_document(self, namespace: str, text: str, metadata: dict[str, str]) -> None:
        docs = [Document(page_content=chunk, metadata=metadata) for chunk in self._splitter.split_text(text)]
        index_path = self._base_path / namespace
        index_path.mkdir(parents=True, exist_ok=True)

        if (index_path / "index.faiss").exists():
            store = FAISS.load_local(str(index_path), self._embeddings, allow_dangerous_deserialization=True)
            store.add_documents(docs)
        else:
            store = FAISS.from_documents(docs, self._embeddings)
        store.save_local(str(index_path))

    async def retrieve(self, namespace: str, query: str, k: int) -> list[dict[str, str]]:
        index_path = self._base_path / namespace
        if not (index_path / "index.faiss").exists():
            return []
        store = FAISS.load_local(str(index_path), self._embeddings, allow_dangerous_deserialization=True)
        docs = store.similarity_search(query, k=k)
        return [
            {
                "content": doc.page_content,
                "source": doc.metadata.get("filename", "unknown"),
                "company": doc.metadata.get("company", namespace),
            }
            for doc in docs
        ]
