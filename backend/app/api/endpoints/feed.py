from fastapi import APIRouter
import os
import json
from google import genai

router = APIRouter()

@router.get("/")
def get_scam_feed():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return [
            {
                "title": "API Key Missing",
                "description": "Please add GEMINI_API_KEY to your backend .env file to fetch live trends.",
                "severity": "CRITICAL",
                "emoji": "⚠️"
            },
            {
                "title": "Fallback Mode Active",
                "description": "Unable to fetch live scams from Gemini due to missing authentication.",
                "severity": "COMMON",
                "emoji": "ℹ️"
            }
        ]

    prompt = """
You are a cybersecurity analyst specialized in Indian digital fraud trends.

Your task is to generate a scam awareness feed based on the latest common scams reported in news, cybersecurity reports, and fraud alerts in India.

Focus on explaining the specific techniques that scammers are using to scam people. Focus on scams affecting:
- Banking & UPI users
- WhatsApp users
- Elderly people
- Job seekers
- Delivery & Government impersonation

Return EXACTLY 6 scam alerts in valid JSON format ONLY. Do not include markdown formatting or backticks.

[
  {
    "title": "Fake Account Blocked Calls",
    "description": "Scammers impersonating bank helplines asking for OTP to verify identity.",
    "severity": "HIGH ALERT",
    "emoji": "💼"
  }
]

Rules:
- Keep description under 25 words, clearly explaining the technique used.
- Focus on scams active in India.
- SEVERITY ONLY one of: CRITICAL, HIGH ALERT, TRENDING, NEW, COMMON
- Return ONLY the raw JSON array
"""

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
        )
        
        text = response.text
        text = text.replace("```json", "").replace("```", "").strip()
        
        feed = json.loads(text)
        return feed[:6] # Ensure exactly 6 items are returned
    except Exception as e:
        print("Gemini Backend Error:", e)
        return [
            {
                "title": "Feed Error",
                "description": "Failed to fetch live scam feed from the Gemini API. Check backend console logs.",
                "severity": "CRITICAL",
                "emoji": "❌"
            }
        ]
