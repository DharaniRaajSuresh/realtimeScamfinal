import requests
import base64
from app.core.config import settings


class AgoraSTTManager:
    def __init__(self):
        self.app_id = settings.AGORA_APP_ID
        self.customer_id = settings.AGORA_CUSTOMER_ID
        self.customer_secret = settings.AGORA_CUSTOMER_SECRET
        self.base_url = f"https://api.agora.io/api/speech-to-text/v1/projects/{self.app_id}"

        # Base64 encode customer_id:customer_secret for Basic Auth
        credentials = f"{self.customer_id}:{self.customer_secret}"
        encoded_credentials = base64.b64encode(credentials.encode('utf-8')).decode('utf-8')

        self.headers = {
            "Authorization": f"Basic {encoded_credentials}",
            "Content-Type": "application/json"
        }

    def start_transcription(self, channel_name: str) -> dict:
        """Start real-time STT agent. No bot tokens needed in test mode."""
        url = f"{self.base_url}/join"

        # Bot UIDs for subscribing audio and publishing subtitles
        sub_bot_uid = 1001
        pub_bot_uid = 1002

        payload = {
            "languages": ["en-US", "ta-IN"],  # English + Tamil
            "name": f"stt-{channel_name}",
            "maxIdleTime": 120,
            "rtcConfig": {
                "channelName": channel_name,
                "subBotUid": str(sub_bot_uid),
                "pubBotUid": str(pub_bot_uid),
                "enableJsonProtocol": True
            }
        }

        try:
            print(f"[STT] Starting transcription for channel: {channel_name}")
            print(f"[STT] URL: {url}")
            response = requests.post(url, headers=self.headers, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as errh:
            error_text = errh.response.text
            if errh.response.status_code == 409 and ("conflict" in error_text.lower() or "TaskConflict" in error_text):
                print(f"[STT] Info: Transcription is already actively running for {channel_name} (409 Conflict).")
            else:
                print(f"[STT] HTTP Error: {error_text}")
            return {"error": error_text}
        except requests.exceptions.RequestException as err:
            print(f"[STT] Request Error: {str(err)}")
            return {"error": str(err)}

    def stop_transcription(self, agent_id: str) -> dict:
        """Stop a running STT agent."""
        url = f"{self.base_url}/agents/{agent_id}/leave"

        try:
            print(f"[STT] Stopping agent: {agent_id}")
            response = requests.post(url, headers=self.headers)
            print(f"[STT] Stop response: {response.status_code} - {response.text}")
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as errh:
            print(f"[STT] HTTP Error: {errh.response.text}")
            return {"error": errh.response.text}
        except requests.exceptions.RequestException as err:
            return {"error": str(err)}

    def query_transcription(self, agent_id: str) -> dict:
        """Query the status of an STT agent."""
        url = f"{self.base_url}/agents/{agent_id}"

        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as errh:
            print(f"[STT] HTTP Error: {errh.response.text}")
            return {"error": errh.response.text}
        except requests.exceptions.RequestException as err:
            return {"error": str(err)}


agora_stt_manager = AgoraSTTManager()
