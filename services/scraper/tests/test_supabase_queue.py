import json
import unittest

import httpx

from scrapers.supabase_queue import SupabaseQueueClient


class SupabaseQueueTests(unittest.TestCase):
    def test_claim_job_uses_rpc(self):
        requests = []

        def handler(request):
            requests.append(request)
            return httpx.Response(200, json=[{"id": "job-1", "keyword_id": "kw-1"}])

        client = SupabaseQueueClient("https://example.supabase.co", "secret", transport=httpx.MockTransport(handler))
        try:
            job = client.claim_job()
        finally:
            client.close()

        self.assertEqual(job["id"], "job-1")
        self.assertEqual(requests[0].url.path, "/rest/v1/rpc/claim_crawl_job")

    def test_upsert_product_sends_external_id_conflict(self):
        captured = {}

        def handler(request):
            captured["url"] = str(request.url)
            captured["body"] = json.loads(request.content.decode("utf-8"))
            return httpx.Response(200, json=[{"id": "product-1", "external_id": "10001"}])

        client = SupabaseQueueClient("https://example.supabase.co", "secret", transport=httpx.MockTransport(handler))
        try:
            product = client.upsert_product({"external_id": "10001", "name": "折叠支架"})
        finally:
            client.close()

        self.assertEqual(product["id"], "product-1")
        self.assertIn("on_conflict=external_id", captured["url"])
        self.assertEqual(captured["body"][0]["external_id"], "10001")


if __name__ == "__main__":
    unittest.main()
