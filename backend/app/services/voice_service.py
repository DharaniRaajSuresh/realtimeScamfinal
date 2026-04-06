"""
ScamSense Voice Processing Service
===================================
FULL PIPELINE (triggered by "Report to Police"):

  1. User clicks "Report to Police"
  2. Backend receives: userId, callId, audio blob
  3. Upload FULL audio to Supabase Storage (S3-compatible API)
  4. Async pipeline:
     → Fetch audio from Supabase → Convert to WAV
     → PyAnnote diarization (2 speakers)
     → Identify scammer (speaker with most talk time)
     → Extract scammer-only audio
     → Generate voice embedding (SpeechBrain ECAPA-TDNN, 192-dim)
  5. Store embedding in Qdrant with metadata
  6. Similarity search: compare against existing DB
     → If match > 0.88 → "Repeat Scammer"
  7. Store final case record in Supabase Postgres
  8. Return verdict to frontend

Supabase Storage uses the S3-compatible API (boto3).
Models are lazily loaded on first use.
"""

import os
import uuid
import tempfile
import traceback
import requests
import json
import time
from datetime import datetime
from dotenv import load_dotenv

import torch
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance
from speechbrain.inference.speaker import EncoderClassifier

load_dotenv()


class VoiceConfig:
    """All voice pipeline configuration from environment."""

    # ── Qdrant (Vector DB for voice embeddings) ──
    QDRANT_URL = os.getenv("QDRANT_URL")
    QDRANT_KEY = os.getenv("QDRANT_API_KEY")
    COLLECTION = os.getenv("QDRANT_COLLECTION", "scammer_voices")
    VECTOR_SIZE = 192  # ECAPA-TDNN output dimension
    MATCH_THRESHOLD = 0.85  # Consensus baseline: 0.85+ is likely same
    CHUNK_DURATION = 5.0   # 5-second segments for multi-match consensus (v2.0)

    # ── Supabase Postgres (Case records) ──
    SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")

    # ── Supabase Storage — S3-compatible API ──
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
    SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "scam-recordings")
    S3_ENDPOINT = os.getenv("SUPABASE_S3_ENDPOINT")
    S3_REGION = os.getenv("SUPABASE_S3_REGION", "ap-northeast-1")
    S3_ACCESS_KEY = os.getenv("SUPABASE_S3_ACCESS_KEY")
    S3_SECRET_KEY = os.getenv("SUPABASE_S3_SECRET_KEY")

    # ── HuggingFace (model access) ──
    HF_TOKEN = os.getenv("HF_TOKEN")

    # ── AssemblyAI (Diarization) ──
    ASSEMBLYAI_KEY = os.getenv("ASSEMBLYAI_KEY")

    # ── Pipeline settings ──
    MIN_SCAMMER_SECONDS = 3  # Minimum scammer audio for reliable embedding


class VoiceService:
    """
    Singleton service for the full voice processing pipeline.
    Lazily loads ML models and clients on first use.
    """

    def __init__(self):
        self._qdrant = None
        self._voice_model = None
        self._diarize = None
        self._db = None
        self._s3 = None
        self._models_loaded = False

    # ─── LAZY LOADERS ───────────────────────────────

    @property
    def qdrant(self):
        if self._qdrant is None:
            self._qdrant = QdrantClient(
                url=VoiceConfig.QDRANT_URL,
                api_key=VoiceConfig.QDRANT_KEY
            )
            print(f"✅ Qdrant client connected: {type(self._qdrant)}")
        return self._qdrant

    @property
    def voice_model(self):
        if self._voice_model is None:
            self._voice_model = EncoderClassifier.from_hparams(
                source="speechbrain/spkrec-ecapa-voxceleb",
                savedir="pretrained_models/spkrec-ecapa-voxceleb"
            )
            print("✅ SpeechBrain ECAPA-TDNN loaded")
        return self._voice_model

    @property
    def diarize(self):
        """Deprecated: Now using AssemblyAI Cloud API for diarization."""
        return None

    @property
    def db(self):
        if self._db is None:
            import psycopg2
            self._db = psycopg2.connect(VoiceConfig.SUPABASE_DB_URL)
            self._db.autocommit = False
            print("✅ Supabase Postgres connected")
        return self._db

    @property
    def s3(self):
        """Supabase S3-compatible storage client via boto3."""
        if self._s3 is None:
            import boto3
            from botocore.config import Config

            self._s3 = boto3.client(
                "s3",
                endpoint_url=VoiceConfig.S3_ENDPOINT,
                region_name=VoiceConfig.S3_REGION,
                aws_access_key_id=VoiceConfig.S3_ACCESS_KEY,
                aws_secret_access_key=VoiceConfig.S3_SECRET_KEY,
                config=Config(
                    s3={"addressing_style": "path"},
                    signature_version="s3v4"
                )
            )
            print("✅ Supabase S3 client connected")
        return self._s3

    # ─── STEP 0: ONE-TIME SETUP ─────────────────────

    def setup_collection(self):
        """
        Creates the Qdrant collection for scammer voiceprints.
        Safe to call multiple times — checks if collection already exists.
        """
        existing = [c.name for c in self.qdrant.get_collections().collections]

        if VoiceConfig.COLLECTION in existing:
            print(f"Collection '{VoiceConfig.COLLECTION}' already exists.")
            return {"status": "exists", "collection": VoiceConfig.COLLECTION}

        self.qdrant.create_collection(
            collection_name=VoiceConfig.COLLECTION,
            vectors_config=VectorParams(
                size=VoiceConfig.VECTOR_SIZE,
                distance=Distance.COSINE
            )
        )
        print(f"✅ Collection '{VoiceConfig.COLLECTION}' created.")
        return {"status": "created", "collection": VoiceConfig.COLLECTION}

    def setup_storage_bucket(self):
        """
        Ensures the Supabase Storage bucket exists via S3 API.
        Private bucket — only accessible via signed URLs.
        """
        try:
            # Check if bucket already exists
            response = self.s3.list_buckets()
            existing = [b["Name"] for b in response.get("Buckets", [])]

            if VoiceConfig.SUPABASE_BUCKET in existing:
                print(f"Bucket '{VoiceConfig.SUPABASE_BUCKET}' already exists.")
                return {"status": "exists", "bucket": VoiceConfig.SUPABASE_BUCKET}

            # Create private bucket
            self.s3.create_bucket(
                Bucket=VoiceConfig.SUPABASE_BUCKET,
                CreateBucketConfiguration={
                    "LocationConstraint": VoiceConfig.S3_REGION
                }
            )
            print(f"✅ Storage bucket '{VoiceConfig.SUPABASE_BUCKET}' created (private)")
            return {"status": "created", "bucket": VoiceConfig.SUPABASE_BUCKET}
        except Exception as e:
            if "BucketAlreadyOwnedByYou" in str(e) or "already exists" in str(e).lower():
                print(f"Bucket '{VoiceConfig.SUPABASE_BUCKET}' already exists.")
                return {"status": "exists", "bucket": VoiceConfig.SUPABASE_BUCKET}
            print(f"⚠️ Bucket setup error: {e}")
            return {"status": "error", "error": str(e)}

    # ─── STEP 1: UPLOAD AUDIO TO SUPABASE STORAGE ───

    def upload_audio(self, audio_bytes: bytes, case_id: str, file_ext: str = ".webm"):
        """
        Uploads the FULL audio recording to Supabase Storage via S3 API.
        Returns the S3 object key for later signed URL generation.
        """
        # Determine content type
        ext_clean = file_ext.lstrip(".")
        content_type_map = {
            "webm": "audio/webm",
            "opus": "audio/opus",
            "wav": "audio/wav",
            "mp3": "audio/mpeg",
            "ogg": "audio/ogg",
        }
        content_type = content_type_map.get(ext_clean, f"audio/{ext_clean}")

        object_key = f"recordings/{case_id}{file_ext}"

        try:
            self.s3.put_object(
                Bucket=VoiceConfig.SUPABASE_BUCKET,
                Key=object_key,
                Body=audio_bytes,
                ContentType=content_type
            )
            print(f"✅ Audio uploaded to S3: {object_key} ({len(audio_bytes)} bytes)")
            return object_key
        except Exception as e:
            print(f"⚠️ S3 upload error: {e}")
            traceback.print_exc()
            # Non-fatal — continue processing even if storage fails
            return f"upload-failed/{case_id}{file_ext}"

    def get_signed_url(self, object_key: str, expires_in: int = 3600):
        """
        Generates a pre-signed URL for police to access the recording.
        Default expiry: 1 hour.
        """
        try:
            url = self.s3.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": VoiceConfig.SUPABASE_BUCKET,
                    "Key": object_key
                },
                ExpiresIn=expires_in
            )
            return url
        except Exception as e:
            print(f"⚠️ Signed URL error: {e}")
            return ""

    def download_audio(self, object_key: str, local_path: str):
        """
        Downloads audio from Supabase Storage to a local temp file for ML processing.
        """
        try:
            response = self.s3.get_object(
                Bucket=VoiceConfig.SUPABASE_BUCKET,
                Key=object_key
            )
            with open(local_path, "wb") as f:
                f.write(response["Body"].read())
            print(f"✅ Audio downloaded from S3: {object_key} → {local_path}")
            return True
        except Exception as e:
            print(f"⚠️ S3 download error: {e}")
            return False

    # ─── STEP 2: CONVERT TO WAV ─────────────────────

    def convert_to_wav(self, input_path: str):
        """
        Converts audio to 16kHz mono WAV for ML processing.
        Uses subprocess to call FFmpeg CLI directly.
        """
        import subprocess

        wav_path = input_path.rsplit(".", 1)[0] + "_proc.wav"

        try:
            print(f"🔄 Converting {input_path} to WAV via FFmpeg CLI...")
            
            # Use FFmpeg to convert to 16kHz mono WAV
            # Use absolute path to local binary on D: drive
            ffmpeg_path = r"D:\hindu\ffmpeg_bins\ffmpeg-8.1-full_build-shared\bin\ffmpeg.exe"
            cmd = [
                ffmpeg_path, "-y",
                "-i", input_path,
                "-ar", "16000",
                "-ac", "1",
                wav_path
            ]
            
            # Use shell=True/False depending on how ffmpeg is in path
            result = subprocess.run(
                cmd, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE,
                text=True
            )

            if result.returncode == 0:
                print(f"✅ Saved WAV: {wav_path}")
                return wav_path
            else:
                print(f"❌ FFmpeg FAILED (code {result.returncode}): {result.stderr}")
                # Log fallback attempt
                print("🔄 Trying legacy torchaudio/librosa fallback...")
                raise RuntimeError("FFmpeg CLI failed")

        except Exception as e:
            print(f"⚠️ FFmpeg CLI conversion error: {e}")
            # LEGACY FALLBACK
            import torch
            import torchaudio
            import librosa
            try:
                # Load with librosa at 16k directly
                waveform_np, _ = librosa.load(input_path, sr=16000)
                waveform = torch.from_numpy(waveform_np).unsqueeze(0)
                torchaudio.save(wav_path, waveform, 16000)
                print(f"✅ Saved WAV via fallback: {wav_path}")
                return wav_path
            except Exception as fe:
                print(f"❌ ALL CONVERSION ATTEMPTS FAILED: {fe}")
                return input_path

    # ─── STEP 3: SAVE CASE TO POSTGRES ──────────────

    def save_case(self, case_id: str, audio_url: str, metadata: dict):
        """
        Saves case record to Supabase Postgres cases table.
        Creates the table if it doesn't exist.
        """
        try:
            cur = self.db.cursor()

            # Ensure table exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS cases (
                    case_id TEXT PRIMARY KEY,
                    user_id TEXT DEFAULT '',
                    call_id TEXT DEFAULT '',
                    audio_url TEXT,
                    embedding_id TEXT,
                    scam_type TEXT DEFAULT 'Unknown',
                    risk_score INTEGER DEFAULT 0,
                    tactics TEXT DEFAULT '',
                    city TEXT DEFAULT '',
                    district TEXT DEFAULT '',
                    transcript TEXT DEFAULT '',
                    transcript_summary TEXT DEFAULT 'No summary available',
                    match_status TEXT DEFAULT 'PENDING',
                    linked_cases TEXT[] DEFAULT '{}',
                    status TEXT DEFAULT 'PENDING_ANALYSIS',
                    submitted_at TIMESTAMPTZ DEFAULT NOW(),
                    qdrant_point_id TEXT
                )
            """)

            # v2.0 Migration: Ensure column exists if table was created in earlier versions
            cur.execute("ALTER TABLE cases ADD COLUMN IF NOT EXISTS transcript_summary TEXT DEFAULT 'No summary available'")

            cur.execute("""
                INSERT INTO cases (
                    case_id, user_id, call_id, audio_url,
                    scam_type, risk_score, tactics,
                    city, district, transcript, transcript_summary, status, submitted_at
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (case_id) DO NOTHING
            """, (
                case_id,
                metadata.get("user_id", ""),
                metadata.get("call_id", ""),
                audio_url,
                metadata.get("scam_type", "Unknown"),
                metadata.get("risk_score", 0),
                metadata.get("tactics", ""),
                metadata.get("city", ""),
                metadata.get("district", ""),
                metadata.get("transcript", ""),
                metadata.get("summary", "No summary available"),
                "PENDING_ANALYSIS",
                datetime.utcnow().isoformat()
            ))
            self.db.commit()
            cur.close()
            print(f"✅ Case {case_id} saved to Postgres")
        except Exception as e:
            self.db.rollback()
            print(f"⚠️ Postgres save error: {e}")
            traceback.print_exc()

    def update_case_status(self, case_id: str, updates: dict):
        """
        Updates a case record in Postgres with embedding_id, match_status, etc.
        """
        try:
            cur = self.db.cursor()
            set_parts = []
            values = []
            for key, val in updates.items():
                set_parts.append(f"{key}=%s")
                values.append(val)
            values.append(case_id)

            cur.execute(
                f"UPDATE cases SET {', '.join(set_parts)} WHERE case_id=%s",
                values
            )
            self.db.commit()
            cur.close()
        except Exception as e:
            self.db.rollback()
            print(f"⚠️ Postgres update error: {e}")

    # ─── STEP 4: DIARIZATION ────────────────────────

    def get_scammer_segments(self, audio_source: str):
        """
        Runs AssemblyAI diarization on the audio file.
        - audio_source can be a public URL or a local file path.
        - Transcription with speaker labels (universal-3-pro)
        - Scammer = speaker with MORE total speaking time
        - Returns (scammer_segments, victim_id) or (None, None) failure
        """
        import requests
        import time
        import os

        headers = {"authorization": VoiceConfig.ASSEMBLYAI_KEY}

        # ── 1. Handle Source (Local Path vs Remote URL) ──
        if os.path.exists(audio_source):
            print(f"📦 Uploading local file to AssemblyAI: {audio_source}")
            try:
                def read_file(path):
                    with open(path, "rb") as f:
                        while True:
                            data = f.read(5242880) # 5MB chunks
                            if not data:
                                break
                            yield data

                upload_resp = requests.post(
                    "https://api.assemblyai.com/v2/upload",
                    headers=headers,
                    data=read_file(audio_source)
                )
                upload_resp.raise_for_status()
                audio_url = upload_resp.json()["upload_url"]
                print(f"✅ Local file uploaded to AssemblyAI: {audio_url}")
            except Exception as e:
                print(f"❌ AssemblyAI Upload FAILED: {e}")
                return None, None
        else:
            audio_url = audio_source
            print(f"🔄 Using remote URL for AssemblyAI: {audio_url[:60]}...")
        
        # ── 2. Submit Job ──
        config = {
            "audio_url": audio_url,
            "speaker_labels": True,
            "speech_models": ["universal-3-pro"],
            "language_detection": True
        }

        try:
            resp = requests.post("https://api.assemblyai.com/v2/transcript", json=config, headers=headers)
            resp.raise_for_status()
            transcript_id = resp.json()["id"]
            print(f"✅ AssemblyAI Job Created: {transcript_id}")
        except Exception as e:
            print(f"❌ AssemblyAI Submission FAILED: {e}")
            return None, None

        # ── 2. Poll for Completion ──
        polling_endpoint = f"https://api.assemblyai.com/v2/transcript/{transcript_id}"
        
        while True:
            try:
                res = requests.get(polling_endpoint, headers=headers).json()
                status = res.get("status")

                if status == "completed":
                    print("✅ AssemblyAI Transcription Completed")
                    utterances = res.get("utterances", [])
                    full_text = res.get("text", "")
                    break
                elif status == "error":
                    print(f"❌ AssemblyAI Transcription Error: {res.get('error')}")
                    return None, None
                else:
                    print(f"⏳ Waiting for AssemblyAI... ({status})")
                    time.sleep(3)
            except Exception as e:
                print(f"⚠️ Polling error: {e}")
                time.sleep(3)

        if not utterances:
            print("⚠️ No speaker segments detected in transcript.")
            return None, None

        # ── 3. Identify Scammer (max talk time) ──
        speaker_duration = {}
        speaker_segments = {}

        for utt in utterances:
            speaker = utt["speaker"]
            # AssemblyAI provides stamps in milliseconds
            start = utt["start"] / 1000.0 
            end = utt["end"] / 1000.0
            duration = end - start

            speaker_duration[speaker] = speaker_duration.get(speaker, 0) + duration
            
            if speaker not in speaker_segments:
                speaker_segments[speaker] = []
            speaker_segments[speaker].append((start, end))

        if not speaker_duration:
            return None, None

        # Scammer = speaker with more total time
        ranked = sorted(speaker_duration, key=speaker_duration.get, reverse=True)
        scammer_id = ranked[0]
        victim_id = ranked[1] if len(ranked) > 1 else None

        print(f"🎯 Scammer = {scammer_id} ({speaker_duration[scammer_id]:.1f}s)")
        if victim_id:
            print(f"👤 Victim  = {victim_id}  ({speaker_duration[victim_id]:.1f}s)")

        return speaker_segments[scammer_id], victim_id, full_text

    # ─── STEP 4.5: SILENCE TRIMMING (v2.0) ──────────

    def trim_silence(self, waveform: torch.Tensor, threshold: float = 0.05):
        """
        Removes silence from the waveform based on an energy threshold.
        Baseline for Method 7.
        """
        # Calculate energy (RMS style)
        abs_waveform = torch.abs(waveform)
        # Use a sliding window to find active regions
        window_size = 1000  # ~62ms at 16kHz
        # Simple energy check
        mask = torch.max(abs_waveform.unfold(1, window_size, window_size // 4), dim=2)[0] > threshold
        
        # This is a bit simplified; real VAD is better but this works for static noise
        # We find indices where energy > threshold
        if not torch.any(mask):
            return waveform # Fallback to original if completely silent

        # Keep only the 'active' samples (flattened)
        # For simplicity in v2.0, we just return the full sequence if it has enough energy, 
        # or we could do more complex mask-driven slicing.
        # Let's do simple threshold-based filtering for now.
        return waveform[:, torch.mean(abs_waveform, dim=0) > (threshold / 10)]

    # ─── STEP 5: EXTRACT SCAMMER AUDIO + EMBEDDING ──

    def extract_embedding(self, audio_path: str, scammer_segments: list):
        """
        Loads audio, slices out scammer segments, TRIMS SILENCE,
        and splits into MULTIPLE 5s chunks (Method 2).
        """
        import torch
        import soundfile as sf

        try:
            # Use soundfile instead of librosa to avoid SpeechBrain 1.0 LazyModule conflicts
            # WAV is already 16kHz mono from our FFmpeg step
            waveform_np, sample_rate = sf.read(audio_path)
            
            # Handle multi-channel (soundfile returns [T, C] or [T])
            if len(waveform_np.shape) > 1:
                waveform_np = waveform_np.mean(axis=1)
                
            waveform = torch.from_numpy(waveform_np).unsqueeze(0).float()
            print(f"✅ Loaded audio via soundfile: {waveform.shape} at {sample_rate}Hz")
        except Exception as e:
            print(f"⚠️ Audio load error via soundfile: {e}")
            return None

        # ── 1. Extract scammer-only audio ──
        parts = []
        for (start, end) in scammer_segments:
            s = int(start * sample_rate)
            e = int(end * sample_rate)
            if e > s and e <= waveform.shape[1]:
                parts.append(waveform[:, s:e])

        if not parts:
            print("⚠️ No valid scammer segments extracted.")
            return None

        scammer_waveform = torch.cat(parts, dim=1)

        # ── 2. Trim silence (Method 7) ──
        print("🔇 Trimming silence...")
        clean_waveform = self.trim_silence(scammer_waveform)
        
        total_secs = clean_waveform.shape[1] / sample_rate
        print(f"🎤 Clean scammer audio: {total_secs:.1f}s")

        if clean_waveform.shape[1] < VoiceConfig.MIN_SCAMMER_SECONDS * sample_rate:
            print(f"⚠️ Not enough clean audio ({total_secs:.1f}s < {VoiceConfig.MIN_SCAMMER_SECONDS}s)")
            return None

        # ── 3. Chunk into MULTIPLE segments (Method 2) ──
        chunk_samples = int(VoiceConfig.CHUNK_DURATION * sample_rate)
        embeddings = []
        
        num_chunks = max(1, clean_waveform.shape[1] // chunk_samples)
        # Handle the one-chunk case or if shorter than CHUNK_DURATION
        if clean_waveform.shape[1] < chunk_samples:
            chunks = [clean_waveform]
        else:
            chunks = [
                clean_waveform[:, i * chunk_samples : (i + 1) * chunk_samples] 
                for i in range(num_chunks)
            ]

        # Limit max chunks to 10 for performance
        chunks = chunks[:10]

        print(f"🧠 Generating embeddings for {len(chunks)} chunks...")
        with torch.no_grad():
            for i, chunk in enumerate(chunks):
                try:
                    # Pad if very short
                    if chunk.shape[1] < 1000: continue
                    
                    emb = self.voice_model.encode_batch(chunk)
                    embeddings.append(emb.squeeze().tolist())
                    print(f"   ✅ Chunk {i+1} done")
                except Exception as ce:
                    print(f"   ⚠️ Chunk {i+1} failed: {ce}")

        return embeddings if embeddings else None

    # ─── STEP 6: STORE EMBEDDING IN QDRANT ──────────

    def store_embedding(self, embeddings: list, case_id: str, audio_url: str, metadata: dict):
        """
        Stores MULTIPLE scammer voice embeddings in Qdrant (Method 3).
        Each chunk from the same call is stored as an individual searchable point.
        """
        if not embeddings:
            return None

        points = []
        first_point_id = None

        for i, emb in enumerate(embeddings):
            point_id = str(uuid.uuid4())
            if i == 0: first_point_id = point_id
            
            points.append(
                PointStruct(
                    id=point_id,
                    vector=emb,
                    payload={
                        "point_id": point_id,
                        "case_id": case_id,
                        "chunk_index": i,
                        "user_id": metadata.get("user_id", ""),
                        "call_id": metadata.get("call_id", ""),
                        "audio_url": audio_url,
                        "scam_type": metadata.get("scam_type", "Unknown"),
                        "risk_score": metadata.get("risk_score", 0),
                        "tactics": metadata.get("tactics", ""),
                        "summary": metadata.get("summary", ""),
                        "city": metadata.get("city", ""),
                        "district": metadata.get("district", ""),
                        "first_reported": datetime.utcnow().isoformat(),
                        "last_reported": datetime.utcnow().isoformat(),
                        "victim_count": 1,
                        "linked_cases": [case_id],
                        "status": "ACTIVE"
                    }
                )
            )

        # Batch upsert
        self.qdrant.upsert(
            collection_name=VoiceConfig.COLLECTION,
            points=points
        )

        # Update case in Postgres with the primary embedding_id
        self.update_case_status(case_id, {
            "qdrant_point_id": first_point_id,
            "embedding_id": first_point_id,
            "status": "VOICEPRINT_STORED",
            "match_status": "NEW_SUSPECT"
        })

        print(f"✅ Stored {len(points)} embeddings in Qdrant for case {case_id}")
        return first_point_id

    # ─── STEP 7: SIMILARITY SEARCH ──────────────────

    def compare_voice(self, embeddings: list, metadata: dict, new_case_id: str = None):
        """
        Consensus-based similarity search (v2.0 - Methods 2, 4, 5, 8).
        Analyses a list of embeddings and returns the most likely matching suspect.
        """
        from collections import defaultdict
        from qdrant_client.models import Filter, FieldCondition, MatchValue

        if not embeddings:
            return {"matched": False, "verdict": "ERROR", "message": "No embeddings to compare."}

        print(f"🔍 Starting consensus search for {len(embeddings)} segments...")
        
        # ── 1. Create Metadata Filter (Method 5) ──
        # Optional: We prioritize matches in the same scam_type for higher accuracy
        scam_type = metadata.get("scam_type", "Unknown")
        query_filter = None
        if scam_type != "Unknown":
            # We don't force MUST, but we could use it if we wanted strict filtering
            # For now, we search globally but we can use this logic for future pruning
            pass

        # ── 2. Query Qdrant for each chunk (Method 2) ──
        all_matches = []
        for i, emb in enumerate(embeddings):
            try:
                response = self.qdrant.query_points(
                    collection_name=VoiceConfig.COLLECTION,
                    query=emb,
                    limit=3, # Top 3 per chunk
                    score_threshold=VoiceConfig.MATCH_THRESHOLD - 0.05, # Wider net for consensus
                    with_payload=True
                )
                if response.points:
                    all_matches.extend(response.points)
            except Exception as e:
                print(f"   ⚠️ Chunk {i+1} search failed: {e}")

        # ── 3. Aggregate results by Point ID (Method 4 Consensus) ──
        if not all_matches:
            return {
                "matched": False,
                "verdict": "NEW SUSPECT",
                "message": "No prior record found in database."
            }

        candidate_scores = defaultdict(list)
        candidate_payloads = {}

        for hit in all_matches:
            # FIX: Group by case_id (the scammer's profile) instead of individual point_id
            # This allows multiple chunks to reinforce the same candidate (Method 4)
            cid = hit.payload.get("case_id", hit.id)
            candidate_scores[cid].append(hit.score)
            
            # Store the best payload for this candidate (highest score)
            if cid not in candidate_payloads or hit.score > candidate_payloads[cid]["score"]:
                candidate_payloads[cid] = {**hit.payload, "score": hit.score}

        # ── 4. Calculate Final Scores (Method 2 Average) ──
        final_candidates = []
        for cid, scores in candidate_scores.items():
            avg_score = sum(scores) / len(scores)
            # Frequency: how many chunk searches found this specific case?
            # Max frequency is 1.0 (if every chunk search found this case)
            frequency = min(1.0, len(scores) / len(embeddings))
            
            # Score Fusion (Method 8)
            fused_score = (avg_score * 0.7) + (frequency * 0.3)
            
            final_candidates.append({
                "case_id": cid,
                "avg_score": avg_score,
                "frequency": frequency,
                "fused_score": fused_score,
                "payload": candidate_payloads[cid]
            })

        # Sort by fused score
        final_candidates.sort(key=lambda x: x["fused_score"], reverse=True)
        winner = final_candidates[0]

        # ── 5. Apply Threshold Check (Method 1) ──
        is_match = winner["avg_score"] >= VoiceConfig.MATCH_THRESHOLD
        
        if not is_match:
            return {
                "matched": False,
                "verdict": "NEW SUSPECT",
                "message": f"Best match ({winner['avg_score']:.2f}) below threshold {VoiceConfig.MATCH_THRESHOLD}."
            }

        # ── 6. Match Found -> Update Record ──
        payload = winner["payload"]
        updated_victims = payload.get("victim_count", 1) + 1
        updated_cases = payload.get("linked_cases", [])

        if new_case_id and new_case_id not in updated_cases:
            updated_cases.append(new_case_id)

        try:
            self.qdrant.set_payload(
                collection_name=VoiceConfig.COLLECTION,
                payload={
                    "victim_count": updated_victims,
                    "linked_cases": updated_cases,
                    "last_reported": datetime.utcnow().isoformat()
                },
                points=[winner["point_id"]]
            )
        except Exception as e:
            print(f"⚠️ Failed to update match payload: {e}")

        return {
            "matched": True,
            "verdict": "ALREADY REPORTED",
            "confidence": f"{round(winner['avg_score'] * 100)}%",
            "confidence_raw": winner["avg_score"],
            "frequency": f"{round(winner['frequency'] * 100)}%",
            "point_id": winner["point_id"],
            "case_id": payload.get("case_id"),
            "scam_type": payload.get("scam_type"),
            "city": payload.get("city"),
            "district": payload.get("district"),
            "victim_count": updated_victims,
            "linked_cases": updated_cases,
            "first_reported": payload.get("first_reported", "")[:10],
            "last_reported": datetime.utcnow().isoformat()[:10],
            "status": payload.get("status", "ACTIVE")
        }

    # ─── FULL PIPELINE ──────────────────────────────

    def process_call_report(self, audio_bytes: bytes, case_id: str, metadata: dict, file_ext: str = ".webm"):
        """
        FULL PIPELINE — triggered when user clicks "Report to Police".
        """
        print(f"\n{'=' * 60}")
        print(f"🔄 PROCESSING CALL REPORT: {case_id}")
        print(f"   User: {metadata.get('user_id', 'unknown')}")
        print(f"   Call: {metadata.get('call_id', 'unknown')}")
        print(f"   Audio: {len(audio_bytes)} bytes ({file_ext})")
        print(f"{'=' * 60}")

        # ── STEP 1: Upload FULL audio to Supabase Storage ──
        audio_url_key = self.upload_audio(audio_bytes, case_id, file_ext)

        # ── STEP 2: Save case to Postgres ──
        self.save_case(case_id, audio_url_key, metadata)

        # ── STEP 3: Download audio to temp file for ML processing ──
        tmp_dir = tempfile.mkdtemp()
        local_audio = os.path.join(tmp_dir, f"{case_id}{file_ext}")

        with open(local_audio, "wb") as f:
            f.write(audio_bytes)

        # ── STEP 4: Convert to WAV (16kHz mono) ──
        # We still need local WAV for embedding extraction
        wav_path = self.convert_to_wav(local_audio)

        # ── STEP 5: Run diarization (AssemblyAI) → identify scammer ──
        # Generate signed URL for AssemblyAI to access the file
        print(f"🔗 Generating signed URL for AssemblyAI...")
        signed_url = self.get_signed_url(audio_url_key)
        
        print(f"📡 Sending to AssemblyAI...")
        scammer_segs, victim_id, full_transcript = self.get_scammer_segments(signed_url)

        if scammer_segs is None:
            print("❌ Diarization FAILED (No segments).")
            self.update_case_status(case_id, {
                "status": "DIARIZATION_FAILED",
                "match_status": "FAILED",
                "transcript": full_transcript if 'full_transcript' in locals() else "FAILED"
            })
            return {"success": False, "error": "Could not separate speakers", "case_id": case_id}

        # ── STEP 6: Extract scammer embeddings (multiple 5s chunks) ──
        print(f"🧪 Extracting scammer embeddings (v2.0)...")
        embeddings = self.extract_embedding(wav_path, scammer_segs)

        if not embeddings:
            print("❌ Embedding extraction FAILED.")
            self.update_case_status(case_id, {
                "status": "EMBEDDING_FAILED",
                "match_status": "FAILED"
            })
            return {"success": False, "error": "Insufficient scammer audio", "case_id": case_id}

        try:
            # ── STEP 7: Consensus-based similarity search ──
            compare_result = self.compare_voice(embeddings, metadata, case_id)
            
            # ── STEP 8: Store new profiles (if no match) ──
            if not compare_result["matched"]:
                print("📝 Storing new multi-vector profile in Qdrant...")
                point_id = self.store_embedding(embeddings, case_id, audio_url_key, metadata)
                compare_result["point_id"] = point_id
                compare_result["user_status"] = "DIFFERENT USER"

                # STEP 7.5: Generate Short Context (Ollama v2.0)
                summary = metadata.get("summary")
                if not summary or summary == "No summary available":
                    print("🤖 Generating forensic summary via Ollama...")
                    try:
                        from app.services.ollama_service import ollama_service
                        analysis = ollama_service.analyze_scam(full_transcript)
                        summary = analysis.get("reasoning", "No summary could be generated.")
                    except Exception as e:
                        print(f"⚠️ Ollama summary failed: {e}")
                        summary = "AI Summary unavailable (Ollama offline)."

                # Metadata for Postgres
                self.update_case_status(case_id, {
                    "is_repeat": False,
                    "match_score": 0,
                    "status": "VOICEPRINT_STORED",
                    "match_status": "NEW_SUSPECT",
                    "transcript": full_transcript,
                    "transcript_summary": summary
                })
                print(f"🎯 Verdict: {compare_result['verdict']} - DIFFERENT USER")
            else:
                compare_result["user_status"] = "SAME USER"
                print("📑 Updating existing consensus match in Postgres...")
                
                # STEP 7.5: Generate Short Context (Ollama v2.0)
                summary = metadata.get("summary")
                if not summary or summary == "No summary available":
                    print("🤖 Generating forensic summary via Ollama...")
                    try:
                        from app.services.ollama_service import ollama_service
                        analysis = ollama_service.analyze_scam(full_transcript)
                        summary = analysis.get("reasoning", "No summary could be generated.")
                    except Exception as e:
                        print(f"⚠️ Ollama summary failed: {e}")
                        summary = "AI Summary unavailable (Ollama offline)."

                self.update_case_status(case_id, {
                    "is_repeat": True,
                    "status": "MATCH_FOUND",
                    "match_status": "REPEAT_SCAMMER",
                    "match_score": compare_result.get("confidence_raw", 0),
                    "embedding_id": compare_result.get("point_id", ""),
                    "linked_cases": str(compare_result.get("linked_cases", [])),
                    "transcript": full_transcript,
                    "transcript_summary": summary
                })
                print(f"🎯 Verdict: {compare_result['verdict']} - SAME USER")
                print(f"🚨 REPEAT SCAMMER — {compare_result['victim_count']} victims")

            # Cleanup
            try:
                os.remove(local_audio)
                if wav_path != local_audio:
                    os.remove(wav_path)
                os.rmdir(tmp_dir)
            except Exception:
                pass

            print(f"✅ PROCESS COMPLETE: {case_id}")
            return {
                "success": True,
                "case_id": case_id,
                "audio_url": audio_url_key,
                "user_status": compare_result["user_status"],
                "result": compare_result
            }
        except Exception as e:
            print(f"❌ PIPELINE ERROR: {e}")
            traceback.print_exc()
            raise e

    # ─── POLICE DASHBOARD METHODS ───────────────────

    def police_compare(self, audio_bytes: bytes, file_ext: str = ".webm"):
        """Called when police upload audio for comparison."""
        tmp_dir = tempfile.mkdtemp()
        local_audio = os.path.join(tmp_dir, f"police_compare{file_ext}")
        with open(local_audio, "wb") as f:
            f.write(audio_bytes)
        
        wav_path = self.convert_to_wav(local_audio)
        scammer_segs, _ = self.get_scammer_segments(wav_path)
        
        if scammer_segs is None:
            return {"success": False, "error": "Could not isolate voice"}
        
        # ─── v2.0 Consensus Compare ───
        embeddings = self.extract_embedding(wav_path, scammer_segs)
        if not embeddings:
            return {"success": False, "error": "Audio too short/noisy"}
        
        result = self.compare_voice(embeddings, {})
        
        # Cleanup
        try:
            os.remove(local_audio)
            if wav_path != local_audio:
                os.remove(wav_path)
            os.rmdir(tmp_dir)
        except Exception:
            pass

        return {"success": True, "result": result}

    def list_police_reports(self, limit: int = 50):
        """
        Unified forensic reporting API (v2.0).
        Fetches case records from Postgres and enriches with signed URLs.
        """
        try:
            cursor = self.db.cursor()
            cursor.execute("""
                SELECT 
                    case_id, user_id, audio_url, risk_score, 
                    transcript_summary, embedding_id as scammer_id, 
                    match_score, is_repeat, linked_cases, created_at,
                    transcript
                FROM cases
                ORDER BY created_at DESC
                LIMIT %s
            """, (limit,))
            
            rows = cursor.fetchall()
            cursor.close()
            
            reports = []
            for r in rows:
                audio_key = r[2] or ""
                # Generate a temporary signed URL for the dashboard if audio exists
                signed_url = ""
                if audio_key and not audio_key.startswith("upload-failed"):
                    signed_url = self.get_signed_url(audio_key)

                is_repeat = r[7] if r[7] is not None else False
                match_score = r[6] if r[6] is not None else 0
                
                reports.append({
                    "case_id": r[0],
                    "user_id": r[1],
                    "audio_url": signed_url,
                    "risk_score": r[3] or 0,
                    "transcript_summary": r[4] or "No summary available",
                    "scammer_id": r[5] or "NEW_PROFILING",
                    "match_score": match_score,
                    "is_repeat": is_repeat,
                    "linked_cases": r[8] or "[]", 
                    "status": "Already Reported" if is_repeat else "New Suspect",
                    "message": f"This scammer has been linked to {r[8]} cases" if is_repeat else "No previous records found",
                    "created_at": r[9].strftime("%Y-%m-%d") if r[9] else "",
                    "transcript": r[10] or "Transcript unavailable."
                })
            
            return reports
        except Exception as e:
            print(f"⚠️ Error fetching police reports: {e}")
            # Ensure fresh connection on failure
            self._db = None
            return []

    def list_voiceprints(self, limit: int = 100):
        """Scrolls Qdrant for raw vectors (kept for debugging)."""
        try:
            result = self.qdrant.scroll(collection_name=VoiceConfig.COLLECTION, limit=limit, with_payload=True)
            points = result[0] if result else []
            voiceprints = []
            for p in points:
                payload = p.payload or {}
                voiceprints.append({"point_id": p.id, **payload})
            return voiceprints
        except Exception as e:
            print(f"⚠️ Error listing voiceprints: {e}")
            return []

    def get_voiceprint(self, point_id: str):
        try:
            points = self.qdrant.retrieve(collection_name=VoiceConfig.COLLECTION, ids=[point_id], with_payload=True)
            if not points: return None
            p = points[0]
            payload = p.payload or {}
            audio_url = payload.get("audio_url", "")
            signed_url = self.get_signed_url(audio_url) if audio_url and not audio_url.startswith("upload-failed") else ""
            return {"point_id": p.id, "signed_url": signed_url, **payload}
        except Exception as e:
            print(f"⚠️ Error getting voiceprint: {e}")
            return None

    def format_for_dashboard(self, compare_result: dict):
        if not compare_result.get("matched"):
            return {"verdict": "NEW SUSPECT", "message": "No match found.", "action": "Create profile"}
        return {
            "verdict": "ALREADY REPORTED",
            "confidence": compare_result["confidence"],
            "victim_count": compare_result["victim_count"],
            "first_reported": compare_result["first_reported"],
            "last_reported": compare_result["last_reported"],
            "scam_type": compare_result["scam_type"],
            "city": compare_result["city"],
            "summary": compare_result["summary"],
            "audio_url": compare_result["audio_url"],
            "linked_cases": compare_result["linked_cases"]
        }


# Singleton instance
voice_service = VoiceService()
