from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.container import RequestContainer, container
from app.infrastructure.db.session import get_session


async def get_request_container(session: AsyncSession = Depends(get_session)) -> AsyncIterator[RequestContainer]:
    yield container.for_session(session)
