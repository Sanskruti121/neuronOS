import json
import time
from openai import OpenAI
from app.config import settings


def _get_client() -> tuple[OpenAI, str]:
    """Returns (client, model). Uses Groq if available, else OpenAI."""
    if settings.GROQ_API_KEY:
        return OpenAI(
            api_key=settings.GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1",
        ), "llama-3.1-8b-instant"
    return OpenAI(api_key=settings.OPENAI_API_KEY), "gpt-4o-mini"


class AIService:
    def __init__(self):
        self.client, self.model = _get_client()

    def _call_with_retry(self, **kwargs) -> object:
        for attempt in range(3):
            try:
                return self.client.chat.completions.create(**kwargs)
            except Exception as e:
                if attempt == 2:
                    raise
                time.sleep(2 ** attempt)

    def summarize_email(self, email: dict) -> dict:
        prompt = f"""Analyze this email and respond with JSON only.

Subject: {email.get('subject', '')}
From: {email.get('sender', '')}
Body: {email.get('body_text', '')[:2000]}

Respond with this exact JSON structure:
{{
  "summary": "2-3 sentence summary of the email",
  "priority_score": <integer 0-100>,
  "priority_reason": "why this score",
  "action_required": <true or false>
}}

Priority scoring:
- 80-100: urgent response needed today
- 60-79: important, respond within 24h
- 40-59: normal, respond within a week
- 0-39: low priority, FYI only

Return ONLY the JSON object, nothing else."""

        response = self._call_with_retry(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        text = response.choices[0].message.content.strip()
        # Extract JSON if wrapped in markdown
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)

    def extract_tasks_from_email(self, email: dict) -> list[dict]:
        prompt = f"""Extract action items from this email. Respond with JSON only.

Subject: {email.get('subject', '')}
From: {email.get('sender', '')}
Body: {email.get('body_text', '')[:2000]}

Respond with this exact JSON structure:
{{
  "tasks": [
    {{
      "title": "clear action item title",
      "description": "details from the email",
      "priority": "low|medium|high|urgent",
      "due_date": "YYYY-MM-DD or null",
      "confidence": <float 0.0-1.0>
    }}
  ]
}}

Only include tasks with confidence > 0.7. Return empty tasks array if no real action items found.
Return ONLY the JSON object, nothing else."""

        response = self._call_with_retry(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        text = response.choices[0].message.content.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text)
        tasks = data.get("tasks", [])
        return [t for t in tasks if t.get("confidence", 0) > 0.7]

    def generate_daily_digest(self, emails: list, tasks: list, github_activity: dict) -> str:
        urgent_emails = [e for e in emails if (e.get("priority_score") or 0) >= 80]
        open_tasks = [t for t in tasks if t.get("status") != "done"]
        prs = github_activity.get("open_prs", [])

        prompt = f"""Generate a personalized morning briefing for a developer. Be concise (3-5 sentences).

Email stats: {len(emails)} total, {len(urgent_emails)} urgent
Open tasks: {len(open_tasks)}
GitHub PRs waiting: {len(prs)}
Top urgent email subjects: {[e.get('subject', '') for e in urgent_emails[:3]]}

Write a natural, human-like morning briefing. Start with "Good morning!" """

        response = self._call_with_retry(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        return response.choices[0].message.content

    def draft_reply(self, original_email: dict, user_name: str, user_context: str = "") -> str:
        prompt = f"""Draft a professional email reply on behalf of {user_name}.

Original email:
From: {original_email.get('sender', '')}
Subject: {original_email.get('subject', '')}
Body: {original_email.get('body_text', '')[:1500]}

User context: {user_context or 'No additional context provided.'}

Write a complete, professional email reply. Sign it as {user_name}.
Be specific and reference details from the original email. Do not use placeholder brackets like [Insert X]."""

        response = self._call_with_retry(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
        )
        return response.choices[0].message.content

    def run_command(self, query: str, context: dict) -> dict:
        emails_context = "\n".join([
            f"- [{e.get('priority_score', 0)}] {e.get('subject', '')} from {e.get('sender', '')}"
            for e in context.get("emails", [])[:10]
        ])
        tasks_context = "\n".join([
            f"- [{t.get('priority', '')}] {t.get('title', '')} ({t.get('status', '')})"
            for t in context.get("tasks", [])[:10]
        ])
        github_context = f"Recent commits: {context.get('github', {}).get('total_commits', 0)}, Open PRs: {len(context.get('github', {}).get('open_prs', []))}"

        system_prompt = f"""You are NeuronOS, an AI assistant with access to the user's email, tasks, and GitHub activity.

Current emails (priority score, subject, sender):
{emails_context or 'No emails loaded'}

Current tasks:
{tasks_context or 'No tasks'}

GitHub activity:
{github_context}

Answer the user's question helpfully and concisely. Reference specific items when relevant."""

        response = self._call_with_retry(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query},
            ],
            temperature=0.5,
        )
        answer = response.choices[0].message.content
        sources = []
        if context.get("emails"):
            sources.append(f"{len(context['emails'])} emails")
        if context.get("tasks"):
            sources.append(f"{len(context['tasks'])} tasks")
        if context.get("github"):
            sources.append("GitHub activity")
        return {"response": answer, "sources": sources, "actions": []}
