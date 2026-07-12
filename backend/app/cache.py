from __future__ import annotations

from collections import OrderedDict
from typing import Generic, TypeVar

T = TypeVar("T")


class LruCache(Generic[T]):
    def __init__(self, capacity: int = 128) -> None:
        self.capacity = capacity
        self._items: OrderedDict[str, T] = OrderedDict()

    def get(self, key: str) -> T | None:
        value = self._items.get(key)
        if value is not None:
            self._items.move_to_end(key)
        return value

    def put(self, key: str, value: T) -> None:
        self._items[key] = value
        self._items.move_to_end(key)
        if len(self._items) > self.capacity:
            self._items.popitem(last=False)
