"""1688 radar worker: claim Supabase jobs, crawl public pages, write observations."""

import argparse
import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from scrapers.ali1688_provider import PlatformBlockedError, fetch_search_results
from scrapers.safety import filter_safety
from scrapers.supabase_queue import SupabaseQueueClient


async def process_one_job(client: SupabaseQueueClient, limit: int = 50) -> bool:
    job = client.claim_job()
    if not job:
        return False

    keyword = client.get_keyword(job["keyword_id"])["keyword"]
    processed = 0
    failed = 0
    try:
        products = await fetch_search_results(keyword, limit=limit)
        safe, blocked = filter_safety(products)
        failed += len(blocked)
        for index, product in enumerate(safe, start=1):
            saved = client.upsert_product(product)
            client.insert_observation({
                "product_id": saved["id"],
                "crawl_job_id": job["id"],
                "observed_at": datetime.now(timezone.utc).isoformat(),
                "keyword": keyword,
                "search_rank": index,
                "price": product.get("price"),
                "minimum_order": product.get("specs", {}).get("minimum_order") if isinstance(product.get("specs"), dict) else None,
                "supplier_signals": product.get("supplier_signals", {}),
                "raw_metrics": product.get("raw_metrics", {}),
            })
            processed += 1
        client.complete_job(job["id"], processed, failed)
        print(f"[worker] completed job={job['id']} keyword={keyword} processed={processed} failed={failed}")
    except PlatformBlockedError as exc:
        client.complete_job(job["id"], processed, failed + 1, str(exc))
        print(f"[worker] platform blocked job={job['id']} keyword={keyword}: {exc}")
    except Exception as exc:
        client.complete_job(job["id"], processed, failed + 1, str(exc))
        print(f"[worker] failed job={job['id']} keyword={keyword}: {exc}")
    return True


async def run_worker(args) -> None:
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    client = SupabaseQueueClient(url, key, worker_name=args.worker_name)
    try:
        while True:
            did_work = await process_one_job(client, limit=args.limit)
            if args.once:
                break
            if not did_work:
                await asyncio.sleep(args.poll_seconds)
    finally:
        client.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="1688 hot product radar worker")
    parser.add_argument("--worker-name", default=os.getenv("WORKER_NAME", "scraper-worker"))
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--poll-seconds", type=int, default=30)
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    asyncio.run(run_worker(args))


if __name__ == "__main__":
    main()
