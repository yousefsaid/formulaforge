from app.cache import LruCache


def test_get_returns_none_for_missing_key() -> None:
    cache: LruCache[str] = LruCache()
    assert cache.get("missing") is None


def test_put_then_get_returns_value() -> None:
    cache: LruCache[str] = LruCache()
    cache.put("a", "value-a")
    assert cache.get("a") == "value-a"


def test_evicts_least_recently_used_when_over_capacity() -> None:
    cache: LruCache[str] = LruCache(capacity=2)
    cache.put("a", "1")
    cache.put("b", "2")
    cache.put("c", "3")
    assert cache.get("a") is None
    assert cache.get("b") == "2"
    assert cache.get("c") == "3"


def test_get_refreshes_recency_to_avoid_eviction() -> None:
    cache: LruCache[str] = LruCache(capacity=2)
    cache.put("a", "1")
    cache.put("b", "2")
    cache.get("a")  # a is now more recently used than b
    cache.put("c", "3")
    assert cache.get("a") == "1"
    assert cache.get("b") is None
    assert cache.get("c") == "3"
