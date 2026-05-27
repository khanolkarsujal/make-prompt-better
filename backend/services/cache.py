import collections
import time
import hashlib
from typing import Any

class ExpiringLRUCache:
    """Cache with LRU eviction and per‑item TTL.
    
    * maxsize – maximum number of entries.
    * ttl_seconds – time‑to‑live for each entry.
    """
    def __init__(self, maxsize: int = 128, ttl_seconds: int = 300):
        self._store: collections.OrderedDict[str, tuple[float, Any]] = collections.OrderedDict()
        self.maxsize = maxsize
        self.ttl = ttl_seconds

    def _now(self) -> float:
        return time.time()

    def _evict(self):
        # Evict expired items first
        now = self._now()
        keys_to_delete = [k for k, (ts, _) in self._store.items() if now - ts > self.ttl]
        for k in keys_to_delete:
            del self._store[k]
        # Then enforce size limit
        while len(self._store) > self.maxsize:
            self._store.popitem(last=False)

    def set(self, key: str, value: Any) -> None:
        now = self._now()
        self._store[key] = (now, value)
        self._store.move_to_end(key)
        self._evict()

    def get(self, key: str) -> Any | None:
        entry = self._store.get(key)
        if not entry:
            return None
        ts, val = entry
        if self._now() - ts > self.ttl:
            del self._store[key]
            return None
        # Refresh order
        self._store.move_to_end(key)
        return val

    @staticmethod
    def sha256_key(prompt: str, selections: dict) -> str:
        """Deterministic SHA‑256 key based on prompt and selections.
        Selections are JSON‑sorted for stability.
        """
        import json
        raw = prompt + json.dumps(selections, sort_keys=True)
        return hashlib.sha256(raw.encode('utf-8')).hexdigest()
