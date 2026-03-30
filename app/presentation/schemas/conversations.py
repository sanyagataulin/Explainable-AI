from __future__ import annotations

from pydantic import BaseModel

from app.domain.entities.models import Conversation, Message


class CreateConversationRequest(BaseModel):
    user_id: int
    title: str


class ConversationResponse(BaseModel):
    conversation: Conversation


class PostMessageRequest(BaseModel):
    user_id: int
    content: str


class MessagesResponse(BaseModel):
    messages: list[Message]
