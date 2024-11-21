# -*- coding: utf-8 -*-

""" LinkRide - Untis API functions

A collection of functions specifically optimized for using the Untis API within LinkRide.
"""


# Built-in modules
from datetime import datetime, date, time, timedelta
from enum import Enum
from dataclasses import dataclass
from typing import Dict

# Third-party modules
import httpx


# --------------
# Classes
# --------------


class ElementType(Enum):
    COURSE = 1
    SUBJECT = 3
    ROOM = 4


@dataclass
class Lesson:
    date: date
    start_time: time
    end_time: time
    subject: str
    room: str


@dataclass
class Course:
    course_id: int
    course_name: str


@dataclass
class RawRequestData:
    json: dict
    course_id: int
    requested_date: date
    week_date: date


# --------------
# Cache helpers
# --------------


class CourseLookupCache:
    def __init__(self):
        self.all_courses: list[Course] | None = None

    def name_to_id(self, _name):
        for course in self.all_courses:
            if course.course_name == _name:
                return course.course_id
        return False


@dataclass
class UntisCache:
    courses: Dict[int, Dict[date, tuple[time, time]]] = None
    remaining_courses: list[Course] = None


class Untis:
    def __init__(self, user_agent, school_name):
        self.headers = {
            "User-Agent": f"{user_agent}"
        }
        self.cookies = {
            "schoolname": f'"{school_name}"'
        }

    # --------------
    # Courses
    # --------------

    def raw_get_courses(self) -> dict:
        """This is not meant to be used directly. Use get_all_courses() instead."""
        r = httpx.get(
            url="https://hepta.webuntis.com/WebUntis/api/public/timetable/weekly/pageconfig?type=1&id=2264&date=2024-02"
                "-12&formatId=4&isMyTimetableSelected=false",
            cookies=self.cookies,
            headers=self.headers
        )
        return r.json()

    def get_all_courses(self) -> list[Course]:
        """Returns a list of all courses of the current school"""
        raw_courses = self.raw_get_courses()
        courses = []
        for course in raw_courses["data"]["elements"]:
            courses.append(
                Course(
                    course_id=course["id"],
                    course_name=course["name"]
                )
            )
        return courses

    # --------------
    # Data
    # --------------

    def raw_get_data(self, for_course_id: int, for_date: date) -> RawRequestData:
        """Returns the RawRequestData which is just the request's json with some extra values added to it"""
        week_start = Untis.get_week_start(for_date)
        r = httpx.get(
            url=f"https://hepta.webuntis.com/WebUntis/api/public/timetable/weekly/data?elementType=1"
                f"&elementId={for_course_id}&date={week_start.strftime('%Y-%m-%d')}&formatId=4",
            cookies=self.cookies,
            headers=self.headers
        )
        return RawRequestData(
            json=r.json(),
            course_id=for_course_id,
            requested_date=for_date,
            week_date=week_start
        )

    @staticmethod
    def get_all_lessons(raw: RawRequestData) -> list[Lesson]:
        """Uses RawRequestData to get a list of all Lessons with all the required info"""
        json_data: dict = raw.json
        for_course_id: int = raw.course_id

        periods = json_data["data"]["result"]["data"]["elementPeriods"][str(for_course_id)]

        elements_lookup = {}
        for element in json_data["data"]["result"]["data"]["elements"]:
            _id = element["id"]
            elements_lookup[_id] = element

        lessons = []

        for period in periods:
            period_date = Untis.get_date_from_untisdate(period["date"])
            start_time: time = Untis.get_time_from_untistime(period["startTime"])
            end_time: time = Untis.get_time_from_untistime(period["endTime"])

            subject = False
            room = False

            for element in period["elements"]:
                element_id = element["id"]

                if element["type"] == ElementType.SUBJECT.value:
                    subject = elements_lookup[element_id]["name"]

                elif element["type"] == ElementType.ROOM.value:
                    room = elements_lookup[element_id]["name"]

                if room and subject:
                    break

            # I get that this is bad, might optimize later
            # The order can be random. It's really annoying.
            for lesson in lessons:
                if lesson.end_time == start_time:
                    lesson.end_time = end_time
                    break

                elif lesson.start_time == end_time:
                    lesson.start_time = start_time
                    break
            else:
                lessons.append(
                    Lesson(
                        date=period_date,
                        start_time=start_time,
                        end_time=end_time,
                        subject=subject,
                        room=room
                    )
                )

        lessons.sort(key=lambda _lesson: _lesson.start_time)
        lessons.sort(key=lambda _lesson: _lesson.date)
        return lessons

    # --------------
    # Utility
    # --------------

    @staticmethod
    def get_week_start(_date: date) -> date:
        """Untis requests need you to specify the first day of the week"""
        week = _date - timedelta(days=_date.weekday())
        return week

    @staticmethod
    def get_date_from_untisdate(_untisdate: int) -> date:
        """Untis uses Integers to save dates, so this converts them to a date object"""
        return datetime.strptime(str(_untisdate), '%Y%m%d').date()

    @staticmethod
    def get_time_from_untistime(_untis_time: int) -> time:
        """Untis uses Integers to save time, so this converts them to a time object"""
        return datetime.strptime(str(_untis_time).zfill(4), '%H%M').time()

    @staticmethod
    def get_all_lessons_on_day(lessons: list[Lesson], day: date):
        """Removes all lessons that don't match the day from the list"""
        day_lessons = [lesson for lesson in lessons if lesson.date == day]
        return day_lessons

    @staticmethod
    def get_start_and_end_time_of_day(lessons: list[Lesson]):
        """This assumes that the list of lessons only contains one day and is sorted correctly"""
        return lessons[0].start_time, lessons[-1].end_time