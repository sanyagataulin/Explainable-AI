from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.presentation.api.deps import get_request_container
from app.presentation.schemas.common import ApiMessage

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("", response_model=ApiMessage)
async def upload_document(
    company: str = Form(...),
    file: UploadFile = File(...),
    c=Depends(get_request_container),
) -> ApiMessage:
    raw = await file.read()
    await c.index_document.execute(company=company, filename=file.filename or "report.pdf", raw_bytes=raw)
    return ApiMessage(message="Document indexed")
