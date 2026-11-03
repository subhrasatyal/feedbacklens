"""The one place that creates the Claude client."""

from functools import cache

import anthropic

from app.config import ANTHROPIC_API_KEY

MODEL = "claude-opus-5-5"


class AgentError(Exception):
    """The agent couldn't finish. The message is safe to show the PM."""


class AgentNotConfigured(AgentError):
    """There is no Anthropic API key, so the agent can't run at all."""


@cache  # create the client once and reuse it
def get_client() -> anthropic.Anthropic:
    if not ANTHROPIC_API_KEY:
        raise AgentNotConfigured(
            "The agent isn't set up: add ANTHROPIC_API_KEY to backend/.env and restart the backend."
        )
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
