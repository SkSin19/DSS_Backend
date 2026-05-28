from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Any

from pymongo import MongoClient

ROOT_DIR = Path(__file__).resolve().parent.parent
JSON_PATH = Path(__file__).resolve().with_name("eSSL.json")
ENV_PATH = ROOT_DIR / ".env"
DEFAULT_COLLECTION = "products"
DEFAULT_LIMIT = 20
IMAGE_WIDTH = 1200
IMAGE_HEIGHT = 900


def load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        if key and key not in os.environ:
            os.environ[key] = value


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower())
    return re.sub(r"-+", "-", slug).strip("-") or "product"


def parse_feature(feature: str) -> dict[str, str]:
    text = feature.strip()
    if not text:
        return {"title": "", "description": ""}

    for separator in (":", "=", "-"):
        if separator in text:
            title, description = text.split(separator, 1)
            title = title.strip()
            description = description.strip()
            if title and description:
                return {"title": title, "description": description}

    return {"title": text, "description": ""}


def summarize_specifications(specifications: Any) -> list[dict[str, str]]:
    if not isinstance(specifications, dict):
        return []

    rows: list[dict[str, str]] = []
    for section, values in specifications.items():
        if isinstance(values, list):
            joined_values = " | ".join(str(item).strip() for item in values if str(item).strip())
        else:
            joined_values = str(values).strip()

        if joined_values:
            rows.append({"label": str(section).strip(), "value": joined_values})

    return rows


def build_images(slug: str, index: int) -> list[dict[str, str]]:
    alt_text = f"eSSL product image for {slug}"
    return [
        {
            "url": f"https://picsum.photos/seed/essl-{index}-{slug}-{image_index}/{IMAGE_WIDTH}/{IMAGE_HEIGHT}",
            "alt": alt_text,
        }
        for image_index in range(1, 4)
    ]


def build_document(entry: dict[str, Any], index: int) -> dict[str, Any]:
    product_name = str(entry.get("product_name", "")).strip()
    brand = str(entry.get("brand", "")).strip() or "eSSL"
    category = str(entry.get("category", "")).strip() or "Security Product"
    sub_category = str(entry.get("sub_category", "")).strip()
    model_name = str(entry.get("model_name", "")).strip() or product_name
    slug_source = model_name or product_name or f"product-{index + 1}"
    slug = slugify(slug_source)
    features = [str(item).strip() for item in entry.get("features", []) if str(item).strip()]
    specifications = entry.get("specifications", {})
    images = build_images(slug, index + 1)
    summary = features[0] if features else f"{product_name or model_name} from {brand}."
    description = (
        f"{product_name or model_name} from {brand} for {sub_category or category} use. "
        f"Imported from the eSSL catalog."
    )

    return {
        "productName": product_name,
        "name": product_name or model_name,
        "modelName": model_name,
        "model": model_name or slug_source,
        "slug": slug,
        "url": f"/products/{slug}",
        "company": brand,
        "brand": brand,
        "description": description,
        "shortDescription": summary,
        "category": category,
        "subCategory": sub_category,
        "subCategories": [sub_category] if sub_category else [],
        "subCategory_1": sub_category,
        "subCategory_2": "",
        "images": images,
        "featuredImage": images[0]["url"],
        "galleryImages": [image["url"] for image in images],
        "highlights": features[:3],
        "features": [parse_feature(feature) for feature in features[:5]],
        "specs": summarize_specifications(specifications),
        "specifications": specifications,
        "applications": [],
        "benefits": [],
        "downloads": {
            "manual": "",
            "brochure": "",
            "datasheet": "",
        },
        "isFeatured": False,
        "isBestSeller": False,
        "isActive": True,
        "tags": [brand.lower(), category.lower(), slug],
        "sortOrder": index + 1,
    }


def get_database(client: MongoClient, database_name: str | None):
    if database_name:
        return client[database_name]

    try:
        return client.get_default_database()
    except Exception as exc:  # pragma: no cover - defensive fallback
        raise SystemExit(
            "Could not determine the database name. Set MONGO_DB_NAME or include a database in MONGODB_URI."
        ) from exc


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the database from the first 20 eSSL products.")
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT, help="Number of entries to seed (default: 20)")
    parser.add_argument(
        "--database",
        default=os.environ.get("MONGO_DB_NAME") or os.environ.get("DB_NAME") or "test",
        help="Database name override",
    )
    parser.add_argument("--collection", default=DEFAULT_COLLECTION, help="Collection name to write to")
    args = parser.parse_args()

    load_env_file(ENV_PATH)

    mongo_uri = os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URI")
    if not mongo_uri:
        raise SystemExit("MONGODB_URI is not configured. Add it to backend/.env before running this script.")

    if not JSON_PATH.exists():
        raise SystemExit(f"Seed file not found: {JSON_PATH}")

    with JSON_PATH.open("r", encoding="utf-8") as handle:
        raw_entries = json.load(handle)

    if not isinstance(raw_entries, list):
        raise SystemExit("eSSL.json must contain a JSON array.")

    entries = raw_entries[: max(args.limit, 0)]
    documents = [build_document(entry, index) for index, entry in enumerate(entries)]

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    database = get_database(client, args.database)
    collection = database[args.collection]

    try:
        client.admin.command("ping")
        deleted_result = collection.delete_many({})
        if documents:
            inserted_result = collection.insert_many(documents)
            inserted_count = len(inserted_result.inserted_ids)
        else:
            inserted_count = 0

        print(f"Deleted {deleted_result.deleted_count} existing products.")
        print(f"Inserted {inserted_count} eSSL products from the first {len(entries)} entries.")
    finally:
        client.close()


if __name__ == "__main__":
    main()
