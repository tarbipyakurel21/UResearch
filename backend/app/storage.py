from io import BytesIO

import boto3

from .config import get_settings


def client():
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=settings.s3_secret_access_key,
        region_name="us-east-1",
    )


def put_object(key: str, content: bytes, content_type: str) -> None:
    settings = get_settings()
    client().put_object(
        Bucket=settings.s3_bucket, Key=key, Body=BytesIO(content), ContentType=content_type
    )
