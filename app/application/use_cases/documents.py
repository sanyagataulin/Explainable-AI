from __future__ import annotations

from dataclasses import dataclass

from pypdf import PdfReader

from app.domain.ports.repositories import DocumentRepository, VectorRepository


@dataclass(slots=True)
class IndexDocument:
    document_repo: DocumentRepository
    vector_repo: VectorRepository

    async def execute(self, company: str, filename: str, raw_bytes: bytes) -> str:
        path = await self.document_repo.save_document(company, filename, raw_bytes)
        reader = PdfReader(path)
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        await self.vector_repo.index_document(
            namespace=company.upper(),
            text=text,
            metadata={"company": company.upper(), "filename": filename},
        )
        return path
