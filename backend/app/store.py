"""Data access for Mittu AI's own Firestore named database ("mittuai" in colorjoy-app).

Documents are addressed by slash paths ("users/abc", "users/abc/conversations/c1").
`MemoryStore` behaves the same way for local runs and tests, so nothing else in the app knows
which one is in use.
"""
from __future__ import annotations

import copy
import threading
import time
import uuid
from datetime import datetime
from typing import Any, Callable
from zoneinfo import ZoneInfo

from . import settings


def now_ms() -> int:
    return int(time.time() * 1000)


def today_ist() -> str:
    return datetime.now(ZoneInfo("Asia/Kolkata")).date().isoformat()


def new_id() -> str:
    return uuid.uuid4().hex[:20]


class Store:
    def get(self, path: str) -> dict | None: ...
    def set(self, path: str, data: dict, merge: bool = False) -> None: ...
    def delete(self, path: str) -> None: ...
    def delete_tree(self, path: str) -> None: ...
    def list(self, collection: str, order_by: str | None = None, desc: bool = False,
             limit: int | None = None, where: tuple[str, Any] | None = None) -> list[tuple[str, dict]]: ...
    def update_atomic(self, path: str, fn: Callable[[dict | None], dict | None]) -> dict | None:
        """Read-modify-write in a transaction. `fn` gets the current doc (or None) and returns the new doc
        (or None to leave it unchanged). Returns what `fn` returned."""
        ...


def _deep_merge(base: dict, update: dict) -> dict:
    out = dict(base)
    for k, v in update.items():
        out[k] = _deep_merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


class MemoryStore(Store):
    def __init__(self) -> None:
        self.docs: dict[str, dict] = {}
        self.lock = threading.RLock()

    def get(self, path):
        with self.lock:
            d = self.docs.get(path)
            return copy.deepcopy(d) if d is not None else None

    def set(self, path, data, merge=False):
        with self.lock:
            cur = self.docs.get(path)
            self.docs[path] = _deep_merge(cur, data) if merge and cur else copy.deepcopy(data)

    def delete(self, path):
        with self.lock:
            self.docs.pop(path, None)

    def delete_tree(self, path):
        with self.lock:
            for p in [p for p in self.docs if p == path or p.startswith(path + "/")]:
                del self.docs[p]

    def list(self, collection, order_by=None, desc=False, limit=None, where=None):
        depth = collection.count("/") + 1
        with self.lock:
            rows = [(p.rsplit("/", 1)[1], copy.deepcopy(d)) for p, d in self.docs.items()
                    if p.startswith(collection + "/") and p.count("/") == depth]
        if where:
            rows = [r for r in rows if r[1].get(where[0]) == where[1]]
        if order_by:
            rows.sort(key=lambda r: r[1].get(order_by) or 0, reverse=desc)
        return rows[:limit] if limit else rows

    def update_atomic(self, path, fn):
        with self.lock:
            result = fn(self.get(path))
            if result is not None:
                self.docs[path] = copy.deepcopy(result)
            return result


class FirestoreStore(Store):
    def __init__(self) -> None:
        from google.cloud import firestore  # imported lazily so tests don't need credentials
        self._fs = firestore
        self.db = firestore.Client(project=settings.GCP_PROJECT, database=settings.FIRESTORE_DATABASE)

    def get(self, path):
        snap = self.db.document(path).get()
        return snap.to_dict() if snap.exists else None

    def set(self, path, data, merge=False):
        self.db.document(path).set(data, merge=merge)

    def delete(self, path):
        self.db.document(path).delete()

    def delete_tree(self, path):
        self.db.recursive_delete(self.db.document(path))

    def list(self, collection, order_by=None, desc=False, limit=None, where=None):
        q = self.db.collection(collection)
        if where:
            q = q.where(filter=self._fs.FieldFilter(where[0], "==", where[1]))
        if order_by:
            q = q.order_by(order_by, direction=self._fs.Query.DESCENDING if desc else self._fs.Query.ASCENDING)
        if limit:
            q = q.limit(limit)
        return [(s.id, s.to_dict()) for s in q.stream()]

    def update_atomic(self, path, fn):
        ref = self.db.document(path)
        transaction = self.db.transaction()

        @self._fs.transactional
        def run(tx):
            snap = ref.get(transaction=tx)
            result = fn(snap.to_dict() if snap.exists else None)
            if result is not None:
                tx.set(ref, result)
            return result

        return run(transaction)


_store: Store | None = None


def store() -> Store:
    global _store
    if _store is None:
        _store = MemoryStore() if settings.STORE == "memory" else FirestoreStore()
    return _store


def reset_memory_store() -> None:
    """Tests only."""
    global _store
    _store = MemoryStore()
