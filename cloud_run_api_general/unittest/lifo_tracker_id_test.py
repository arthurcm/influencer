import unittest
from validator_collection import validators, checkers


class TestLifoTrackerId(unittest.TestCase):

    def test_url_validator(self):
        self.assertEqual(validators.domain('lifo.ai'), 'lifo.ai')
        self.assertEqual(validators.domain('www.lifo.ai'), 'www.lifo.ai')
        self.assertEqual(validators.url('http://lifo.ai/login'), 'http://lifo.ai/login')
        print(checkers.is_domain('lifo.ai'))

if __name__ == '__main__':
    unittest.main()
