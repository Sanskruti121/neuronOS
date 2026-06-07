from datetime import datetime, timedelta, timezone
import httpx


class GitHubService:
    def __init__(self, access_token: str):
        self.token = access_token
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json",
        }
        self.base_url = "https://api.github.com"

    def _get(self, path: str, params: dict = None) -> dict | list:
        with httpx.Client(headers=self.headers, timeout=10) as client:
            r = client.get(f"{self.base_url}{path}", params=params)
            r.raise_for_status()
            return r.json()

    def get_recent_commits(self, days: int = 7) -> list[dict]:
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        try:
            user = self._get("/user")
            username = user["login"]
            repos = self._get("/user/repos", {"sort": "pushed", "per_page": 30})
            commits = []
            for repo in repos[:15]:
                try:
                    repo_commits = self._get(
                        f"/repos/{repo['full_name']}/commits",
                        {"author": username, "since": since, "per_page": 10},
                    )
                    for c in repo_commits:
                        commits.append({
                            "repo": repo["name"],
                            "message": c["commit"]["message"].split("\n")[0][:100],
                            "sha": c["sha"][:7],
                            "date": c["commit"]["author"]["date"],
                            "url": c["html_url"],
                        })
                except Exception:
                    continue
            commits.sort(key=lambda x: x["date"], reverse=True)
            return commits[:50]
        except Exception:
            return []

    def get_open_prs(self) -> list[dict]:
        try:
            user = self._get("/user")
            username = user["login"]
            authored = self._get("/search/issues", {
                "q": f"is:pr is:open author:{username}",
                "per_page": 20,
            })
            review_requested = self._get("/search/issues", {
                "q": f"is:pr is:open review-requested:{username}",
                "per_page": 20,
            })
            prs = []
            seen = set()
            for item in authored.get("items", []) + review_requested.get("items", []):
                if item["id"] in seen:
                    continue
                seen.add(item["id"])
                prs.append({
                    "title": item["title"],
                    "repo": item["repository_url"].split("/")[-1],
                    "state": item["state"],
                    "created_at": item["created_at"],
                    "url": item["html_url"],
                    "review_requested": item in review_requested.get("items", []),
                })
            return prs
        except Exception:
            return []

    def get_coding_stats(self, days: int = 7) -> dict:
        commits = self.get_recent_commits(days)
        repos = {c["repo"] for c in commits}
        most_active = max(set(c["repo"] for c in commits), key=lambda r: sum(1 for c in commits if c["repo"] == r)) if commits else ""
        return {
            "total_commits": len(commits),
            "repos_active": len(repos),
            "most_active_repo": most_active,
            "languages": [],
        }
