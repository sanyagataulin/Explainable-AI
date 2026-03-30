from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sse_starlette import EventSourceResponse
import structlog

from app.domain.entities.models import Recommendation
from app.presentation.api.deps import get_request_container
from app.presentation.schemas.conversations import (
    ConversationResponse,
    CreateConversationRequest,
    MessagesResponse,
    PostMessageRequest,
)

router = APIRouter(prefix="/api/conversations", tags=["conversations"])
logger = structlog.get_logger(__name__)


@router.post("", response_model=ConversationResponse)
async def create_conversation(payload: CreateConversationRequest, c=Depends(get_request_container)) -> ConversationResponse:
    conv = await c.conversation.create_conversation(payload.user_id, payload.title)
    return ConversationResponse(conversation=conv)


@router.get("/{conversation_id}/messages", response_model=MessagesResponse)
async def get_messages(conversation_id: int, c=Depends(get_request_container)) -> MessagesResponse:
    messages = await c.conversation.get_messages(conversation_id)
    return MessagesResponse(messages=messages)


@router.post("/{conversation_id}/messages", response_model=MessagesResponse)
async def send_message(conversation_id: int, payload: PostMessageRequest, c=Depends(get_request_container)) -> MessagesResponse:
    await c.conversation.add_user_message(conversation_id=conversation_id, content=payload.content)
    messages = await c.conversation.get_messages(conversation_id)
    return MessagesResponse(messages=messages)


@router.get("/{conversation_id}/stream")
async def stream_reasoning(conversation_id: int, user_id: int, question: str, c=Depends(get_request_container)):
    profile = await c.onboard.profile_repo.get_risk_profile(user_id)
    if profile is None:
        raise HTTPException(status_code=400, detail="Risk profile is not found. Complete onboarding first.")

    async def event_generator():
        log = logger.bind(conversation_id=conversation_id, user_id=user_id)
        log.info("stream_started", question=question)
        all_steps = []
        try:
            async for step in c.generate_recommendation.stream(user_id, conversation_id, question):
                all_steps.append(step)
                log.info("reasoning_step", step_type=step.type.value)
                yield {
                    "event": "reasoning_step",
                    "data": json.dumps(step.model_dump(mode="json"), ensure_ascii=False),
                }
        except ValueError as exc:
            log.warning("stream_failed", error=str(exc))
            yield {
                "event": "stream_error",
                "data": json.dumps({"message": str(exc)}, ensure_ascii=False),
            }
            return

        ticker = "AAPL" if "apple" in question.lower() else "SPY"
        if any(tok.isupper() and tok.isalpha() and len(tok) <= 5 for tok in question.split()):
            ticker = next(tok for tok in question.split() if tok.isupper() and tok.isalpha() and len(tok) <= 5)

        try:
            generated = await c.llm_gateway.synthesize_recommendation(
                risk_profile=profile,
                ticker=ticker,
                company_name=ticker,
                steps=[step.model_dump(mode="json") for step in all_steps],
            )
            recommendation = Recommendation(
                conversation_id=conversation_id,
                user_id=user_id,
                ticker=ticker,
                company_name=ticker,
                action=generated.action,
                conviction=generated.conviction,
                suggested_weight_pct=generated.suggested_weight_pct,
                reasoning_steps=all_steps,
                risks=generated.risks,
                alternatives=generated.alternatives,
                time_horizon=generated.time_horizon,
            )
            saved = await c.generate_recommendation.save_result(recommendation)
        except Exception as exc:
            log.exception("recommendation_synthesis_failed", error=str(exc))
            yield {
                "event": "stream_error",
                "data": json.dumps(
                    {"message": "Failed to synthesize or save recommendation"},
                    ensure_ascii=False,
                ),
            }
            return
        log.info("recommendation_saved", recommendation_id=saved.id)
        yield {
            "event": "recommendation_saved",
            "data": json.dumps(saved.model_dump(mode="json"), ensure_ascii=False),
        }

    return EventSourceResponse(event_generator())
