import anthropic
from anthropic import Anthropic
import logging
from app.config import settings


logger = logging.getLogger(__name__)

SYSTEM_SUMMARIZE = """You are an expert meeting summariser. Given a transcript, produce a concise but comprehensive summary that includes:

1. **Key Points** – The most important topics and findings discussed.
2. **Action Items** – Specific tasks, commitments, or follow-ups mentioned (who should do what and when if known).
3. **Decisions** – Any decisions made during the conversation.

Be clear and structured. Use bullet points. Respond only with the summary — do not add preamble or apology."""


SYSTEM_CHAT = """You are a helpful assistant answering questions about a meeting transcript.
You have access to the full transcript of the meeting. Answer questions based solely on the transcript.
If the answer is not in the transcript, say so. Be concise but thorough."""


def _client() -> Anthropic:
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set")
    return Anthropic(api_key=settings.anthropic_api_key)


def _get_text(response) -> str:
    """Extract text from a Claude message, skipping thinking blocks."""
    for block in response.content:
        if block.type == "text":
            return block.text
    return ""


def summarize_transcript(transcript: str) -> str:
    """Send the transcript to Claude Sonnet 4 and return a structured summary."""
    client = _client()
    message = client.messages.create(
        model="claude-sonnet-4-7-6-202611",
        max_tokens=1024,
        system=SYSTEM_SUMMARIZE,
        messages=[
            {
                "role": "user",
                "content": f"Please summarize the following transcript:\n\n{transcript}",
            }
        ],
    )
    return _get_text(message)


def chat_about_transcript(
    transcript: str,
    user_message: str,
    history: list[dict],
) -> str:
    """
    Answer a user question about the transcript using Claude Sonnet 4.

    Args:
        transcript:   The full meeting transcript.
        user_message: The new question to answer.
        history:      List of prior turns as dicts with keys "role" and "content".
    """
    client = _client()

    # Build the conversation: transcript as a system-anchored user message,
    # then replay history, then the new question.
    messages = [
        {"role": "user", "content": f"Here is the meeting transcript:\n\n{transcript}"}
    ]
    # Insert a blank turn to separate transcript from history so Claude
    # doesn't confuse context
    messages.append(
        {
            "role": "user",
            "content": "The transcript above is the meeting we are discussing. Feel free to ask me anything about it.",
        }
    )
    for turn in history:
        role = turn.get("role", "user")
        messages.append({"role": role, "content": turn["content"]})
    messages.append({"role": "user", "content": user_message})

    message = client.messages.create(
        model="claude-sonnet-4-7-6-202611",
        max_tokens=1024,
        system=SYSTEM_CHAT,
        messages=messages,  # type: ignore[arg-type]
    )
    return _get_text(message)