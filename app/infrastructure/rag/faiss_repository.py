from __future__ import annotations

from pathlib import Path
from typing import Iterator

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
        self._max_tokens_per_request = settings.max_embedding_tokens_per_request
        self._max_docs_per_batch = settings.max_embedding_docs_per_batch

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        # Conservative fallback estimate when tokenizer is not available.
        return max(1, len(text) // 4)

    def _iter_batches(self, docs: list[Document]) -> Iterator[list[Document]]:
        batch: list[Document] = []
        batch_tokens = 0

        for doc in docs:
            doc_tokens = self._estimate_tokens(doc.page_content)
            should_flush = (
                batch
                and (
                    batch_tokens + doc_tokens > self._max_tokens_per_request
                    or len(batch) >= self._max_docs_per_batch
                )
            )
            if should_flush:
                yield batch
                batch = []
                batch_tokens = 0

            batch.append(doc)
            batch_tokens += doc_tokens

        if batch:
            yield batch

    async def index_document(self, namespace: str, text: str, metadata: dict[str, str]) -> None:
        docs = [Document(page_content=chunk, metadata=metadata) for chunk in self._splitter.split_text(text)]
        if not docs:
            return

        index_path = self._base_path / namespace
        index_path.mkdir(parents=True, exist_ok=True)

        batches = self._iter_batches(docs)
        if (index_path / "index.faiss").exists():
            store = FAISS.load_local(str(index_path), self._embeddings, allow_dangerous_deserialization=True)
            for batch in batches:
                store.add_documents(batch)
        else:
            first_batch = next(batches)
            store = FAISS.from_documents(first_batch, self._embeddings)
            for batch in batches:
                store.add_documents(batch)
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
