from __future__ import annotations

from fastapi import APIRouter, Depends

from app.presentation.api.deps import get_request_container
from app.presentation.schemas.conversations import MessagesResponse

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/messages", response_model=MessagesResponse)
async def search_messages(user_id: int, q: str, c=Depends(get_request_container)) -> MessagesResponse:
    messages = await c.conversation.search_messages(user_id=user_id, query=q, limit=20)
    return MessagesResponse(messages=messages)
