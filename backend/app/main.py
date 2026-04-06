from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.endpoints import analyze, agora, websocket, stt, feed, complaints, voice
from app.services.pinecone_service import pinecone_service

import asyncio

import os
from dotenv import load_dotenv
load_dotenv()
os.environ["HF_TOKEN"] = os.getenv("HF_TOKEN", "")
# Fix for Windows symlink warnings/errors
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS"] = "1"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup Pinecone Indexes in the background on startup so it doesn't block server boot
    asyncio.create_task(asyncio.to_thread(pinecone_service.setup_indexes))
    # Setup Qdrant voice collection in background
    async def setup_voice():
        try:
            print("🔄 Initializing voice pipeline setup...")
            from app.services.voice_service import voice_service
            # No await for to_thread in background task if we don't need its result yet
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, voice_service.setup_collection)
            await loop.run_in_executor(None, voice_service.setup_storage_bucket)
            print("✅ Voice pipeline setup background tasks triggered.")
        except Exception as e:
            print(f"⚠️ Voice setup background error: {e}")
    
    asyncio.create_task(setup_voice())
    yield
    # Shutdown logic if any

app = FastAPI(title="AI Scam Shield API", lifespan=lifespan)

# Configure CORS for Vite Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(analyze.router, prefix="/api", tags=["Analysis"])
app.include_router(agora.router, prefix="/api/agora", tags=["Agora"])
app.include_router(stt.router, prefix="/api/stt", tags=["STT"])
app.include_router(complaints.router, prefix="/api/complaints", tags=["Complaints"])
app.include_router(websocket.router, tags=["WebSockets"])
app.include_router(feed.router, prefix="/api/feed", tags=["Scam Feed"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice Processing"])

@app.get("/")
def root():
    return {"status": "online", "message": "AI Scam Shield API"}
