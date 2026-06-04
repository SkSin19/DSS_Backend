from __future__ import annotations

import os
from pathlib import Path

from pymongo import MongoClient

ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"
COLLECTION_NAME = "products"


def load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)

        if key not in os.environ:
            os.environ[key.strip()] = value.strip().strip('"').strip("'")


def main() -> None:
    load_env_file(ENV_PATH)

    mongo_uri = os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URI")

    if not mongo_uri:
        raise SystemExit("MONGODB_URI is not configured.")

    database_name = (
        os.environ.get("MONGO_DB_NAME")
        or os.environ.get("DB_NAME")
        or "test"
    )

    client = MongoClient(mongo_uri)

    try:
        db = client[database_name]
        collection = db[COLLECTION_NAME]

        result = collection.delete_many({})

        print(
            f"Deleted {result.deleted_count} products from "
            f"{database_name}.{COLLECTION_NAME}"
        )

    finally:
        client.close()


if __name__ == "__main__":
    main()