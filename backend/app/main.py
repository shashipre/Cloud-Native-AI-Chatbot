from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, documents, conversations
from .database import engine, Base

# Create tables if not using alembic immediately, though alembic is preferred.
# For pgvector to work, the extension needs to be created first in DB.
# We will rely on Alembic to create tables and extensions.

app = FastAPI(title="Cloud-Native AI Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev, update in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(conversations.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Chatbot API"}
