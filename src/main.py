# -*- coding: utf-8 -*-

""" LinkRide - A carpooling service for schools

LinkRide tries to decrease emissions from cars at schools by helping students find students who live nearby and are
willing to share their ride.
"""

__author__ = "Zohiu"
__contact__ = "mail@zohiu.de"
__email__ = "mail@zohiu.de"
__copyright__ = "Copyright 2024, zohiu.de"
__license__ = "MIT"
__maintainer__ = "Zohiu"
__status__ = "Development"
__app_name__ = "LinkRide"
__version__ = "1.0"


from datetime import datetime, timedelta

# Built-in modules
from typing import Annotated

# Third-party modules
from fastapi import FastAPI, Depends, HTTPException, Response, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_utils.tasks import repeat_every
from starlette.responses import JSONResponse

from checks import Checks, ErrorCode
from database import Database
from models import User, BaseUser, Password, BaseDriver, Trip, Trips, Times

# Custom modules
from security import Security
from untis import Untis, UntisCache, CourseLookupCache

user_agent = f"{__app_name__}/{__version__} ({__contact__})"
school_name = "_YnMgYmFkIG9sZGVzbG9l"

# logger = logging.getLogger(__name__)

app = FastAPI(title="LinkRide")

origins = ["http://0.0.0.0:8001",
           "https://linkride.stuehrwoldt.de"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


course_lookup_cache = CourseLookupCache()
untis_cache = UntisCache()

untis = Untis(user_agent=user_agent, school_name=school_name)
checks = Checks(user_agent=user_agent, course_lookup_cache=course_lookup_cache)

db = Database(
    server="cloud.zohiu.de",
    port="27017",
    username="admin",
    password="YG9tvhNBy6hjLd4W9JfsRW8G",
    srv=False
)

tokens_expire = 30  # minutes
security = Security(
    secret_key="537b7d2f25b3aa6d2a288d1e85069a272fbd5c6bcfa1b10ff3bea16f6f87bb18",  # openssl rand -hex 32
    algorithm="HS256",
    expire_minutes=tokens_expire,
    db=db
)


async def get_times(date, course) -> Times:
    course_id = course_lookup_cache.name_to_id(course)
    date_object = datetime.strptime(date, '%Y-%m-%d').date()

    if course_id not in untis_cache.courses.keys():
        return Times(start="", end="")

    if date_object not in untis_cache.courses[course_id].keys():
        raw = untis.raw_get_data(course_id, date_object)
        lessons = untis.get_all_lessons(raw)
        day = untis.get_all_lessons_on_day(lessons, date_object)
        if len(day) <= 0:
            return Times(start="", end="")
        times = untis.get_start_and_end_time_of_day(day)
        untis_cache.courses[course_id].update({
            date_object: times,
        })
        return Times(start=times[0].strftime("%H:%M"), end=times[1].strftime("%H:%M"))

    times = untis_cache.courses[course_id][date_object]
    return Times(start=times[0].strftime("%H:%M"), end=times[1].strftime("%H:%M"))


@app.on_event("startup")
async def setup():
    db.connect()

    course_lookup_cache.all_courses = untis.get_all_courses()

    untis_cache.courses = {}
    for course in course_lookup_cache.all_courses:
        untis_cache.courses[course.course_id] = {}

    untis_cache.remaining_courses = course_lookup_cache.all_courses.copy()


@app.on_event("startup")
@repeat_every(seconds=5)   # 86400 seconds = 24 hours | 43200 = 12 hours
def periodic():
    # Remove past days from cache
    for course in course_lookup_cache.all_courses:
        for date in untis_cache.courses[course.course_id].keys():
            if date < datetime.date.today():
                untis_cache.courses[course.course_id].pop(date)


@app.get("/api", )
async def root():
    """Redirect to docs page"""
    return RedirectResponse(url="/docs")


# --------------
# Tokens
# --------------


@app.post("/api/token")
async def login(response: Response, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]) -> JSONResponse:
    """Gives you a new token to use for authentication"""
    if form_data.password is None:
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        return JSONResponse(content={"error_code": ErrorCode.PASSWORD_INCORRECT})

    verify = False
    user = await db.get_user(email=form_data.username)
    if user.success:
        password_hash = await db.get_user_password_hash(_id=user.value.id)
        verify = await security.verify_password(password=form_data.password, password_hash=password_hash.value)

    if not verify:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_state = await db.get_user_state(_id=user.value.id)
    access_token = await security.create_access_token(
        username=user.value.id, user_state=user_state.value, expires_delta=timedelta(minutes=security.expire_minutes)
    )

    response = JSONResponse(
        content={
            "access_token": access_token,
            "token_type": "bearer",
            "token_expiry": 60 * tokens_expire,
        }
    )

    response.set_cookie(
        "access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * tokens_expire,
        expires=60 * tokens_expire,
    )
    return response


@app.get("/api/authtest")
async def auth_test(current_user: Annotated[User, Depends(security.validate_token)]):
    """Test if you're authenticated"""
    return True


# --------------
# Data
# --------------

@app.get("/api/user/times")
async def user_data_times(date: str, current_user: Annotated[User, Depends(security.validate_token)]) -> Times:
    """Gives you the start and end times for a day for a user"""
    return await get_times(date, current_user.untis_course_name)


@app.get("/api/user/trips")
async def trips(date: str, current_user: Annotated[User, Depends(security.validate_token)]) -> Trips:
    """Gives you all available drivers in range of a rider"""
    user_times = await get_times(date, current_user.untis_course_name)
    possible_trips = Trips(start=[], end=[])
    drivers = (await db.get_enabled_drivers()).value

    for driver in drivers:
        if str(driver["user_id"]) == str(current_user.id):
            continue

        driver_user = (await db.get_user(driver["user_id"])).value
        latitude = driver_user.latitude
        longitude = driver_user.longitude

        if await checks.check_if_location_is_reachable(
            user_lat=current_user.latitude,
            user_long=current_user.longitude,
            driver_lat=latitude,
            driver_long=longitude,
            ellipse_width=driver["ellipse_width"],
            ellipse_length=driver["ellipse_length"],
            position=driver["ellipse_position"]
        ):
            times = await get_times(date, driver_user.untis_course_name)
            if user_times.start == times.start:
                possible_trips.start.append(Trip(
                    name=driver_user.first_name,
                    cost=driver["cost"],
                    contact=driver["contact"]
                ))

            if user_times.end == times.end:
                possible_trips.end.append(Trip(
                    name=driver_user.first_name,
                    cost=driver["cost"],
                    contact=driver["contact"]
                ))

    return possible_trips


# --------------
# User account
# --------------


@app.post("/api/user", status_code=status.HTTP_201_CREATED)
async def user_account_register(password: Password, user: BaseUser, response: Response):
    """Register a new user account - requires captcha"""
    check, location = checks.check_user(user=user, password=password.password)
    if check != ErrorCode.SUCCESS:
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        return {"error_code": check}

    password_hash = await security.hash_password(password.password)

    result = await db.register_user(
        password_hash=password_hash,
        user=user,
        location=location
    )

    if not result.success:
        response.status_code = status.HTTP_409_CONFLICT
        return {"error_code": ErrorCode.EMAIL_EXISTS}

    response.status_code = status.HTTP_201_CREATED
    return {"user_id": result.value}


@app.put("/api/user/password")
async def user_account_set_password(old_password: Password, new_password: Password,
                                    current_user: Annotated[User, Depends(security.validate_token)],
                                    response: Response):
    """Change a user password"""
    old_password, new_password = old_password.password, new_password.password

    if old_password is None or new_password is None:
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        return {"error_code": ErrorCode.INVALID_PASSWORD}

    if old_password == new_password:
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        return {"error_code": ErrorCode.PASSWORDS_ARE_THE_SAME}

    current_password_hash = await db.get_user_password_hash(current_user.id)
    pass_check = await security.verify_password(password=old_password, password_hash=current_password_hash.value)
    if not pass_check:
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        return {"error_code": ErrorCode.PASSWORD_INCORRECT}

    check = checks.check_password(new_password)
    if not check:
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        return {"error_code": check}

    hashed_password = await security.hash_password(new_password)
    result = await db.change_password(current_user.id, hashed_password)
    return {"user_id": result.value}


@app.get("/api/user")
async def user_account_get(current_user: Annotated[User, Depends(security.validate_token)]) -> User:
    """Gives you all user account settings"""
    return current_user


@app.put("/api/user")
async def user_account_change(new_user: BaseUser, current_user: Annotated[User, Depends(security.validate_token)],
                              response: Response):
    """Changes user account settings"""
    check, location = checks.check_user(user=new_user)
    if check != ErrorCode.SUCCESS:
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        return {"error_code": check}

    user_dict = dict(new_user)
    user_dict.update({"latitude": location.latitude, "longitude": location.longitude})
    result = await db.modify_user(current_user.id, user_dict)
    return {"user_id": result.value}


@app.delete("/api/user")
async def user_account_delete(current_password: Password, current_user: Annotated[User, Depends(security.validate_token)],
                              response: Response):
    """Deletes a user account"""
    print(current_password)
    if current_password.password is None:
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        return {"error_code": ErrorCode.PASSWORD_INCORRECT}

    current_password_hash = await db.get_user_password_hash(current_user.id)
    pass_check = await security.verify_password(password=current_password.password, password_hash=current_password_hash.value)

    if not pass_check:
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        return {"error_code": ErrorCode.PASSWORD_INCORRECT}

    result = await db.delete_user(_id=current_user.id)
    return {"user_id": result.value}


# --------------
# Driver account
# --------------

@app.get("/api/driver")
async def driver_account_get(current_user: Annotated[User, Depends(security.validate_token)]) -> BaseDriver:
    """Gives you all driver account settings"""
    return (await db.get_driver(current_user.id)).value


@app.put("/api/driver")
async def driver_account_change(new_driver: dict | BaseDriver, current_user: Annotated[User, Depends(security.validate_token)],
                              response: Response):
    check = checks.check_driver(driver=new_driver)
    if check != ErrorCode.SUCCESS:
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        return {"error_code": check}

    result = await db.modify_driver(current_user.id, new_driver)
    return {"user_id": result.value}


app.mount("/", StaticFiles(directory="../web", html=True), name="web")