"""Test Flower AI proxy functionality."""

from typing import Any
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from config import Settings
from main import app


@pytest.fixture
def client() -> TestClient:
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def mock_settings() -> Settings:
    """Mock settings with Flower configuration."""
    settings = Settings(
        flower_mgmt_key="test_mgmt_key",
        flower_proj_id="test_proj_id",
        fireworks_api_key="test_api_key",
    )
    return settings


def test_flower_proxy_options_request(client: TestClient) -> None:
    """Test that OPTIONS requests to Flower proxy return 200."""
    response = client.options("/flower/v1/encryption/public-key")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@patch("main.get_settings")
def test_flower_api_key_endpoint(
    mock_get_settings: Any, client: TestClient, mock_settings: Settings
) -> None:
    """Test the Flower API key endpoint."""
    mock_get_settings.return_value = mock_settings

    # Mock the flower_auth.get_flower_api_key function
    with patch("main.get_flower_api_key") as mock_get_api_key:
        mock_get_api_key.return_value = "LOL_OOPS"

        response = client.post("/flower/api-key")

        assert response.status_code == 200
        assert response.json() == {"api_key": "LOL_OOPS"}

        # Verify the function was called with expected parameters
        mock_get_api_key.assert_called_once()
        call_args = mock_get_api_key.call_args[0]
        assert isinstance(call_args[0], str)  # user_id_hash


def test_flower_proxy_public_endpoint(
    client: TestClient, mock_settings: Settings
) -> None:
    """Test that public endpoints don't require authentication."""
    # Create a simple test to verify endpoint structure
    with patch("main.get_settings") as mock_get_settings:
        mock_get_settings.return_value = Settings(flower_mgmt_key="", flower_proj_id="")

        # Just verify the endpoint exists and handles missing config properly
        response = client.get("/flower/v1/encryption/server-public-key")
        assert response.status_code == 404  # Should fail because proxy not configured


def test_flower_proxy_authenticated_endpoint(
    client: TestClient, mock_settings: Settings
) -> None:
    """Test that authenticated endpoints require configuration."""
    # Create a simple test to verify endpoint structure
    with patch("main.get_settings") as mock_get_settings:
        mock_get_settings.return_value = Settings(flower_mgmt_key="", flower_proj_id="")

        # Just verify the endpoint exists and handles missing config properly
        response = client.post(
            "/flower/v1/chat/completions",
            json={
                "model": "test-model",
                "messages": [{"role": "user", "content": "Hi"}],
            },
        )
        assert response.status_code == 404  # Should fail because proxy not configured


def test_flower_proxy_no_config(client: TestClient) -> None:
    """Test Flower proxy when not configured."""
    with patch("main.get_settings") as mock_get_settings:
        mock_get_settings.return_value = Settings(flower_mgmt_key="", flower_proj_id="")

        response = client.post("/flower/api-key")

        assert response.status_code == 503
        assert response.json()["detail"] == "Flower AI not configured"


def test_flower_proxy_api_key_error(client: TestClient) -> None:
    """Test Flower proxy when API key generation fails."""
    with patch("main.get_settings") as mock_get_settings:
        mock_get_settings.return_value = Settings(
            flower_mgmt_key="test_key", flower_proj_id="test_id"
        )

        with patch("main.get_flower_api_key") as mock_get_api_key:
            mock_get_api_key.side_effect = Exception("API key error")

            response = client.post("/flower/api-key")

            assert response.status_code == 500
            assert "Failed to get Flower API key" in response.json()["detail"]
