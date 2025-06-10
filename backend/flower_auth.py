from typing import Any

import requests

from config import Settings

MGMT_BASE_URL = "https://api.flower.ai/v1"


def get_flower_api_key(
    user_id_hash: str,
    expires_at: int | None = None,
    settings: Settings | None = None,
) -> str:
    """Request a Flower API key.

    expires_at should be an integer timestamp of the date the API key will become invalid.
    If None, the default timestamp is 90 days from now.

    The response from the server contains the following information:
        id: str
        api_key: str
        redacted_value: str
        expires_at: int

    This function only returns the `api_key`.
    """
    if settings is None:
        settings = Settings()

    payload: dict[str, str | int] = {
        "billing_id": user_id_hash,
    }
    if expires_at:
        payload["expires_at"] = expires_at

    try:
        response = requests.post(
            _get_mgmt_url(settings),
            json=payload,
            headers=_get_headers(settings),
        )
        response.raise_for_status()
        data: dict[str, Any] = response.json()
        api_key: str = data["api_key"]
        return api_key
    except requests.HTTPError as exc:
        raise RuntimeError(
            f"Error when requesting Flower API key: {exc.response.status_code} {exc.response.text}"
        ) from exc
    except KeyError as exc:
        raise RuntimeError("Bad response from Flower API server") from exc


def _get_mgmt_url(settings: Settings) -> str:
    project_id = settings.flower_proj_id
    if not project_id:
        raise ValueError("FLOWER_PROJ_ID must be set in environment variables")

    return f"{MGMT_BASE_URL}/organization/projects/{project_id}/api_keys"


def _get_headers(settings: Settings) -> dict[str, str]:
    mgmt_key = settings.flower_mgmt_key
    if not mgmt_key:
        raise ValueError("FLOWER_MGMT_KEY must be set in environment variables")

    return {
        "Authorization": f"Bearer {mgmt_key}",
    }
