"""Chat API routes - contextual AI chatbot."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import ChatMessage
from engine.teaching import chat_with_teacher

router = APIRouter(prefix="/api/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    message: str
    topic_context: str = ""
    provider: str = "auto"
    history: list = []


@router.post("/send")
def send_message(data: ChatRequest, db: Session = Depends(get_db)):
    # Save user message
    user_msg = ChatMessage(role="user", content=data.message, topic_context=data.topic_context)
    db.add(user_msg)
    db.commit()

    # Get AI response with provider selection and history
    response = chat_with_teacher(
        data.message, 
        data.topic_context, 
        provider=data.provider,
        history=data.history
    )

    # Save AI response
    ai_msg = ChatMessage(role="assistant", content=response, topic_context=data.topic_context)
    db.add(ai_msg)
    db.commit()

    return {"response": response}


@router.get("/history")
def get_history(limit: int = 50, db: Session = Depends(get_db)):
    messages = db.query(ChatMessage).order_by(ChatMessage.created_at.desc()).limit(limit).all()
    messages.reverse()
    return [{"id": m.id, "role": m.role, "content": m.content,
             "topic": m.topic_context, "time": m.created_at.isoformat() if m.created_at else ""} for m in messages]
