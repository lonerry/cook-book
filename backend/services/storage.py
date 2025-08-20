import mimetypes
from typing import BinaryIO

import boto3
from botocore.config import Config
from fastapi import HTTPException

from backend.core.config import get_settings


def get_s3_client():
    s = get_settings()
    if not (s.s3_bucket and s.s3_access_key_id and s.s3_secret_access_key):
        raise HTTPException(
            status_code=400,
            detail="File uploads are disabled. Configure S3_* settings in .env",
        )
    return boto3.client(
        "s3",
        endpoint_url=s.s3_endpoint or None,
        region_name=s.s3_region,
        aws_access_key_id=s.s3_access_key_id,
        aws_secret_access_key=s.s3_secret_access_key,
        config=Config(s3={"addressing_style": "path"}, signature_version="s3v4"),
    )


def upload_public_file(file_obj: BinaryIO, key: str) -> str:
    s = get_settings()
    if not (s.s3_bucket and s.s3_access_key_id and s.s3_secret_access_key):
        raise HTTPException(
            status_code=400,
            detail="File uploads are disabled. Configure S3_* settings in .env",
        )
    client = get_s3_client()
    content_type = mimetypes.guess_type(key)[0] or "application/octet-stream"
    client.put_object(
        Bucket=s.s3_bucket,
        Key=key,
        Body=file_obj,
        ContentType=content_type,
        ACL="public-read",
    )
    base = s.s3_endpoint.rstrip("/")
    return f"{base}/{s.s3_bucket}/{key}"


def key_from_url(url: str) -> str:
    s = get_settings()
    prefix = s.s3_endpoint.rstrip("/") + "/" + s.s3_bucket + "/"
    if url.startswith(prefix):
        return url[len(prefix) :]
    return url.split("/" + s.s3_bucket + "/", 1)[-1]


def delete_file_by_url(url: str) -> None:
    if not url:
        return
    s = get_settings()
    if not (s.s3_bucket and s.s3_access_key_id and s.s3_secret_access_key):
        return
    client = get_s3_client()
    key = key_from_url(url)
    client.delete_object(Bucket=s.s3_bucket, Key=key)
