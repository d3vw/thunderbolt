"""Test the application lifespan functionality."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import pytest

from main import app, mcp_app, proxy_lifespan


# Add a simple test that doesn't require asyncio
def test_mcp_app_exists() -> None:
    """Simple test to verify that pytest discovers the test file."""
    assert mcp_app is not None
    print("test_mcp_app_exists was executed")


@pytest.mark.asyncio
async def test_proxy_lifespan() -> None:
    """Test that the proxy lifespan function works correctly."""
    # Use the proxy_lifespan context manager directly
    async with proxy_lifespan(app):
        # If we get here without an exception, the startup phase works
        assert True
    # If we get here, the shutdown phase also works
    assert True


@pytest.mark.asyncio
async def test_mcp_app_lifespan() -> None:
    """Test that the MCP app's lifespan is accessible."""
    assert hasattr(mcp_app, "lifespan"), "MCP app should have a lifespan attribute"
    assert callable(mcp_app.lifespan), "MCP app's lifespan should be callable"


@asynccontextmanager
async def mock_mcp_lifespan(app: Any) -> AsyncIterator[None]:
    """Mock MCP lifespan function."""
    yield


# Debug code to help identify if the module is being loaded
print("test_lifespan.py module was loaded")
