import unittest
from cloud_sql import sql_handler

class TestLifoTrackerId(unittest.TestCase):

    def test_get_lifo_orders(self):
        result = sql_handler.get_lifo_orders('3652281172134')

    def test_create_lifo_tracker_id(self):
        result = sql_handler.create_lifo_tracker_id('1234567')
        self.assertEqual('200 OK', result.status)
        self.assertIsNotNone(result.response)

if __name__ == '__main__':
    unittest.main()
