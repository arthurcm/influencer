import logging
import hashlib
import time

from flask import Response
import sqlalchemy
from sqlalchemy import MetaData, Table, Column, String, select, JSON


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
        self.track_visit = Table(
                'track_visit', MetaData(),
                Column('shop', String, primary_key=True),
                Column('lifo_tracker_id', String),
                Column('discount_code', String),
                Column('location', JSON),
                Column('user_agent', String),
                Column('referrer', String),
            )

        self.order_complete = Table(
                'order_complete', MetaData(),
                Column('shop', String, primary_key=True),
                Column('order_id', String, primary_key=True),
                Column('customer_id', String, primary_key=True),
                Column('lifo_tracker_id', String),
                Column('discount_code', String),
                Column('location', JSON),
                Column('user_agent', String),
                Column('referrer', String),
                Column('order_data', JSON),
            )

        self.orders_paid = Table(
                'orders_paid', MetaData(),
                Column('shop', String, primary_key=True),
                Column('order_id', String, primary_key=True),
                Column('customer_id', String, primary_key=True),
                Column('order_data', JSON),
            )

        self.lifo_tracker_id = Table(
                'lifo_tracker_id', MetaData(),
                Column('lifo_tracker_id', String, primary_key=True),
                Column('customer_id', String),
            )

        # Create tables (if they don't already exist)
        with self.db.connect() as conn:
            conn.execute(
            """
            CREATE TABLE IF NOT EXISTS track_visit(
                shop text, 
                lifo_tracker_id text, 
                discount_code text, 
                location json, 
                user_agent text,
                referrer text, 
                PRIMARY KEY (shop, lifo_tracker_id)
            );
            """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS order_complete(
                    shop text, 
                    order_id text,
                    customer_id text,
                    lifo_tracker_id text, 
                    discount_code text, 
                    location json, 
                    user_agent text,
                    referrer text, 
                    order_data json,
                    PRIMARY KEY (shop, order_id, customer_id)
                );
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS orders_paid(
                    shop text, 
                    order_id text,
                    customer_id text,
                    order_data json,
                    PRIMARY KEY (shop, order_id, customer_id)
                );
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS lifo_tracker_id(
                    lifo_tracker_id text,
                    customer_id text,
                    PRIMARY KEY (lifo_tracker_id)
                );
                """
            )

    def save_track_visit(self, data):
        try:
            # # Using a with statement ensures that the connection is always released
            # # back into the pool at the end of statement (even if an error occurs)
            with self.db.connect() as conn:
                from sqlalchemy.dialects.postgresql import insert
                insert_stmt = insert(self.track_visit).values(
                    shop=data.get('shop'),
                    lifo_tracker_id=data.get('lifo_tracker_id'),
                    discount_code=data.get('discount_code'),
                    location=data.get('location'),
                    user_agent=data.get('user_agent'),
                    referrer=data.get('referrer')
                )
                do_update_stmt = insert_stmt.on_conflict_do_update(
                    index_elements=['shop', 'lifo_tracker_id'],
                    set_=dict(
                        lifo_tracker_id=data.get('lifo_tracker_id'),
                        discount_code=data.get('discount_code'),
                        location=data.get('location'),
                        user_agent=data.get('user_agent'),
                        referrer=data.get('referrer')
                    )
                )
                conn.execute(do_update_stmt)
        except Exception as e:
            # If something goes wrong, handle the error in this section. This might
            # involve retrying or adjusting parameters depending on the situation.
            # [START_EXCLUDE]
            self.logger.exception(e)
            return Response(
                status=500,
                response=f"Unable to update track_visit: {e}"
            )
        return Response(
            status=200,
            response="Successfully updated track_visit table"
        )

    def save_order_complete(self, data):
        try:
            # # Using a with statement ensures that the connection is always released
            # # back into the pool at the end of statement (even if an error occurs)
            with self.db.connect() as conn:
                from sqlalchemy.dialects.postgresql import insert
                insert_stmt = insert(self.order_complete).values(
                    shop=data.get('shop'),
                    customer_id=str(data.get('customer_id')),
                    order_id=str(data.get('order_id')),
                    lifo_tracker_id=data.get('lifo_tracker_id'),
                    discount_code=data.get('discount_code'),
                    location=data.get('location'),
                    user_agent=data.get('user_agent'),
                    referrer=data.get('referrer'),
                    order_data=data.get('order_data')
                )
                do_update_stmt = insert_stmt.on_conflict_do_update(
                    index_elements=['shop', 'customer_id', 'order_id'],
                    set_=dict(
                        lifo_tracker_id=data.get('lifo_tracker_id'),
                        discount_code=data.get('discount_code'),
                        location=data.get('location'),
                        user_agent=data.get('user_agent'),
                        referrer=data.get('referrer'),
                        order_data=data.get('order_data')
                    )
                )
                conn.execute(do_update_stmt)
        except Exception as e:
            # If something goes wrong, handle the error in this section. This might
            # involve retrying or adjusting parameters depending on the situation.
            # [START_EXCLUDE]
            self.logger.exception(e)
            return Response(
                status=500,
                response=f"Unable to update order_complete: {e}"
            )
        return Response(
            status=200,
            response="Successfully updated order_complete table"
        )

    def save_orders_paid(self, shop, order_id, customer_id, payload):
        try:
            # # Using a with statement ensures that the connection is always released
            # # back into the pool at the end of statement (even if an error occurs)
            with self.db.connect() as conn:
                from sqlalchemy.dialects.postgresql import insert
                insert_stmt = insert(self.orders_paid).values(
                    shop=shop,
                    customer_id=str(customer_id),
                    order_id=str(order_id),
                    order_data=payload
                )
                do_update_stmt = insert_stmt.on_conflict_do_update(
                    index_elements=['shop', 'customer_id', 'order_id'],
                    set_=dict(
                        order_data=payload
                    )
                )
                conn.execute(do_update_stmt)
        except Exception as e:
            # If something goes wrong, handle the error in this section. This might
            # involve retrying or adjusting parameters depending on the situation.
            # [START_EXCLUDE]
            self.logger.exception(e)
            return Response(
                status=500,
                response=f"Unable to update orders_paid: {e}"
            )
        return Response(
            status=200,
            response="Successfully updated orders_paid table"
        )

    def get_lifo_orders(self, customer_id):
        ret = None
        try:
            # # Using a with statement ensures that the connection is always released
            # # back into the pool at the end of statement (even if an error occurs)
            with self.db.connect() as conn:
                select_stmt = select().where(self.lifo_tracker_id.c.customer_id == customer_id)
                result = conn.execute(select_stmt)
                cursor = result.context.cursor
                # cursor.fetchall()
                # print(result.context.cursor)
                # for row in result:
                    # print("lifo_tracker_id: %s, customer_id: %s", row['lifo_tracker_id'], row['customer_id'])
        except Exception as e:
            # If something goes wrong, handle the error in this section. This might
            # involve retrying or adjusting parameters depending on the situation.
            # [START_EXCLUDE]
            self.logger.exception(e)
            return Response(
                status=500,
                response="{}"
            )
        return Response(
            status=200,
            response=ret
        )

    def create_lifo_tracker_id(self, customer_id):
        try:
            # # Using a with statement ensures that the connection is always released
            # # back into the pool at the end of statement (even if an error occurs)
            with self.db.connect() as conn:
                from sqlalchemy.dialects.postgresql import insert
                m = hashlib.sha256()
                m.update(str(customer_id).encode('utf-8'))
                m.update(str(time.time()).encode('utf-8'))
                lifo_tracker_id = m.hexdigest()
                insert_stmt = insert(self.lifo_tracker_id).values(
                    lifo_tracker_id=str(lifo_tracker_id),
                    customer_id=str(customer_id),
                )
                conn.execute(insert_stmt)
        except Exception as e:
            # If something goes wrong, handle the error in this section. This might
            # involve retrying or adjusting parameters depending on the situation.
            # [START_EXCLUDE]
            self.logger.exception(e)
            return Response(
                status=500,
                response="Creating Lifo tracker id is failed"
            )
        return Response(
            status=200,
            response=lifo_tracker_id
        )

sql_handler = Sqlhandler()
