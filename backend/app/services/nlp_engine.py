import re
from typing import Dict, Any
from app.services.ollama_service import ollama_service

import asyncio
from app.services.pinecone_service import pinecone_service

class ScamEngine:
    def __init__(self):
        self.dictionaries = {
            "financial_triggers": ["bank", "otp", "transfer", "account", "pin", "payment", "fee", "money", "rupees"],
            "urgency": ["now", "immediately", "hurry", "urgent", "quick", "fast", "today", "blocked", "suspended"],
            "authority": ["police", "customs", "tax", "officer", "inspector", "government", "manager", "sir", "madam"],
            "compliance": ["okay", "sending", "yes", "i will", "done", "transferring", "sharing", "agreed"]
        }

    def _count_matches(self, text: str, category: str) -> int:
        words = self.dictionaries[category]
        pattern = re.compile(r'\b(' + '|'.join(words) + r')\b', re.IGNORECASE)
        matches = pattern.findall(text)
        return len(matches)

    async def calculate_risk(self, text: str, speaker_type: str) -> Dict[str, Any]:
        text_lower = text.lower()
        score = 0
        tactics_found = []

        fin_count = self._count_matches(text_lower, "financial_triggers")
        urg_count = self._count_matches(text_lower, "urgency")
        auth_count = self._count_matches(text_lower, "authority")
        comp_count = self._count_matches(text_lower, "compliance")

        if speaker_type in ["remote", "SCAMMER", "ALL"]:
            score += fin_count * 20
            score += urg_count * 15
            score += auth_count * 25
            
            if fin_count > 0: tactics_found.append("Financial Requisition")
            if urg_count > 0: tactics_found.append("Time Pressure / Urgency")
            if auth_count > 0: tactics_found.append("Authority Impersonation")

        if speaker_type in ["local", "YOU", "VICTIM", "ALL"]:
            score += comp_count * 15
            if fin_count > 0: score += fin_count * 10
            
            if comp_count > 0: tactics_found.append("High Compliance")
            if fin_count > 0: tactics_found.append("Financial Disclosure")

        risk_score = min(100, score)

        # DEEP ANALYSIS: Run Ollama and Pinecone Concurrently
        ollama_analysis = {"risk_score": 0, "reasoning": "Awaiting sufficient conversation length...", "is_scam": False}
        pinecone_match = {"score": 0}

        if len(text.split()) > 10:
            # Dispatch threads concurrently
            ollama_task = asyncio.to_thread(ollama_service.analyze_scam, text)
            pinecone_task = asyncio.to_thread(pinecone_service.query_scamscript, text)
            
            # Wait for both engines
            ollama_analysis, pinecone_match = await asyncio.gather(ollama_task, pinecone_task)
            
            pc_score = pinecone_match.get("score", 0) * 100
            
            # Mathematical scoring logic merging pure Keyword, Pinecone Vector Matching, and Ollama deduction
            if pc_score > 80.0:
                # Direct match to a known scam vector overrides general logic
                risk_score = 95
                ollama_analysis["reasoning"] = f"[Pinecone Pattern Match: {pc_score:.1f}%] " + ollama_analysis["reasoning"]
            else:
                if ollama_analysis["risk_score"] > risk_score:
                    risk_score = min(100, (risk_score + ollama_analysis["risk_score"]) // 2)

        # Determine vulnerability label
        if risk_score > 70:
            vuln = "CRITICAL"
            scam_type = "High-Risk active manipulation"
        elif risk_score > 60:
            vuln = "HIGH"
            scam_type = "Suspicious interrogative"
        elif risk_score > 35:
            vuln = "MEDIUM"
            scam_type = "Potential probing"
        else:
            vuln = "LOW"
            scam_type = "Normal conversation"

        if fin_count > 0 and urg_count > 0:
            scam_type = "Financial Impersonation Fraud"

        return {
            "risk_score": risk_score,
            "scam_type": scam_type,
            "tactics": tactics_found,
            "vulnerability": vuln,
            "ollama_reasoning": ollama_analysis["reasoning"]
        }
