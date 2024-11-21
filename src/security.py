# -*- coding: utf-8 -*-

""" LinkRide - Security

Class for password and access token stuff
"""

# Built-in modules
from typing import Annotated
from datetime import datetime, timedelta, timezone

# Third-party modules
from fastapi import Depends, HTTPException, status, Cookie
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
import jwt

# Custom modules
from database import Database


class Security:
    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

    def __init__(self, secret_key: str, algorithm: str, expire_minutes: int, db: Database):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.expire_minutes = expire_minutes
        self.db = db
        self.context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    async def hash_password(self, password: str):
        return self.context.hash(password)

    async def verify_password(self, password: str, password_hash: str):
        return self.context.verify(password, password_hash)

    async def create_access_token(self, username: str, user_state: str, expires_delta: timedelta | None):
        expire = datetime.now(timezone.utc) + expires_delta
        data = {"sub": username, "exp": expire, "uid": user_state}
        token = jwt.encode(data, self.secret_key, algorithm=self.algorithm)
        return token

    # async def validate_token(self, token: Annotated[str, Depends(oauth2_scheme)]): Annotated[str | None, Cookie()]
    async def validate_token(self, access_token: Annotated[str | None, Cookie()]):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(access_token, self.secret_key, algorithms=[self.algorithm])
            _id: str = payload.get("sub")
            if _id is None:
                raise credentials_exception

            user_state = await self.db.get_user_state(_id=_id)
            if payload.get("uid") != user_state.value:
                raise credentials_exception

        except jwt.PyJWTError:
            raise credentials_exception

        result = await self.db.get_user(_id=_id)
        if not result.success:
            raise credentials_exception
        return result.value
