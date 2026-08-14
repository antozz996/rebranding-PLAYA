#!/usr/bin/env python3
import json
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
ERRORS = []
PLACEHOLDERS = ("390001112233", "390001112244", "390001112255")
FORBIDDEN_PATHS = (
    ROOT / ".venv-linux",
    FRONTEND / "backups",
    FRONTEND / "scratch",
    FRONTEND / "test_page_temp.html",
    FRONTEND / "en" / "test_page_temp.html",
    ROOT / "ftftftfftft.pdf",
)


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.local_references = []
        self.unprotected_blank_links = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"])

        if tag in {"a", "link"} and values.get("href"):
            self.local_references.append(values["href"])
        if tag in {"img", "script", "iframe", "video", "source"}:
            for key in ("src", "poster"):
                if values.get(key):
                    self.local_references.append(values[key])

        if tag == "a" and values.get("target", "").lower() == "_blank":
            rel = set(values.get("rel", "").lower().split())
            if not {"noopener", "noreferrer"}.issubset(rel):
                self.unprotected_blank_links.append(values.get("href", "(missing href)"))


def production_pages():
    for page in FRONTEND.rglob("*.html"):
        relative = page.relative_to(FRONTEND)
        if any(part in {"backups", "scratch", ".agents"} for part in relative.parts):
            continue
        if page.name == "test_page_temp.html":
            continue
        yield page


def resolve_reference(page, reference):
    parsed = urlsplit(reference)
    if parsed.scheme or parsed.netloc or reference.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None

    path = unquote(parsed.path)
    if not path:
        return None
    candidate = FRONTEND / path.lstrip("/") if path.startswith("/") else page.parent / path
    candidate = candidate.resolve()
    try:
        candidate.relative_to(FRONTEND.resolve())
    except ValueError:
        return None

    if candidate.is_dir():
        candidate = candidate / "index.html"
    return candidate


for forbidden in FORBIDDEN_PATHS:
    if forbidden.exists():
        ERRORS.append(f"Forbidden generated path is tracked/present: {forbidden.relative_to(ROOT)}")

for source_file in list(FRONTEND.rglob("*.html")) + list((ROOT / "supabase" / "functions").rglob("*.ts")):
    source_content = source_file.read_text(encoding="utf-8-sig")
    if re.search(r"@supabase/supabase-js@2(?:[\"'/]|$)", source_content):
        ERRORS.append(f"{source_file.relative_to(ROOT)}: Supabase dependency is not pinned")

for page in production_pages():
    content = page.read_text(encoding="utf-8-sig")
    relative = page.relative_to(ROOT)

    for placeholder in PLACEHOLDERS:
        if placeholder in content:
            ERRORS.append(f"{relative}: placeholder phone {placeholder}")

    if "assets/favicon.webp" in content or "../assets/favicon.webp" in content:
        ERRORS.append(f"{relative}: references missing favicon.webp")

    if "@supabase/supabase-js@2\"" in content or "@supabase/supabase-js@2'" in content:
        ERRORS.append(f"{relative}: Supabase CDN dependency is not pinned")

    parser = PageParser()
    parser.feed(content)

    for element_id, count in Counter(parser.ids).items():
        if count > 1:
            ERRORS.append(f"{relative}: duplicate id '{element_id}' ({count} occurrences)")

    for href in parser.unprotected_blank_links:
        ERRORS.append(f"{relative}: target=_blank missing noopener/noreferrer for {href}")

    for reference in parser.local_references:
        candidate = resolve_reference(page, reference)
        if candidate is not None and not candidate.exists():
            ERRORS.append(f"{relative}: missing local reference {reference}")

try:
    with (ROOT / "vercel.json").open(encoding="utf-8") as source:
        vercel = json.load(source)
    global_headers = next((item for item in vercel.get("headers", []) if item.get("source") == "/(.*)"), None)
    if not global_headers:
        ERRORS.append("vercel.json: global security headers are missing")
    else:
        names = {header.get("key", "").lower() for header in global_headers.get("headers", [])}
        required = {"content-security-policy", "x-content-type-options", "referrer-policy"}
        missing = required - names
        if missing:
            ERRORS.append(f"vercel.json: missing security headers {sorted(missing)}")
except (OSError, json.JSONDecodeError) as error:
    ERRORS.append(f"vercel.json is invalid: {error}")

if ERRORS:
    print("Repository audit failed:")
    for error in ERRORS:
        print(f" - {error}")
    sys.exit(1)

pages_count = sum(1 for _ in production_pages())
print(f"Repository audit passed for {pages_count} production HTML pages.")
