"""
tests/conftest.py

Shared fixtures for all test modules.
Sets PYTHONPATH so tests can import from src/ without installation.
"""
import sys
import os
import pytest

# Make src/ importable from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))


@pytest.fixture
def flask_client():
    """Returns a Flask test client with testing mode enabled."""
    # Patch env vars before importing app so APScheduler stays off
    os.environ.setdefault("ENABLE_SCHEDULER", "false")
    os.environ.setdefault("FLASK_TESTING", "true")

    import app as flask_app
    flask_app.app.config["TESTING"] = True
    flask_app.app.config["WTF_CSRF_ENABLED"] = False

    with flask_app.app.test_client() as client:
        yield client
