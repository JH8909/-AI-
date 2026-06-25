"""Supabase REST/RPC client for the scraper worker."""

from typing import Any

import httpx


class SupabaseQueueClient:
    def __init__(self, url: str, service_role_key: str, worker_name: str = "scraper-worker", transport=None):
        self.base_url = url.rstrip("/")
        self.worker_name = worker_name
        self.client = httpx.Client(
            base_url=f"{self.base_url}/rest/v1",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
                "Content-Type": "application/json",
            },
            timeout=30,
            transport=transport,
        )

    def close(self) -> None:
        self.client.close()

    def claim_job(self) -> dict[str, Any] | None:
        res = self.client.post("/rpc/claim_crawl_job", json={"worker_name": self.worker_name})
        res.raise_for_status()
        data = res.json()
        return data[0] if data else None

    def get_keyword(self, keyword_id: str) -> dict[str, Any]:
        res = self.client.get("/monitor_keywords", params={"id": f"eq.{keyword_id}", "select": "*"})
        res.raise_for_status()
        rows = res.json()
        if not rows:
            raise RuntimeError(f"keyword not found: {keyword_id}")
        return rows[0]

    def upsert_product(self, product: dict[str, Any]) -> dict[str, Any]:
        res = self.client.post(
            "/products",
            params={"on_conflict": "external_id", "select": "*"},
            headers={"Prefer": "resolution=merge-duplicates,return=representation"},
            json=[product],
        )
        res.raise_for_status()
        rows = res.json()
        return rows[0]

    def insert_observation(self, observation: dict[str, Any]) -> None:
        res = self.client.post("/product_observations", headers={"Prefer": "return=minimal"}, json=observation)
        res.raise_for_status()

    def complete_job(self, job_id: str, processed_count: int, failed_count: int = 0, error: str | None = None) -> None:
        status = "failed" if error else "succeeded"
        payload = {
            "status": status,
            "processed_count": processed_count,
            "failed_count": failed_count,
            "completed_at": "now()",
            "error": error,
        }
        res = self.client.patch("/crawl_jobs", params={"id": f"eq.{job_id}"}, headers={"Prefer": "return=minimal"}, json=payload)
        res.raise_for_status()
