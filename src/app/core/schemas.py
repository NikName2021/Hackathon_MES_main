from pydantic import BaseModel

"""Matches schema classes."""


class MatchesRequest(BaseModel):
    sport: str
    type_st: str | None = None
    time: int | None = 24
    param: int | None = 3
    draw: bool = False
