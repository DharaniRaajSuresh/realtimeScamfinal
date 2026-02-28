import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    AGORA_APP_ID = os.getenv("AGORA_APP_ID", "")
    AGORA_CUSTOMER_ID = os.getenv("AGORA_CUSTOMER_ID", "")
    AGORA_CUSTOMER_SECRET = os.getenv("AGORA_CUSTOMER_SECRET", "")

settings = Settings()
