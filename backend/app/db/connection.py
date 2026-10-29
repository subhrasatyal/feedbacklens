"""Database connection handed to each request."""

import psycopg
from psycopg.rows import dict_row

from app.config import DATABASE_URL


def get_conn():
    """FastAPI dependency: open a connection, give it to the endpoint, then close it.

    Leaving the `with` block commits if the request succeeded, or rolls back if it failed.
    """
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        yield conn
