import re
from typing import Dict, Any

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

    def calculate_risk(self, text: str, speaker_type: str) -> Dict[str, Any]:
        text_lower = text.lower()
        score = 0
        tactics_found = []

        fin_count = self._count_matches(text_lower, "financial_triggers")
        urg_count = self._count_matches(text_lower, "urgency")
        auth_count = self._count_matches(text_lower, "authority")
        comp_count = self._count_matches(text_lower, "compliance")

        if speaker_type == "remote":
            # the suspected scammer
            score += fin_count * 20
            score += urg_count * 15
            score += auth_count * 25
            
            if fin_count > 0: tactics_found.append("Financial Requisition")
            if urg_count > 0: tactics_found.append("Time Pressure / Urgency")
            if auth_count > 0: tactics_found.append("Authority Impersonation")

        elif speaker_type == "local":
            # the potential victim
            score += comp_count * 15
            if fin_count > 0: score += fin_count * 10
            
            if comp_count > 0: tactics_found.append("High Compliance")
            if fin_count > 0: tactics_found.append("Financial Disclosure")

        # Cap score at 100
        risk_score = min(100, score)

        # Determine vulnerability label
        if risk_score > 85:
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

        # Generalize a major scam type if specific triggers are met
        if fin_count > 0 and urg_count > 0:
            scam_type = "Financial Impersonation Fraud"

        return {
            "risk_score": risk_score,
            "scam_type": scam_type,
            "tactics": tactics_found,
            "vulnerability": vuln
        }
