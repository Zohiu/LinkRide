# -*- coding: utf-8 -*-

""" LinkRide - Models

It's like classes that replace dictionaries here.
"""

from pydantic import BaseModel


class BaseUser(BaseModel):
    email: str
    first_name: str
    last_name: str
    untis_course_name: str
    postal_code: str
    town: str
    street_and_house: str


class User(BaseUser):
    id: str = None
    latitude: float
    longitude: float


class Password(BaseModel):
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class BaseDriver(BaseModel):
    enabled: bool = False
    cost: float = 0
    contact: str = ""
    ellipse_width: int = 0
    ellipse_length: int = 0
    ellipse_position: int = 0


class Trip(BaseModel):
    name: str
    cost: int
    contact: str


class Trips(BaseModel):
    start: list[Trip]
    end: list[Trip]


class Times(BaseModel):
    start: str
    end: str
