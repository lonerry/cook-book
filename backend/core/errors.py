from enum import Enum
from typing import Dict, Tuple

from fastapi import HTTPException, status


class ErrorCode(str, Enum):
    EMAIL_EXISTS = "EMAIL_EXISTS"
    USER_NOT_FOUND = "USER_NOT_FOUND"
    INVALID_CODE = "INVALID_CODE"
    INCORRECT_CREDENTIALS = "INCORRECT_CREDENTIALS"
    EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED"
    INVALID_INGREDIENTS_JSON = "INVALID_INGREDIENTS_JSON"
    INVALID_IMAGE_TYPE = "INVALID_IMAGE_TYPE"
    RECIPE_NOT_FOUND = "RECIPE_NOT_FOUND"
    COMMENT_NOT_FOUND = "COMMENT_NOT_FOUND"
    NOT_AUTHENTICATED = "NOT_AUTHENTICATED"
    INVALID_TOKEN = "INVALID_TOKEN"
    FORBIDDEN = "FORBIDDEN"


ERRORS: Dict[ErrorCode, Tuple[int, str]] = {
    ErrorCode.EMAIL_EXISTS: (status.HTTP_400_BAD_REQUEST, "Email already registered"),
    ErrorCode.USER_NOT_FOUND: (status.HTTP_404_NOT_FOUND, "User not found"),
    ErrorCode.INVALID_CODE: (status.HTTP_400_BAD_REQUEST, "Invalid or expired code"),
    ErrorCode.INCORRECT_CREDENTIALS: (
        status.HTTP_400_BAD_REQUEST,
        "Incorrect email or password",
    ),
    ErrorCode.EMAIL_NOT_VERIFIED: (status.HTTP_403_FORBIDDEN, "Email not verified"),
    ErrorCode.INVALID_INGREDIENTS_JSON: (
        status.HTTP_400_BAD_REQUEST,
        "Invalid ingredients JSON",
    ),
    ErrorCode.INVALID_IMAGE_TYPE: (status.HTTP_400_BAD_REQUEST, "Invalid image type"),
    ErrorCode.RECIPE_NOT_FOUND: (status.HTTP_404_NOT_FOUND, "Recipe not found"),
    ErrorCode.COMMENT_NOT_FOUND: (status.HTTP_404_NOT_FOUND, "Comment not found"),
    ErrorCode.NOT_AUTHENTICATED: (status.HTTP_401_UNAUTHORIZED, "Not authenticated"),
    ErrorCode.INVALID_TOKEN: (status.HTTP_401_UNAUTHORIZED, "Invalid token"),
    ErrorCode.FORBIDDEN: (status.HTTP_403_FORBIDDEN, "Forbidden"),
}


def http_error(code: ErrorCode, message: str | None = None) -> HTTPException:
    status_code, default_message = ERRORS[code]
    return HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message or default_message},
    )
