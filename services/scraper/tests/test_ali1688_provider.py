import unittest
from pathlib import Path

from scrapers.ali1688_provider import PlatformBlockedError, extract_offer_id, parse_search_results


FIXTURES = Path(__file__).parent / "fixtures"


class Ali1688ProviderTests(unittest.TestCase):
    def test_parse_search_results(self):
        html = (FIXTURES / "1688_search.html").read_text(encoding="utf-8")
        products = parse_search_results(html, "手机支架", limit=1)

        self.assertEqual(len(products), 1)
        self.assertEqual(products[0]["external_id"], "10001")
        self.assertEqual(products[0]["radar_state"], "candidate")
        self.assertEqual(products[0]["price"], 12.5)

    def test_blocked_page_raises(self):
        html = (FIXTURES / "1688_blocked.html").read_text(encoding="utf-8")
        with self.assertRaises(PlatformBlockedError):
            parse_search_results(html, "手机支架")

    def test_extract_offer_id(self):
        self.assertEqual(extract_offer_id("https://detail.1688.com/offer/12345.html"), "12345")


if __name__ == "__main__":
    unittest.main()
