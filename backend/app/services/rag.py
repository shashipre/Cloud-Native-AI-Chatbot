import io
import pymupdf
from docx import Document as DocxDocument
from typing import List
import google.generativeai as genai
from ..config import settings
import logging

logger = logging.getLogger(__name__)

EMBEDDING_DIMENSION = 768

def extract_text_from_pdf(file_content: bytes) -> str:
    text = ""
    try:
        pdf_document = pymupdf.open(stream=file_content, filetype="pdf")
        for page_num in range(pdf_document.page_count):
            page = pdf_document.load_page(page_num)
            text += page.get_text()
    except Exception as e:
        logger.error(f"Error reading PDF: {e}")
    return text

def extract_text_from_docx(file_content: bytes) -> str:
    text = ""
    try:
        doc = DocxDocument(io.BytesIO(file_content))
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        logger.error(f"Error reading DOCX: {e}")
    return text

def process_document(file_content: bytes, filename: str) -> List[str]:
    """Extract text and chunk it."""
    text = ""
    if filename.endswith(".pdf"):
        text = extract_text_from_pdf(file_content)
    elif filename.endswith(".docx"):
        text = extract_text_from_docx(file_content)
    elif filename.endswith(".txt"):
        text = file_content.decode("utf-8")
    else:
        raise ValueError("Unsupported file type")
        
    # Basic chunking: ~500 tokens (~2000 chars)
    chunk_size = 2000
    overlap = 200
    chunks = []
    
    start = 0
    text_length = len(text)
    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunks.append(text[start:end])
        start += chunk_size - overlap
        
    return chunks

def get_embedding(text: str) -> List[float]:
    """Generate embedding using Google Gemini API."""
    if not settings.gemini_api_key:
        logger.warning("Gemini API key not set. Returning dummy embedding.")
        return [0.0] * EMBEDDING_DIMENSION
        
    genai.configure(api_key=settings.gemini_api_key)
    try:
        result = genai.embed_content(
            model="models/gemini-embedding-001",
            content=text.replace("\n", " "),
            task_type="retrieval_document",
            output_dimensionality=EMBEDDING_DIMENSION
        )
        return result['embedding']
    except Exception as e:
        logger.error(f"Error getting embedding: {e}")
        return [0.0] * EMBEDDING_DIMENSION

def get_query_embedding(text: str) -> List[float]:
    """Generate query embedding (uses retrieval_query task type)."""
    if not settings.gemini_api_key:
        logger.warning("Gemini API key not set. Returning dummy embedding.")
        return [0.0] * EMBEDDING_DIMENSION
        
    genai.configure(api_key=settings.gemini_api_key)
    try:
        result = genai.embed_content(
            model="models/gemini-embedding-001",
            content=text.replace("\n", " "),
            task_type="retrieval_query",
            output_dimensionality=EMBEDDING_DIMENSION
        )
        return result['embedding']
    except Exception as e:
        logger.error(f"Error getting query embedding: {e}")
        return [0.0] * EMBEDDING_DIMENSION
