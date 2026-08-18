from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, models, auth, database
from ..services import s3, rag

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload", response_model=schemas.DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not file.filename.endswith((".pdf", ".txt", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF, TXT, and DOCX files are supported")
    
    # 1. Read file
    content = await file.read()
    
    # 2. Upload to S3
    s3_key = f"users/{current_user.id}/{file.filename}"
    s3_url = s3.upload_file_to_s3(content, file.filename, s3_key)
    if not s3_url:
        raise HTTPException(status_code=500, detail="Failed to upload file to S3")

    # 3. Save to DB
    new_doc = models.Document(
        user_id=current_user.id,
        filename=file.filename,
        s3_key=s3_key,
        status="processing"
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # 4. Extract text and chunk (Normally done in background task, but keeping simple here)
    try:
        chunks = rag.process_document(content, file.filename)
        
        # 5. Save chunks and embeddings
        for i, chunk_text in enumerate(chunks):
            embedding = rag.get_embedding(chunk_text)
            new_chunk = models.Chunk(
                document_id=new_doc.id,
                content=chunk_text,
                chunk_index=i,
                embedding=embedding
            )
            db.add(new_chunk)
            
        new_doc.status = "ready"
        db.commit()
    except Exception as e:
        db.rollback()
        new_doc.status = "error"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

    return new_doc

@router.get("/", response_model=List[schemas.DocumentResponse])
def get_documents(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.Document).filter(models.Document.user_id == current_user.id).all()
