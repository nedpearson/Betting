"""Kalshi API request authentication.

Supports both Ed25519 (recommended) and RSA-PSS (2048-bit) keys.
Signature pre-sign text:
    timestamp_ms + method.upper() + path_without_query_params
Headers:
    KALSHI-ACCESS-KEY: api_key_id
    KALSHI-ACCESS-TIMESTAMP: timestamp_ms
    KALSHI-ACCESS-SIGNATURE: base64(signature)
"""

from __future__ import annotations

import base64
import time
from typing import Any

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.asymmetric.rsa import RSAPrivateKey


class KalshiSigner:
    def __init__(self, key_id: str, private_key_pem: bytes | str):
        self.key_id = key_id
        if isinstance(private_key_pem, str):
            private_key_pem = private_key_pem.encode("utf-8")
        self._private_key: Any = serialization.load_pem_private_key(
            private_key_pem,
            password=None,
            backend=default_backend(),
        )

    def sign_headers(self, method: str, path: str) -> dict[str, str]:
        # Strip query parameters if present
        clean_path = path.split("?")[0]
        ts_ms = str(int(time.time() * 1000))
        msg = f"{ts_ms}{method.upper()}{clean_path}".encode("utf-8")

        if isinstance(self._private_key, Ed25519PrivateKey):
            sig_bytes = self._private_key.sign(msg)
        elif isinstance(self._private_key, RSAPrivateKey):
            sig_bytes = self._private_key.sign(
                msg,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.DIGEST_LENGTH,
                ),
                hashes.SHA256(),
            )
        else:
            raise ValueError(f"unsupported key type: {type(self._private_key)}")

        sig_b64 = base64.b64encode(sig_bytes).decode("utf-8")
        return {
            "KALSHI-ACCESS-KEY": self.key_id,
            "KALSHI-ACCESS-TIMESTAMP": ts_ms,
            "KALSHI-ACCESS-SIGNATURE": sig_b64,
        }

    def ws_handshake_headers(self) -> dict[str, str]:
        return self.sign_headers("GET", "/trade-api/ws/v2")
