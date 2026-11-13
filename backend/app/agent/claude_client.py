"""The one place that creates the Claude client and makes structured calls."""

from functools import cache
from typing import TypeVar

import anthropic
from pydantic import BaseModel

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


Answer = TypeVar("Answer", bound=BaseModel)


def ask_structured(
    system: str, prompt: str, answer_shape: type[Answer], effort: str = "high"
) -> tuple[Answer, str]:
    """One Claude call whose answer must match `answer_shape` (structured output).

    Returns the parsed answer and the model that wrote it. Any failure becomes an
    AgentError with a short message the PM can read.
    """
    client = get_client()
    try:
        message = client.beta.messages.parse(
            model=MODEL,
            max_tokens=16000,
            system=system,
            messages=[{"role": "user", "content": prompt}],
            output_format=answer_shape,
            output_config={"effort": effort},
            # If a safety check declines the request, the API retries it on a recommended fallback model.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except anthropic.AuthenticationError as error:
        raise AgentError("The Anthropic API key in backend/.env was rejected. Check it and restart.") from error
    except anthropic.RateLimitError as error:
        raise AgentError("The agent is rate-limited right now. Wait a minute and re-run.") from error
    except anthropic.APIConnectionError as error:
        raise AgentError("Couldn't reach the Anthropic API. Check your internet connection.") from error
    except anthropic.APIStatusError as error:
        # Show the API's own one-line explanation (e.g. "credit balance is too low"), not the raw response.
        body = error.body if isinstance(error.body, dict) else {}
        detail = body.get("error", {}).get("message") or error.message
        raise AgentError(f"The Anthropic API returned an error ({error.status_code}): {detail}") from error

    if message.stop_reason == "refusal":
        raise AgentError("The agent declined this request.")
    if message.stop_reason == "max_tokens":
        raise AgentError("The agent's answer was cut off before it finished. Please re-run.")
    if message.parsed_output is None:
        raise AgentError("The agent's answer wasn't in the expected format. Please re-run.")
    return message.parsed_output, message.model


def evidence_text(evidence: list[dict]) -> str:
    """The evidence as tagged blocks the model can cite by label."""
    parts = []
    for item in evidence:
        kind = item["source_type_other"] or item["source_type"]
        parts.append(
            f'<evidence label="{item["source_label"]}" type="{kind}" '
            f'source="{item["origin"] or "unknown"}" title="{item["title"]}">\n'
            f"{item['content']}\n</evidence>"
        )
    return "\n\n".join(parts)
