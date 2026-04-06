import os
import requests
import numpy as np
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv

from app.services.mfcc_service import mfcc_extractor
from app.services.ollama_service import OLLAMA_URL, OLLAMA_MODEL
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

load_dotenv()

# Initialize Pinecone from .env
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

class PineconeService:
    def __init__(self):
        self.pc = None
        if PINECONE_API_KEY:
            # Use the initialization pattern requested by the user
            self.pc = Pinecone(api_key=PINECONE_API_KEY)
            self.spec = ServerlessSpec(cloud="aws", region="us-east-1")
        else:
            print("WARNING: PINECONE_API_KEY not set in .env")

    def _get_ollama_embedding(self, text: str) -> list[float]:
        """Fetch text embedding from the local Ollama instance."""
        try:
            response = requests.post(f"{OLLAMA_URL}/api/embeddings", json={
                "model": OLLAMA_EMBED_MODEL,
                "prompt": text
            }, timeout=60)
            response.raise_for_status()
            data = response.json()
            return data.get("embedding", [])
        except Exception as e:
            print(f"Failed to get embedding from Ollama: {e}")
            return []

    def setup_indexes(self):
        """Creates the necessary indexes if they do not exist."""
        if not self.pc:
            return

        existing_indexes = [idx.name for idx in self.pc.list_indexes()]

        # 1. quickstart (Requested by User)
        if "quickstart" not in existing_indexes:
            print("Pinecone: Creating 'quickstart' index...")
            sample_emb = self._get_ollama_embedding("test")
            dim = len(sample_emb) if sample_emb else 1536 # Default to 1536 if unknown
            self.pc.create_index(
                name="quickstart",
                dimension=dim,
                metric="cosine",
                spec=self.spec
            )

        # 2. scamsense-voiceprints
        if "scamsense-voiceprints" not in existing_indexes:
            self.pc.create_index(
                name="scamsense-voiceprints",
                dimension=12,
                metric="cosine",
                spec=self.spec
            )

        # 3. scamsense-scamscripts
        if "scamsense-scamscripts" not in existing_indexes:
            sample_emb = self._get_ollama_embedding("test")
            if sample_emb:
                self.pc.create_index(
                    name="scamsense-scamscripts",
                    dimension=len(sample_emb),
                    metric="cosine",
                    spec=self.spec
                )

    def store_voiceprint(self, voiceprint_id: str, audio_path: str, metadata: dict = None):
        """Process an audio file and store its MFCC voiceprint into Pinecone."""
        if not self.pc: return False
        try:
            mfcc_matrix = mfcc_extractor.extract_features(audio_path, visualize=False)
            mean_pooled_mfcc = np.mean(mfcc_matrix, axis=0).tolist()
            index = self.pc.Index("scamsense-voiceprints")
            index.upsert(vectors=[{"id": voiceprint_id, "values": mean_pooled_mfcc, "metadata": metadata or {}}])
            return True
        except Exception as e:
            print(f"Error storing voiceprint: {e}")
            return False

    def store_scamscript(self, script_id: str, text: str, metadata: dict = None):
        """Process scam transcript text and store its embedding into Pinecone."""
        if not self.pc: return False
        embedding = self._get_ollama_embedding(text)
        if not embedding: return False
        try:
            # Use quickstart index if preferred, or stay with scamscripts
            index = self.pc.Index("quickstart")
            index.upsert(vectors=[{"id": script_id, "values": embedding, "metadata": metadata or {"text": text}}])
            return True
        except Exception as e:
            print(f"Error storing scam script: {e}")
            return False

    def query_scamscript(self, text: str) -> dict:
        """Queries the quickstart index to find similarity against known scam texts."""
        if not self.pc: return {"score": 0, "metadata": {}}
        embedding = self._get_ollama_embedding(text)
        if not embedding: return {"score": 0, "metadata": {}}
        try:
            index = self.pc.Index("quickstart")
            response = index.query(vector=embedding, top_k=1, include_metadata=True)
            if response.matches:
                match = response.matches[0]
                return {"score": match.score, "metadata": match.metadata}
            return {"score": 0, "metadata": {}}
        except Exception as e:
            print(f"Error querying Pinecone: {e}")
            return {"score": 0, "metadata": {}}

pinecone_service = PineconeService()
