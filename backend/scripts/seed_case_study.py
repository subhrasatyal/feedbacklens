"""Load the Tallyboard demo investigation and its evidence.

Creates the investigation "Several customers have requested an AI assistant.
Should we build one?" and adds every evidence file in data/case_study/ to its
specimen tray, using the running backend's API. Safe to run more than once:
if the investigation already exists, nothing is added.

Usage (with the backend running on :8000):
    cd backend && uv run python scripts/seed_case_study.py
"""

import json
import urllib.error
import urllib.request
from pathlib import Path

API_URL = "http://localhost:8000/api/investigations"
CASE_STUDY_DIR = Path(__file__).parent.parent / "data" / "case_study"

INVESTIGATION = {
    "question": "Several customers have requested an AI assistant. Should we build one?",
    "requested_by": "CEO",
    "decision_deadline": "2026-12-15",
    "what_would_change": (
        "Whether an AI assistant goes on the Q1 2027 roadmap, "
        "or that time goes to integrations and reporting instead."
    ),
}


def call_api(method, url, body=None):
    """Send a request to the backend and return the JSON answer."""
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"},
        method=method,
    )
    with urllib.request.urlopen(request) as response:
        return json.load(response)


def read_evidence_file(path):
    """Split a file into its header fields and its text.

    The header is the block between the first two '---' lines, one 'key: value' per line.
    """
    _, header, content = path.read_text().split("---\n", 2)
    fields = {}
    for line in header.strip().splitlines():
        key, value = line.split(":", 1)
        fields[key.strip()] = value.strip()
    fields["content"] = content.strip()
    return fields


def to_evidence(fields):
    """Turn a file's fields into what the API expects.

    The API has no customer or date fields, so they go at the top of the text.
    """
    context = []
    if "customer_name" in fields:
        context.append(f"Customer: {fields['customer_name']} ({fields['customer_segment']})")
    context.append(f"Date: {fields['occurred_at']}")

    return {
        "origin": fields["origin"],
        "source_type": fields["source_type"],
        "title": fields["title"],
        "content": "\n".join(context) + "\n\n" + fields["content"],
    }


def main():
    # Skip everything if the demo investigation is already loaded.
    for investigation in call_api("GET", API_URL):
        if investigation["question"] == INVESTIGATION["question"]:
            print("The Tallyboard investigation is already loaded. Nothing added.")
            print(f"Open it: http://localhost:5173/?id={investigation['id']}")
            return

    investigation = call_api("POST", API_URL, INVESTIGATION)
    print(f"created investigation: {investigation['question']}")

    # Send the files in label order, so the backend numbers them INT-01, INT-02, ...
    # just like the file names.
    files = sorted(p for p in CASE_STUDY_DIR.glob("*.md") if p.name != "README.md")
    all_fields = [read_evidence_file(path) for path in files]
    saved = call_api(
        "POST",
        f"{API_URL}/{investigation['id']}/evidence",
        [to_evidence(fields) for fields in all_fields],
    )

    for fields, item in zip(all_fields, saved):
        note = "" if item["source_label"] == fields["source_label"] else (
            f"  (expected {fields['source_label']})"
        )
        print(f"added  {item['source_label']}: {item['title']}{note}")

    print(f"\nDone: {len(saved)} pieces of evidence added.")
    print(f"Open it: http://localhost:5173/?id={investigation['id']}")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as error:
        print(f"The backend refused the request (HTTP {error.code}): {error.read().decode()}")
    except urllib.error.URLError:
        print("Could not reach the backend. Start it first:")
        print("    cd backend && uv run uvicorn app.main:app --reload")
