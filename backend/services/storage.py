import mimetypes
from typing import BinaryIO

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
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
    """
    Загружает файл в S3 и возвращает публичный URL.
    Использует настройки из .env (S3_BUCKET, S3_ENDPOINT и т.д.)
    """
    s = get_settings()
    if not (s.s3_bucket and s.s3_access_key_id and s.s3_secret_access_key):
        raise HTTPException(
            status_code=400,
            detail="File uploads are disabled. Configure S3_* settings in .env",
        )
    
    # Проверяем, что используем правильный бакет
    if not s.s3_bucket:
        raise HTTPException(
            status_code=500,
            detail="S3_BUCKET is not configured in .env",
        )
    
    try:
        client = get_s3_client()
        content_type = mimetypes.guess_type(key)[0] or "application/octet-stream"
        
        # Загружаем файл в указанный бакет
        client.put_object(
            Bucket=s.s3_bucket,
            Key=key,
            Body=file_obj,
            ContentType=content_type,
            # ACL не поддерживается в Яндекс Object Storage
            # Публичный доступ настраивается через политики бакета
        )
        
        # Формируем публичный URL
        # Убеждаемся, что endpoint не имеет завершающего слеша
        base = s.s3_endpoint.rstrip("/")
        # Формат: https://storage.yandexcloud.net/bucket-name/key/path
        url = f"{base}/{s.s3_bucket}/{key}"
        
        # Проверяем, что URL сформирован правильно
        if not url.startswith("http"):
            raise HTTPException(
                status_code=500,
                detail=f"Invalid S3 URL format: {url}. Check S3_ENDPOINT in .env",
            )
        
        return url
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        error_message = e.response.get("Error", {}).get("Message", str(e))
        
        if error_code == "AccessDenied":
            raise HTTPException(
                status_code=403,
                detail=(
                    f"S3 Access Denied. Check:\n"
                    f"1. S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are correct\n"
                    f"2. Service account has 'storage.editor' or 'storage.admin' role\n"
                    f"3. Bucket '{s.s3_bucket}' exists and is accessible\n"
                    f"4. Endpoint: {s.s3_endpoint}, Region: {s.s3_region}\n"
                    f"Error: {error_message}"
                ),
            )
        elif error_code == "NoSuchBucket":
            raise HTTPException(
                status_code=404,
                detail=f"S3 bucket '{s.s3_bucket}' not found. Check S3_BUCKET in .env",
            )
        elif error_code == "InvalidAccessKeyId":
            raise HTTPException(
                status_code=401,
                detail=f"Invalid S3 credentials. Check S3_ACCESS_KEY_ID in .env",
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"S3 error ({error_code}): {error_message}",
            )


def key_from_url(url: str) -> str:
    """
    Извлекает ключ (key) из S3 URL.
    Работает с URL как от текущего, так и от старого бакета.
    Формат URL: https://storage.yandexcloud.net/bucket-name/key/path
    """
    if not url:
        return ""
    
    # Убираем протокол и домен, оставляем только путь
    # Формат: https://storage.yandexcloud.net/bucket-name/key/path
    parts = url.split("://", 1)
    if len(parts) == 2:
        path = parts[1].split("/", 1)
        if len(path) == 2:
            # path[0] - это домен (storage.yandexcloud.net)
            # path[1] - это bucket-name/key/path
            bucket_and_key = path[1]
            # Разделяем на бакет и ключ
            key_parts = bucket_and_key.split("/", 1)
            if len(key_parts) == 2:
                return key_parts[1]  # Возвращаем только ключ без бакета
    
    # Fallback: пытаемся найти ключ после имени бакета
    s = get_settings()
    # Пробуем найти ключ после текущего бакета
    if f"/{s.s3_bucket}/" in url:
        return url.split(f"/{s.s3_bucket}/", 1)[-1]
    
    # Пробуем найти ключ после любого бакета (для старых URL)
    # Формат: .../bucket-name/key/path
    if "/storage.yandexcloud.net/" in url:
        parts_after_domain = url.split("/storage.yandexcloud.net/", 1)
        if len(parts_after_domain) == 2:
            bucket_and_key = parts_after_domain[1]
            key_parts = bucket_and_key.split("/", 1)
            if len(key_parts) == 2:
                return key_parts[1]
    
    # Если ничего не помогло, возвращаем все после последнего слеша
    return url.split("/")[-1] if "/" in url else url


def get_presigned_url(key: str, expiration: int = 3600) -> str:
    """
    Генерирует presigned URL для доступа к файлу в S3.
    Используется, когда публичный доступ к бакету не настроен.
    expiration - время жизни URL в секундах (по умолчанию 1 час)
    """
    s = get_settings()
    if not (s.s3_bucket and s.s3_access_key_id and s.s3_secret_access_key):
        raise HTTPException(
            status_code=400,
            detail="File access is disabled. Configure S3_* settings in .env",
        )
    
    try:
        client = get_s3_client()
        url = client.generate_presigned_url(
            'get_object',
            Params={'Bucket': s.s3_bucket, 'Key': key},
            ExpiresIn=expiration
        )
        return url
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        error_message = e.response.get("Error", {}).get("Message", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate presigned URL ({error_code}): {error_message}",
        )


def get_public_url_or_presigned(url: str) -> str:
    """
    Возвращает presigned URL для файла, если публичный доступ не настроен.
    Если url уже является presigned URL (содержит 'X-Amz-Signature'), возвращает его как есть.
    """
    if not url:
        return url
    
    # Если это уже presigned URL, возвращаем как есть
    if 'X-Amz-Signature' in url or 'AWSAccessKeyId' in url:
        return url
    
    # Извлекаем ключ из URL
    key = key_from_url(url)
    if not key:
        return url
    
    # Генерируем presigned URL
    try:
        return get_presigned_url(key)
    except Exception:
        # Если не удалось сгенерировать presigned URL, возвращаем оригинальный URL
        return url


def delete_file_by_url(url: str) -> None:
    if not url:
        return
    s = get_settings()
    if not (s.s3_bucket and s.s3_access_key_id and s.s3_secret_access_key):
        return
    client = get_s3_client()
    key = key_from_url(url)
    client.delete_object(Bucket=s.s3_bucket, Key=key)
