import os
import requests
import time
from dotenv import load_dotenv

load_dotenv()

ASSEMBLYAI_KEY = os.getenv("ASSEMBLYAI_KEY")

def test_diarization(audio_url):
    print(f"🚀 Testing AssemblyAI Diarization...")
    print(f"API Key: {ASSEMBLYAI_KEY[:5]}...{ASSEMBLYAI_KEY[-5:]}")
    
    headers = {"authorization": ASSEMBLYAI_KEY}
    
    config = {
        "audio_url": audio_url,
        "speaker_labels": True,
        "speech_models": ["universal-3-pro"]
    }

    resp = requests.post("https://api.assemblyai.com/v2/transcript", json=config, headers=headers)
    if resp.status_code != 200:
        print(f"❌ Failed to submit: {resp.text}")
        return

    transcript_id = resp.json()["id"]
    print(f"✅ Job Created: {transcript_id}")

    endpoint = f"https://api.assemblyai.com/v2/transcript/{transcript_id}"
    
    while True:
        res = requests.get(endpoint, headers=headers).json()
        status = res.get("status")
        print(f"⏳ Status: {status}")
        
        if status == "completed":
            utterances = res.get("utterances", [])
            print(f"✅ Completed! Found {len(utterances)} utterances.")
            
            speaker_durations = {}
            for utt in utterances:
                spk = utt["speaker"]
                dur = (utt["end"] - utt["start"]) / 1000.0
                speaker_durations[spk] = speaker_durations.get(spk, 0) + dur
            
            for spk, dur in speaker_durations.items():
                print(f"  - Speaker {spk}: {dur:.2f}s")
            
            ranked = sorted(speaker_durations, key=speaker_durations.get, reverse=True)
            print(f"🎯 Top Speaker (Scammer Candidate): {ranked[0]}")
            break
        elif status == "error":
            print(f"❌ Error: {res.get('error')}")
            break
        
        time.sleep(5)

if __name__ == "__main__":
    # Test with the sample URL provided by the user
    SAMPLE_URL = "https://dontpjnhzftvrujmwezv.supabase.co/storage/v1/object/public/scam-recordings/recordings/CYB-1775212007860.webm"
    test_diarization(SAMPLE_URL)
