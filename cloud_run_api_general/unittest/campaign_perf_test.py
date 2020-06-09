import unittest
from campaign_perf_utils import (percentage_commission_per_row, percentage_commission_per_shop,
                                 fixed_commission_per_shop, combine_final_commissions)

class TestCampaignPerf(unittest.TestCase):
    def gen_per_shop_per_campaign_join_data(self):
        """
        cloud_sql.get_all_data_per_shop_per_campaign()
        subtotal_price, uid, campaign_id, commission, commission_type, commission_percentage, order_complete.shop
        """
        rows = [
            [123123132, '123', 'campaign1', 10, 'commission', 0, 'Lifo shop'],
            [100, '123', 'campaign2', None, 'commission', 12, 'Lifo shop'],
            [10, '456', 'campaign1', 20, 'commission', 10, 'Lifo shop'],
        ]
        return rows

    def test_percentage_commission_per_row(self):
        rows = self.gen_per_shop_per_campaign_join_data()
        self.assertEqual(percentage_commission_per_row(rows[0]), ('campaign1', '123', 0))
        self.assertEqual(percentage_commission_per_row(rows[1]), ('campaign2', '123', 12.0))
        self.assertEqual(percentage_commission_per_row(rows[2]), ('campaign1', '456', 1.0))

    def test_percentage_commission_per_shop(self):
        rows = self.gen_per_shop_per_campaign_join_data()
        self.assertEqual(percentage_commission_per_shop(rows),
                         {'total_percentage_commission': 13.0,
                          'per_campaign_percentage_commission': {'campaign1': 1.0, 'campaign2': 12.0}})

    def gen_fixed_commission_query_data(self):
        """
        cloud_sql.get_fixed_commission_per_shop_per_campaign()
        fixed_commission, shop, campaign_id
        """
        return [
            [10, 'Lifo shop', 'campaign1'],
            [20, 'Lifo shop', 'campaign2'],
        ]

    def test_fixed_commission_per_shop(self):
        rows = self.gen_fixed_commission_query_data()
        self.assertEqual(fixed_commission_per_shop(rows), {'total_fixed_commission': 30,
                                                           'per_campaign_fixed_commission': {
                                                               'campaign1': 10,
                                                               'campaign2': 20
                                                           }})

    def test_combine_final_commissions(self):
        fixed_rows = self.gen_fixed_commission_query_data()
        fixed_commission = fixed_commission_per_shop(fixed_rows)
        percentage_rows = self.gen_per_shop_per_campaign_join_data()
        percentage_commission = percentage_commission_per_shop(percentage_rows)
        self.assertEqual(combine_final_commissions(fixed_commission, percentage_commission),
                         {'total_commission': 43.0, 'per_campaign_total': {'campaign1': 11.0, 'campaign2': 32.0},
                          'per_campaign_fixed': {'total_fixed_commission': 30,
                                                 'per_campaign_fixed_commission': {'campaign1': 10, 'campaign2': 20}},
                          'per_campaign_percentage': {'total_percentage_commission': 13.0,
                                                      'per_campaign_percentage_commission': {'campaign1': 1.0,
                                                                                             'campaign2': 12.0}}}
                         )



if __name__ == '__main__':
    unittest.main()
