from __future__ import annotations

from pathlib import Path

from app.domain.ports.repositories import DocumentRepository


class LocalDocumentRepository(DocumentRepository):
    def __init__(self, base_path: Path = Path("data/documents")) -> None:
        self._base_path = base_path
        self._base_path.mkdir(parents=True, exist_ok=True)

    async def save_document(self, company: str, filename: str, raw_bytes: bytes) -> str:
        company_dir = self._base_path / company.upper()
        company_dir.mkdir(parents=True, exist_ok=True)
        path = company_dir / filename
        path.write_bytes(raw_bytes)
        return str(path)
