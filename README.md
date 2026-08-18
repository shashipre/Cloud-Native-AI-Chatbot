# Cloud-Native AI Chatbot

A multi-user, cloud-deployed RAG (retrieval-augmented generation) chatbot. Users register, upload documents, and ask questions that get answered using the content of their own uploaded documents plus an LLM.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────┐
│   React UI  │────▶│  FastAPI Backend  │────▶│  PostgreSQL   │
│  (Tailwind) │     │   (Dockerized)    │     │  + pgvector   │
└─────────────┘     └──────┬───────────┘     └───────────────┘
                           │
                    ┌──────┴───────┐
                    │              │
               ┌────▼────┐  ┌─────▼─────┐
               │  AWS S3  │  │ Gemini API │
               │ (Docs)   │  │ (LLM/Emb)  │
               └──────────┘  └────────────┘
```

## Tech Stack
- **Backend**: Python, FastAPI, SQLAlchemy, Alembic
- **Frontend**: React (Vite), Tailwind CSS
- **Database**: PostgreSQL with pgvector extension
- **Storage**: AWS S3
- **Auth**: JWT (python-jose), bcrypt (passlib)
- **LLM/Embeddings**: Google Gemini API (free tier)
- **Containerization**: Docker

## Setup Instructions

### Prerequisites
- Python 3.12+
- Node.js 18+
- Docker & Docker Compose

### 1. Clone and configure environment
```bash
cp backend/.env.example backend/.env
# Fill in your actual values in backend/.env
```

### 2. Start local PostgreSQL (with pgvector)
```bash
docker-compose up -d
```

### 3. Run backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### 4. Run frontend
```bash
cd frontend
npm install
npm run dev
```

### 5. Access the app
- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs

## RAG Pipeline
1. **Upload**: User uploads PDF/DOCX/TXT → stored in S3
2. **Process**: Extract text → chunk (~500 tokens, overlap) → generate embeddings via Gemini
3. **Store**: Chunks + vector embeddings stored in PostgreSQL (pgvector)
4. **Query**: User question → embed → cosine similarity search (scoped to user's docs) → top-k chunks
5. **Answer**: Assemble prompt with retrieved context → call LLM → return grounded answer + sources

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/me` | Get current user |
| POST | `/documents/upload` | Upload a document |
| GET | `/documents/` | List user's documents |
| POST | `/conversations` | Create conversation |
| GET | `/conversations` | List conversations |
| POST | `/conversations/{id}/messages` | Send message, get AI response |
| GET | `/conversations/{id}/messages` | Get chat history |
