import time
from app.core.config import settings

def generate_rtc_token(channel_name: str, uid: int = 0) -> str:
    app_id = settings.AGORA_APP_ID
    app_certificate = settings.AGORA_APP_CERTIFICATE
    
    if not app_id or not app_certificate:
        return "AGORA_CREDENTIALS_MISSING"

    try:
        import base64
        if not hasattr(base64, "decodestring"):
            base64.decodestring = base64.decodebytes
        if not hasattr(base64, "encodestring"):
            base64.encodestring = base64.encodebytes
            
        from agora_token_builder import RtcTokenBuilder
        expiration_time_in_seconds = 3600
        current_timestamp = int(time.time())
        privilege_expired_ts = current_timestamp + expiration_time_in_seconds

        # Role 1 is Publisher (historically Role_Publisher)
        token = RtcTokenBuilder.buildTokenWithUid(
            app_id, 
            app_certificate, 
            channel_name, 
            uid, 
            1, 
            privilege_expired_ts
        )
        return token
    except Exception as e:
        print(f"[TOKEN] Error generating token: {e}")
        return "AGORA_CREDENTIALS_MISSING"
