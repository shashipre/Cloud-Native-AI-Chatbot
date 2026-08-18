from sqlalchemy.orm import Session
from typing import List, Tuple
import google.generativeai as genai
from .. import models, schemas
from ..config import settings
from .rag import get_query_embedding

def retrieve_context(db: Session, user_id: int, query: str, top_k: int = 3) -> List[Tuple[models.Chunk, float]]:
    """Retrieve relevant chunks for a user based on query embedding."""
    query_embedding = get_query_embedding(query)
    
    # Using pgvector cosine distance operator
    # Join Document to filter by user_id
    results = db.query(models.Chunk, models.Chunk.embedding.cosine_distance(query_embedding).label('distance')) \
        .join(models.Document) \
        .filter(models.Document.user_id == user_id) \
        .filter(models.Document.status == "ready") \
        .order_by(models.Chunk.embedding.cosine_distance(query_embedding)) \
        .limit(top_k) \
        .all()
        
    return results

def generate_chat_response(db: Session, user_id: int, conversation_id: int, new_message: str) -> Tuple[str, List[schemas.SourceChunk]]:
    """Generate a response using context from vector DB."""
    
    # 1. Retrieve context
    context_chunks = retrieve_context(db, user_id, new_message)
    
    # 2. Format context for prompt
    context_text = "\n\n---\n\n".join([f"Source: {c.Chunk.document.filename}\nContent: {c.Chunk.content}" for c in context_chunks])
    
    # 3. Retrieve chat history
    history = db.query(models.Message).filter(models.Message.conversation_id == conversation_id).order_by(models.Message.created_at).all()
    
    # 4. Build conversation for Gemini
    system_prompt = (
        "You are a helpful AI assistant. Answer the user's question using ONLY the provided context. "
        "If the answer is not contained in the context, politely say that you don't have enough information."
    )
    
    if not settings.gemini_api_key:
        return "Simulated response: (Gemini API key not configured)", []
    
    genai.configure(api_key=settings.gemini_api_key)
    
    model = genai.GenerativeModel(
        model_name="gemini-3.6-flash",
        system_instruction=system_prompt
    )
    
    # Build history for Gemini chat
    gemini_history = []
    for msg in history:
        gemini_history.append({
            "role": "user" if msg.role == "user" else "model",
            "parts": [msg.content]
        })
    
    chat = model.start_chat(history=gemini_history)
    
    # Send the new message with context
    user_prompt = f"Context:\n{context_text}\n\nQuestion: {new_message}"
    
    response = chat.send_message(user_prompt)
    answer = response.text
    
    sources = []
    for c in context_chunks:
        sources.append(schemas.SourceChunk(
            id=c.Chunk.id,
            document_id=c.Chunk.document_id,
            filename=c.Chunk.document.filename,
            content=c.Chunk.content
        ))
        
    return answer, sources
