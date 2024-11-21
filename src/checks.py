# -*- coding: utf-8 -*-

# Built-in modules
from enum import Enum
import re

import geopy

# Third-party modules
import numpy as np
from validate_email import validate_email
from geopy.geocoders import Photon

# Custom modules
from models import BaseUser, BaseDriver


class ErrorCode(Enum):
    SUCCESS = -1
    EMAIL_EXISTS = 0
    COURSE_NOT_FOUND = 1
    INVALID_EMAIL = 2
    INVALID_PASSWORD = 3
    INVALID_FIRST_NAME = 4
    INVALID_LAST_NAME = 5
    INVALID_ADDRESS = 6
    PASSWORD_INCORRECT = 7
    PASSWORDS_ARE_THE_SAME = 8

    INVALID_WIDTH = 9
    INVALID_LENGTH = 10
    INVALID_POSITION = 11
    INVALID_COST = 12
    INVALID_CONTACT = 13


class Checks:
    """https://stackoverflow.com/a/43111707
    min length is 6 and max length is 20
    at least 1 number, at least 1 uppercase and 1 lowercase letter
    at least 1 special character"""
    password_regex = re.compile(r'^(?=\S{6,20}$)(?=.*?\d)(?=.*?[a-z])(?=.*?[A-Z])(?=.*?[^A-Za-z\s0-9])')
    school_latitude = 53.8088002
    school_longitude = 10.3978350

    def __init__(self, user_agent, course_lookup_cache):
        self.geolocator = Photon(user_agent=user_agent)
        self.course_lookup_cache = course_lookup_cache

    def check_user(self, user: BaseUser, password: str = None) -> (ErrorCode, geopy.Location):
        if not self.course_lookup_cache.name_to_id(user.untis_course_name):
            return ErrorCode.COURSE_NOT_FOUND, None

        if not self.check_email(email=user.email):
            return ErrorCode.INVALID_EMAIL, None

        if password is not None and not self.check_password(password=password):
            return ErrorCode.INVALID_PASSWORD, None

        if not self.check_name(name=user.first_name):
            return ErrorCode.INVALID_FIRST_NAME, None

        if not self.check_name(name=user.last_name):
            return ErrorCode.INVALID_LAST_NAME, None

        loc = self.check_address(postal_code=user.postal_code, town=user.town, street_and_house=user.street_and_house)
        if not loc:
            return ErrorCode.INVALID_ADDRESS, None

        return ErrorCode.SUCCESS, loc

    @staticmethod
    def check_driver(driver: dict) -> ErrorCode:
        if "ellipse_width" in driver.keys() and (driver["ellipse_width"] < 0 or driver["ellipse_width"] > 100):
            return ErrorCode.INVALID_WIDTH

        if "ellipse_length" in driver.keys() and (driver["ellipse_length"] < 0 or driver["ellipse_length"] > 150):
            return ErrorCode.INVALID_LENGTH

        if "ellipse_position" in driver.keys() and (driver["ellipse_position"] < 0 or driver["ellipse_position"] > 100):
            return ErrorCode.INVALID_POSITION

        if "cost" in driver.keys() and driver["cost"] < 0:
            return ErrorCode.INVALID_COST

        if "contact" in driver.keys() and (len(driver["contact"]) < 5 or len(driver["contact"]) > 25):
            return ErrorCode.INVALID_CONTACT

        return ErrorCode.SUCCESS

    def check_location(self, lat: float, long: float, driver):
        pass

    @staticmethod
    def check_email(email: str):
        return validate_email(
            email_address=email,
            check_format=True,
            check_blacklist=True,
            check_dns=True,
            check_smtp=True,
        )

    @staticmethod
    def check_password(password):
        return True if Checks.password_regex.match(password) else False

    @staticmethod
    def check_name(name):
        return True if 2 <= len(name) <= 25 else False

    def check_address(self, postal_code: str, town: str, street_and_house: str):
        location = self.geolocator.geocode(f"{street_and_house}, {postal_code} {town}")
        return location

    async def check_if_location_is_reachable(self, user_lat, user_long, driver_lat, driver_long, ellipse_width,
                                             ellipse_length, position):
        school_pos = (self.school_longitude, self.school_latitude)
        driver_pos = (driver_long, driver_lat)

        dx = school_pos[0] - driver_pos[0]
        dy = school_pos[1] - driver_pos[1]

        rel_position = 1 - (position / 100)
        ellipse_pos = (school_pos[0] - (dx * rel_position), school_pos[1] - (dy * rel_position))

        angle = (np.arctan(dy / dx) * (180 / np.pi))

        distance = np.sqrt(dy ** 2 + dx ** 2)

        length = (ellipse_length / 100) * distance
        width = (ellipse_width / 100) * distance

        # User
        x = np.array([user_long], dtype=float)
        y = np.array([user_lat], dtype=float)

        cos_angle = np.cos(np.radians(180. - angle))
        sin_angle = np.sin(np.radians(180. - angle))

        xc = x - ellipse_pos[0]
        yc = y - ellipse_pos[1]

        xct = xc * cos_angle - yc * sin_angle
        yct = xc * sin_angle + yc * cos_angle

        rad_cc = (xct ** 2 / (length / 2.) ** 2) + (yct ** 2 / (width / 2.) ** 2)

        return True if len(np.where(rad_cc <= 1.01)[0]) > 0 else False


