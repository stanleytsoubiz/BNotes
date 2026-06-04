#!/usr/bin/env python3
"""Repair the BNotes GA4/GSC OAuth token.

This script reuses the existing OAuth client information from the current
token file, starts a local Google OAuth flow, and writes a fresh token back to
the same standard path used by bnotes_monitor.py.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path


TOKEN_PATH = Path(
    os.environ.get(
        "BNOTES_GOOGLE_TOKEN",
        os.path.expanduser("~/.config/gcloud/bnotes-oauth-token.json"),
    )
)

SCOPES = [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/siteverification.verify_only",
]


def load_client_config() -> dict:
    if not TOKEN_PATH.exists():
        raise FileNotFoundError(f"Token file not found: {TOKEN_PATH}")

    token_data = json.loads(TOKEN_PATH.read_text())
    client_id = token_data.get("client_id")
    client_secret = token_data.get("client_secret")

    if not client_id or not client_secret:
        raise ValueError("Existing token file does not contain OAuth client_id/client_secret.")

    return {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": token_data.get("token_uri", "https://oauth2.googleapis.com/token"),
            "redirect_uris": ["http://localhost"],
        }
    }


def main() -> int:
    try:
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ImportError as exc:
        print("Missing dependency: google-auth-oauthlib", file=sys.stderr)
        print(str(exc), file=sys.stderr)
        return 2

    config = load_client_config()
    TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tmp:
        json.dump(config, tmp)
        client_file = tmp.name

    try:
        flow = InstalledAppFlow.from_client_secrets_file(client_file, SCOPES)
        creds = flow.run_local_server(
            host="localhost",
            port=8765,
            authorization_prompt_message=(
                "Open this URL to re-authorize BNotes GA4/GSC monitoring:\n{url}\n"
            ),
            success_message=(
                "BNotes GA4/GSC authorization completed. You can close this browser tab."
            ),
            open_browser=True,
            access_type="offline",
            prompt="consent",
        )
        TOKEN_PATH.write_text(creds.to_json())
        os.chmod(TOKEN_PATH, 0o600)
    finally:
        try:
            os.unlink(client_file)
        except OSError:
            pass

    print(f"Token repaired: {TOKEN_PATH}")
    print("Scopes:")
    for scope in SCOPES:
        print(f"- {scope}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
