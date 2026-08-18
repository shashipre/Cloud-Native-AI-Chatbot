from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, models, auth, database
from ..services import llm

router = APIRouter(prefix="/conversations", tags=["conversations"])

@router.post("", response_model=schemas.ConversationResponse)
def create_conversation(
    conv: schemas.ConversationCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    new_conv = models.Conversation(user_id=current_user.id, title=conv.title)
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    return new_conv

@router.get("", response_model=List[schemas.ConversationResponse])
def get_conversations(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.Conversation).filter(models.Conversation.user_id == current_user.id).order_by(models.Conversation.created_at.desc()).all()

@router.get("/{id}/messages", response_model=List[schemas.MessageResponse])
def get_messages(
    id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify ownership
    conv = db.query(models.Conversation).filter(models.Conversation.id == id, models.Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    return db.query(models.Message).filter(models.Message.conversation_id == id).order_by(models.Message.created_at).all()

@router.post("/{id}/messages", response_model=schemas.MessageResponse)
def send_message(
    id: int,
    message: schemas.MessageCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify ownership
    conv = db.query(models.Conversation).filter(models.Conversation.id == id, models.Conversation.user_id == current_user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    # Save user message
    user_msg = models.Message(conversation_id=id, role="user", content=message.content)
    db.add(user_msg)
    db.commit()
    
    # Generate response
    answer_text, sources = llm.generate_chat_response(db, current_user.id, id, message.content)
    
    # Save assistant message
    assistant_msg = models.Message(conversation_id=id, role="assistant", content=answer_text)
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)
    
    # Return response (augmenting Pydantic response with sources)
    response = schemas.MessageResponse.from_orm(assistant_msg)
    response.sources = sources
    return response
