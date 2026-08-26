from __future__ import annotations

"""
Remove all product entries of a single brand from MongoDB.

Usage:
    python RemoveProductsOf.py --brand "Bose Professional"
    python RemoveProductsOf.py --brand "JBL Professional" --dry-run
    python RemoveProductsOf.py --brand eSSL --yes

By default the script prints how many products match and asks for
confirmation before deleting. Use --dry-run to only preview, or --yes to
skip the confirmation prompt (useful in CI / re-seed pipelines).

Matching is case-insensitive and checks BOTH the `brand` and `company`
fields, since the seeder writes the brand name to both.
"""

import argparse
import os
import re
from pathlib import Path

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


def build_brand_filter(brand: str) -> dict:
    """Case-insensitive, exact-string match on brand OR company."""
    exact = re.compile(f"^{re.escape(brand.strip())}$", re.IGNORECASE)

    return {"$or": [{"brand": exact}, {"company": exact}]}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Remove all products of a specific brand from MongoDB.",
    )

    parser.add_argument(
        "--brand",
        required=True,
        help='Brand to remove, e.g. "Bose Professional" or "JBL Professional".',
    )

    parser.add_argument(
        "--database",
        default=os.environ.get("MONGO_DB_NAME")
        or os.environ.get("DB_NAME")
        or "test",
        help="Database name.",
    )

    parser.add_argument(
        "--collection",
        default=DEFAULT_COLLECTION,
        help="Collection name.",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only show what would be deleted; make no changes.",
    )

    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip the confirmation prompt and delete immediately.",
    )

    args = parser.parse_args()

    load_env_file(ENV_PATH)

    mongo_uri = os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URI")

    if not mongo_uri:
        raise SystemExit("MONGODB_URI is not configured.")

    brand = args.brand.strip()

    if not brand:
        raise SystemExit("--brand cannot be empty.")

    query = build_brand_filter(brand)

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)

    try:
        client.admin.command("ping")

        collection = client[args.database][args.collection]

        match_count = collection.count_documents(query)

        location = f"{args.database}.{args.collection}"

        if match_count == 0:
            print(f'No products found for brand "{brand}" in {location}.')
            return

        # Show a short sample so the user can confirm the match is correct.
        sample = list(
            collection.find(query, {"_id": 0, "name": 1, "model": 1}).limit(10)
        )

        print(f'Found {match_count} product(s) for brand "{brand}" in {location}:')

        for item in sample:
            name = item.get("name", "(no name)")
            model = item.get("model", "")
            print(f"  - {name} [{model}]" if model else f"  - {name}")

        if match_count > len(sample):
            print(f"  ... and {match_count - len(sample)} more")

        if args.dry_run:
            print("\nDry run: no products were deleted.")
            return

        if not args.yes:
            answer = input(
                f'\nDelete these {match_count} product(s)? Type "yes" to confirm: '
            ).strip().lower()

            if answer not in ("y", "yes"):
                print("Aborted. No products were deleted.")
                return

        result = collection.delete_many(query)

        print(f'Deleted {result.deleted_count} product(s) for brand "{brand}" from {location}.')

    finally:
        client.close()


if __name__ == "__main__":
    main()
