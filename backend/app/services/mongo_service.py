import os
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

class MongoService:
    def __init__(self):
        # Use MONGODB_URI from .env
        self.uri = os.getenv("MONGODB_URI", "mongodb+srv://sudarsansudarsan192_db_user:sudarsan123456@cluster0.8kmxuco.mongodb.net/?appName=Cluster0")
        self.client = MongoClient(self.uri)
        self.db = self.client.scamsense
        self.conversations = self.db.conversations

    def store_conversation(self, channel_id: str, transcript: str, risk_score: int, reasoning: str, payload: dict = None):
        """Saves a completed call conversation to MongoDB."""
        document = {
            "channel_id": channel_id,
            "transcript": transcript,
            "risk_score": risk_score,
            "ollama_reasoning": reasoning,
            "timestamp": datetime.utcnow(),
            "metadata": payload or {}
        }
        try:
            result = self.conversations.insert_one(document)
            print(f"✅ MongoDB: Conversation successfully stored to DB [ID: {result.inserted_id}]")
            return str(result.inserted_id)
        except Exception as e:
            print(f"MongoDB Insert Error: {e}")
            return None

mongo_service = MongoService()
