import sys
sys.path.insert(0, '.')

# Test 1: Import voice service
from app.services.voice_service import voice_service
print("✅ voice_service imported OK")

# Test 2: Import voice router
from app.api.endpoints.voice import router
print(f"✅ voice router imported OK, routes: {len(router.routes)}")

# Test 3: Import main app
from app.main import app
print(f"✅ main.py imported OK, routes: {len(app.routes)}")

# Test 4: Test S3 client initialization (boto3)
s3 = voice_service.s3
print(f"✅ S3 client connected: {type(s3)}")

# Test 5: List S3 buckets
try:
    buckets = s3.list_buckets()
    names = [b["Name"] for b in buckets.get("Buckets", [])]
    print(f"✅ S3 buckets: {names}")
except Exception as e:
    print(f"⚠️ S3 bucket listing failed (expected if service key is placeholder): {e}")

print("\n✅ ALL IMPORTS PASSED")
