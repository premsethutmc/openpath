"""Request fingerprints, identical to the core's (fnv1a in model.ts; freeformFingerprint in freeform.ts)."""


def fnv1a(text: str) -> str:
    """FNV-1a over UTF-16 code units, as JavaScript strings are."""
    h = 0x811C9DC5
    data = text.encode("utf-16-le")
    for i in range(0, len(data), 2):
        h ^= data[i] | (data[i + 1] << 8)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def fingerprint(req: dict) -> str:
    item = req.get("task") or req.get("item")
    return f"{item['id']}@{item['version']}:{req['prompt_version']}:{fnv1a(req['response']['text'])}"
