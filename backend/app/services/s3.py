import boto3
from botocore.exceptions import ClientError
from ..config import settings
import logging

logger = logging.getLogger(__name__)

def get_s3_client():
    if not settings.aws_access_key_id or not settings.aws_secret_access_key:
        logger.warning("AWS credentials not configured. S3 upload will be bypassed or fail.")
        # Return a mock client for local dev without AWS if desired, or None
        return None
        
    return boto3.client(
        's3',
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region
    )

def upload_file_to_s3(file_content: bytes, filename: str, s3_key: str) -> str:
    """Upload a file to an S3 bucket and return its URL."""
    s3_client = get_s3_client()
    if not s3_client:
        logger.warning(f"Simulating S3 upload for {s3_key}")
        return f"s3-mock://{settings.s3_bucket_name or 'local'}/{s3_key}"

    try:
        s3_client.put_object(
            Bucket=settings.s3_bucket_name,
            Key=s3_key,
            Body=file_content
        )
        url = f"https://{settings.s3_bucket_name}.s3.{settings.aws_region}.amazonaws.com/{s3_key}"
        return url
    except ClientError as e:
        logger.error(e)
        return ""

def delete_file_from_s3(s3_key: str) -> bool:
    """Delete a file from S3 bucket."""
    s3_client = get_s3_client()
    if not s3_client:
        logger.warning(f"Simulating S3 delete for {s3_key}")
        return True

    try:
        s3_client.delete_object(
            Bucket=settings.s3_bucket_name,
            Key=s3_key
        )
        return True
    except ClientError as e:
        logger.error(f"Error deleting from S3: {e}")
        return False
