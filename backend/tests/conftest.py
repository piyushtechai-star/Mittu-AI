import os
import sys
from pathlib import Path

# Local, free, offline: in-memory database, canned AI and voice, fake payments, OTP always 123456.
os.environ.update({
    "STORE": "memory", "AI_PROVIDER": "fake", "TTS_PROVIDER": "fake", "BILLING_MODE": "fake", "OTP_MODE": "console",
    "MITTUAI_RAZORPAY_WEBHOOK_SECRET": "whsec_test", "MITTUAI_JWT_SECRET": "jwt_test_secret_at_least_32_bytes_long",
})
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402

from app import media, store  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_store():
    store.reset_memory_store()
    media._memory.clear()
    yield
