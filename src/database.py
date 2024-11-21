# -*- coding: utf-8 -*-

""" LinkRide - Database connection

A class specifically optimized for database handling within LinkRide.
"""

# Built-in modules
from dataclasses import dataclass
from uuid import uuid4

import geopy
# Third-party modules
from pymongo import MongoClient
from pymongo.collection import Collection
from bson.objectid import ObjectId

# Custom modules
from models import User, BaseUser, BaseDriver


@dataclass
class ReturnValue:
    success: bool
    value: str | User | None | list


class Database:
    def __init__(self, server, port, username, password, srv):
        self.connection_string = f"mongodb{'+srv' if srv else ''}://{username}:{password}@{server}:{port}/"
        self.client, self.database, self.users, self.drivers, self.riders = None, None, None, None, None

    def connect(self):
        self.client = MongoClient(self.connection_string)
        self.database = self.client.get_database("linkride")
        self.users: Collection = self.database.get_collection("users")
        self.drivers: Collection = self.database.get_collection("drivers")
        self.riders: Collection = self.database.get_collection("riders")

    async def register_user(self, password_hash: str, user: BaseUser, location: geopy.Location) -> ReturnValue:
        for _ in self.users.find({"email": user.email}, {"email": 1}):
            return ReturnValue(success=False, value=None)

        account = {
            "password_hash": password_hash,
            "user_state": str(uuid4()),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "untis_course_name": user.untis_course_name,
            "postal_code": user.postal_code,
            "town": user.town,
            "street_and_house": user.street_and_house,
            "latitude": location.latitude,
            "longitude": location.longitude
        }

        result = self.users.insert_one(account)
        await self.create_driver_account(result.inserted_id, user.email)
        return ReturnValue(success=True, value=str(result.inserted_id))

    async def create_driver_account(self, user_id, email):
        account = {
            "user_id": user_id,
            "enabled": False,
            "cost": 0,
            "contact": email,
            "ellipse_width": 50,
            "ellipse_length": 100,
            "ellipse_position": 50,
        }

        result = self.drivers.insert_one(account)
        return ReturnValue(success=True, value=str(result.inserted_id))

    async def modify_user(self, _id: str, new_user: BaseUser | dict):
        new_user_dict = dict(new_user)
        self.users.update_one({"_id": ObjectId(_id)}, {"$set": new_user_dict})
        return ReturnValue(success=True, value=_id)

    async def change_password(self, _id, new_hashed_password):
        to_do = {"$set": {"password_hash": new_hashed_password, "user_state": str(uuid4())}}
        self.users.update_one({"_id": ObjectId(_id)}, to_do)
        return ReturnValue(success=True, value=_id)

    async def get_user(self, _id: str = None, email: str = None) -> ReturnValue:
        for user in self.users.find({"_id": ObjectId(_id)} if _id is not None else {"email": email}):
            value = User.parse_obj(user)
            value.id = str(user["_id"])
            return ReturnValue(success=True, value=value)

        return ReturnValue(success=False, value=None)

    async def get_user_password_hash(self, _id: str) -> ReturnValue:
        for user in self.users.find({"_id": ObjectId(_id)}, {"password_hash": 1}):
            return ReturnValue(success=True, value=user["password_hash"])

        return ReturnValue(success=False, value=None)

    async def get_user_state(self, _id: str):
        for user in self.users.find({"_id": ObjectId(_id)}, {"user_state": 1}):
            return ReturnValue(success=True, value=user["user_state"])

        return ReturnValue(success=False, value=None)

    async def delete_user(self, _id: str):
        for driver in self.drivers.find({"user_id": ObjectId(_id)}):
            self.drivers.delete_one(driver)

        self.users.delete_one({"_id": ObjectId(_id)})
        return ReturnValue(success=True, value=_id)

    async def get_driver(self, user_id: str) -> ReturnValue:
        for driver in self.drivers.find({"user_id": ObjectId(user_id)}):
            value = BaseDriver.parse_obj(driver)
            return ReturnValue(success=True, value=value)

        return ReturnValue(success=False, value=None)

    async def modify_driver(self, user_id: str, new_driver: BaseDriver | dict):
        new_driver_dict = dict(new_driver)
        possible_values = dict(BaseDriver()).keys()
        for key in new_driver_dict.keys():
            if key not in possible_values:
                return ReturnValue(success=False, value=None)

        for driver in self.drivers.find({"user_id": ObjectId(user_id)}):
            self.drivers.update_one({"_id": driver["_id"]}, {"$set": new_driver_dict})
            return ReturnValue(success=True, value=user_id)

        return ReturnValue(success=False, value=None)

    async def get_enabled_drivers(self) -> ReturnValue:
        drivers = []
        for driver in self.drivers.find({"enabled": True}):
            drivers.append(driver)

        return ReturnValue(success=True, value=drivers)
