import logging
import datetime

from flask import Response
import sqlalchemy
from sqlalchemy import MetaData, Table, Column, String, select, JSON, Numeric, Date, text, DateTime


# // Depending on which database you are using, you'll set some variables differently.
# // In this code we are inserting only one field with one value.
# // Feel free to change the insert statement as needed for your own table's requirements.
#
# // Uncomment and set the following variables depending on your specific instance and database:
class Sqlhandler:
    def __init__(self):
        self.connection_name = "influencer-272204:us-central1:influencersql"#"gcf"
        self.table_name = "authentication"
        self.table_field = ""
        self.table_field_value = ""
        self.db_name = "auth"
        self.db_user = "gcf"
        self.db_password = "967Shoreline"

        # // If your database is MySQL, uncomment the following two lines:
        # driver_name = 'mysql+pymysql'
        # query_string = '"unix_socket": "/cloudsql/{}".format(connection_name)'
        # #
        # // If your database is PostgreSQL, uncomment the following two lines:
        self.driver_name = 'postgres+pg8000'
        # self.query_string = '"unix_sock": "/cloudsql/{}/.s.PGSQL.5432".format(gcf)'
        self.logger = logging.getLogger()

        # [START cloud_sql_postgres_sqlalchemy_create]
        # The SQLAlchemy engine will help manage interactions, including automatically
        # managing a pool of connections to your database
        self.db = sqlalchemy.create_engine(
            # Equivalent URL:
            # postgres+pg8000://<db_user>:<db_pass>@/<db_name>?unix_sock=/cloudsql/<cloud_sql_instance_name>/.s.PGSQL.5432
            sqlalchemy.engine.url.URL(
                drivername='postgres+pg8000',
                username=self.db_user,
                password=self.db_password,
                database=self.db_name,
                query={'unix_sock': '/cloudsql/{}/.s.PGSQL.5432'.format(self.connection_name)}
            ),
            # ... Specify additional properties here.
            # [START_EXCLUDE]

            # [START cloud_sql_postgres_sqlalchemy_limit]
            # Pool size is the maximum number of permanent connections to keep.
            pool_size=5,
            # Temporarily exceeds the set pool_size if no connections are available.
            max_overflow=2,
            # The total number of concurrent connections for your application will be
            # a total of pool_size and max_overflow.
            # [END cloud_sql_postgres_sqlalchemy_limit]

            # [START cloud_sql_postgres_sqlalchemy_backoff]
            # SQLAlchemy automatically uses delays between failed connection attempts,
            # but provides no arguments for configuration.
            # [END cloud_sql_postgres_sqlalchemy_backoff]

            # [START cloud_sql_postgres_sqlalchemy_timeout]
            # 'pool_timeout' is the maximum number of seconds to wait when retrieving a
            # new connection from the pool. After the specified amount of time, an
            # exception will be thrown.
            pool_timeout=30,  # 30 seconds
            # [END cloud_sql_postgres_sqlalchemy_timeout]

            # [START cloud_sql_postgres_sqlalchemy_lifetime]
            # 'pool_recycle' is the maximum number of seconds a connection can persist.
            # Connections that live longer than the specified amount of time will be
            # reestablished
            pool_recycle=1800,  # 30 minutes
            # [END cloud_sql_postgres_sqlalchemy_lifetime]

            # [END_EXCLUDE]
        )
        # [END cloud_sql_postgres_sqlalchemy_create]
        self.create_tables()

    def create_tables(self):
        self.MODASH_PROFILE = Table(
                'modash_profile', MetaData(),
                Column('account_id', String, primary_key=True),
                Column('platform', String, primary_key=True),
                Column('profile_json', JSON),
                Column('timestamp', DateTime),
            )



        # Create tables (if they don't already exist)
        with self.db.connect() as conn:
            conn.execute(
            """
            CREATE TABLE IF NOT EXISTS modash_profile(
                account_id text, 
                platform text, 
                profile_json json, 
                timestamp timestamp,
                PRIMARY KEY (account_id, platform)
            );
            """
            )

    def save_profile(self, account_id, platform, profile_json):
        try:
            # # Using a with statement ensures that the connection is always released
            # # back into the pool at the end of statement (even if an error occurs)
            with self.db.connect() as conn:
                from sqlalchemy.dialects.postgresql import insert
                insert_stmt = insert(self.MODASH_PROFILE).values(
                    account_id=account_id,
                    platform=platform,
                    profile_json=profile_json,
                    timestamp=datetime.datetime.now()
                )
                do_update_stmt = insert_stmt.on_conflict_do_update(
                    index_elements=['account_id', 'platform'],
                    set_=dict(
                        profile_json=profile_json,
                        timestamp=datetime.datetime.now()
                    )
                )
                conn.execute(do_update_stmt)
        except Exception as e:
            # If something goes wrong, handle the error in this section. This might
            # involve retrying or adjusting parameters depending on the situation.
            # [START_EXCLUDE]
            self.logger.exception(e)
            return False
        return True

    def get_profile(self, account_id, platform='instagram'):
        """
        :param account_id: account id for each platform
        :param platform: currently only support instagram
        :return: pair: success, profile_json. If found, success will be True; if not, will be False.
        """
        try:
            # # Using a with statement ensures that the connection is always released
            # # back into the pool at the end of statement (even if an error occurs)
            with self.db.connect() as conn:
                stmt = text(
                """
                SELECT profile_json, timestamp 
                FROM modash_profile 
                WHERE account_id = :account_id and platform = :platform
                """)
                stmt = stmt.bindparams(account_id=account_id, platform=platform)
                result = conn.execute(stmt, {"account_id": account_id, "platform": platform}).fetchall()
                if len(result) == 0:
                    logging.info(f'No profile cache found for account {account_id} on {platform}')
                    return {}, None
                logging.info(f'the cached profile result is {result[0]}')
                return result[0][0], result[0][1]
        except Exception as e:
            self.logger.exception(e)
            return {}, None


sql_handler = Sqlhandler()
