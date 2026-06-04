from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Any

from pymongo import MongoClient

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
DEFAULT_COLLECTION = "products"


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
                return {
                    "title": title,
                    "description": description,
                }

    return {
        "title": text,
        "description": "",
    }


def summarize_specifications(specifications: Any) -> list[dict[str, str]]:
    if not isinstance(specifications, dict):
        return []

    rows: list[dict[str, str]] = []

    for section, values in specifications.items():
        if isinstance(values, list):
            joined_values = " | ".join(
                str(item).strip()
                for item in values
                if str(item).strip()
            )
        else:
            joined_values = str(values).strip()

        if joined_values:
            rows.append(
                {
                    "label": str(section).strip(),
                    "value": joined_values,
                }
            )

    return rows


def build_images(entry: dict[str, Any]) -> list[dict[str, str]]:
    image_url = str(entry.get("image_url", "")).strip()

    if not image_url:
        return []

    return [
        {
            "url": image_url,
            "alt": f"{entry.get('brand', '')} {entry.get('product_name', '')}",
        }
    ]


def build_document(entry: dict[str, Any], index: int) -> dict[str, Any]:
    product_name = str(entry.get("product_name", "")).strip()

    brand = str(entry.get("brand", "")).strip()
    category = str(entry.get("category", "")).strip()
    sub_category = str(entry.get("sub_category", "")).strip()

    model_name = (
        str(entry.get("model_name", "")).strip()
        or product_name
    )

    slug_source = model_name or product_name
    slug = slugify(slug_source)

    features = [
        str(item).strip()
        for item in entry.get("features", [])
        if str(item).strip()
    ]

    specifications = entry.get("specifications", {})
    images = build_images(entry)

    image_url = str(entry.get("image_url", "")).strip()

    summary = (
        features[0]
        if features
        else f"{product_name} from {brand}"
    )

    description = (
        f"{product_name} from {brand} "
        f"for {sub_category or category} use."
    )

    return {
        "productName": product_name,
        "name": product_name,
        "modelName": model_name,
        "model": model_name,

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

        "image_url": image_url,
        "images": images,
        "featuredImage": image_url,
        "galleryImages": [img["url"] for img in images],

        "highlights": features[:3],

        "features": [
            parse_feature(feature)
            for feature in features[:5]
        ],

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

        "tags": [
            brand.lower(),
            category.lower(),
            slug,
        ],

        "sortOrder": index + 1,
    }


def get_database(
    client: MongoClient,
    database_name: str | None,
):
    if database_name:
        return client[database_name]

    return client.get_default_database()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed products into MongoDB"
    )

    parser.add_argument(
        "--file",
        required=True,
        help="Path to JSON file",
    )

    parser.add_argument(
        "--database",
        default=os.environ.get("MONGO_DB_NAME")
        or os.environ.get("DB_NAME")
        or "test",
        help="Database name",
    )

    parser.add_argument(
        "--collection",
        default=DEFAULT_COLLECTION,
        help="Collection name",
    )

    args = parser.parse_args()

    load_env_file(ENV_PATH)

    mongo_uri = (
        os.environ.get("MONGODB_URI")
        or os.environ.get("MONGO_URI")
    )

    if not mongo_uri:
        raise SystemExit(
            "MONGODB_URI is not configured."
        )

    json_path = Path(args.file)

    if not json_path.exists():
        raise SystemExit(
            f"JSON file not found: {json_path}"
        )

    with json_path.open(
        "r",
        encoding="utf-8",
    ) as handle:
        raw_entries = json.load(handle)

    if not isinstance(raw_entries, list):
        raise SystemExit(
            "JSON must contain an array."
        )

    documents = [
        build_document(entry, index)
        for index, entry in enumerate(raw_entries)
    ]

    client = MongoClient(
        mongo_uri,
        serverSelectionTimeoutMS=5000,
    )

    try:
        client.admin.command("ping")

        database = get_database(
            client,
            args.database,
        )

        collection = database[
            args.collection
        ]

        inserted = 0
        updated = 0

        for doc in documents:
            result = collection.update_one(
                {
                    "model": doc["model"]
                },
                {
                    "$set": doc
                },
                upsert=True,
            )

            if result.upserted_id:
                inserted += 1
            else:
                updated += 1

        print(
            f"Inserted: {inserted}"
        )

        print(
            f"Updated: {updated}"
        )

        print(
            f"Processed: {len(documents)}"
        )

    finally:
        client.close()


if __name__ == "__main__":
    main()