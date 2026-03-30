from __future__ import annotations

from dataclasses import dataclass

from app.domain.entities.enums import MessageRole
from app.domain.entities.models import Conversation, Message
from app.domain.ports.repositories import ConversationRepository


@dataclass(slots=True)
class ConversationUseCases:
    conversation_repo: ConversationRepository

    async def create_conversation(self, user_id: int, title: str) -> Conversation:
        return await self.conversation_repo.create_conversation(Conversation(user_id=user_id, title=title))

    async def add_user_message(self, conversation_id: int, content: str) -> Message:
        return await self.conversation_repo.add_message(
            Message(conversation_id=conversation_id, role=MessageRole.USER, content=content)
        )

    async def add_assistant_message(self, conversation_id: int, content: str) -> Message:
        return await self.conversation_repo.add_message(
            Message(conversation_id=conversation_id, role=MessageRole.ASSISTANT, content=content)
        )

    async def get_messages(self, conversation_id: int, limit: int | None = None) -> list[Message]:
        return await self.conversation_repo.get_messages(conversation_id, limit=limit)

    async def search_messages(self, user_id: int, query: str, limit: int = 20) -> list[Message]:
        return await self.conversation_repo.search_messages(user_id, query, limit)
