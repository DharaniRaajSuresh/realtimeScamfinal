from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import analyze, agora, websocket, stt, feed

app = FastAPI(title="AI Scam Shield API")

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
app.include_router(websocket.router, tags=["WebSockets"])
app.include_router(feed.router, prefix="/api/feed", tags=["Scam Feed"])

@app.get("/")
def root():
    return {"status": "online", "message": "AI Scam Shield API"}
