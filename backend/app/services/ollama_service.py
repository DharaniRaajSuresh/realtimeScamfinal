import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

class OllamaService:
    def analyze_scam(self, transcript: str) -> dict:
        """
        Sends the conversation transcript to local Ollama for analysis.
        Returns a dict with risk_score and reasoning.
        """
        prompt = f"""
        Analyze the following phone call transcript for signs of a scam.
        The conversation is between a 'SCAMMER' and a 'VICTIM'.
        
        Transcript:
        {transcript}
        
        Provide a DEEP FORENSIC ANALYSIS in EXACTLY the following JSON format:
        {{
            "risk_score": <number between 0 and 100>,
            "reasoning": "<A deep, forensic 2-3 sentence analysis of the scammer's tactics (e.g. urgency, authority impersonation, social engineering) and the overall threat level.>",
            "is_scam": <boolean>
        }}
        """
        
        try:
            response = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json"
                },
                timeout=120
            )
            response.raise_for_status()
            result = response.json()
            analysis = json.loads(result.get("response", "{}"))
            
            return {
                "risk_score": analysis.get("risk_score", 0),
                "reasoning": analysis.get("reasoning", "Unable to analyze with Ollama."),
                "is_scam": analysis.get("is_scam", False)
            }
        except Exception as e:
            print(f"Ollama Error: {e}")
            return {
                "risk_score": 0,
                "reasoning": "Ollama is offline or model not found.",
                "is_scam": False
            }

ollama_service = OllamaService()
