import unittest
from campaign_perf_utils import (percentage_commission_per_row, percentage_commission_per_shop,
                                 fixed_commission_per_shop, combine_final_commissions, count_visits_daily,
                                 calculate_per_inf_roi)

class TestCampaignPerf(unittest.TestCase):
    def gen_per_shop_per_campaign_join_data(self):
        """
        cloud_sql.get_all_data_per_shop()
        subtotal_price, uid, campaign_id, commission, commission_type, commission_percentage, order_complete.shop
        """
        rows = [
            [123123132, '123', 'campaign1', 10, 'commission', None, 'Lifo shop'],
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

    def gen_count_visits_daily_query_data(self):
        """
        cloud_sql.get_fixed_commission_per_shop_per_campaign()
        fixed_commission, shop, campaign_id
        """
        return [
            [10, 'Lifo shop', '2019-10-1'],
            [20, 'Lifo shop', '2019-10-2'],
            [30, 'Lifo shop', '2019-10-2'],
        ]

    def test_count_visits_daily(self):
        daily_visits = self.gen_count_visits_daily_query_data()
        results = count_visits_daily(daily_visits)
        self.assertEqual(results, {'visit_counts': 60, 'daily_visit': {'2019-10-1': 10, '2019-10-2': 50}})

    def gen_per_shop_per_campaign_join_data(self):
        """
        cloud_sql.get_all_data_per_shop()
        subtotal_price, uid, campaign_id, commission, commission_type, commission_percentage, order_date, order_complete.shop
        """
        rows = [
            [123123132, '123', 'campaign1', 10, 'commission', None, '2020-07-01', 'Lifo shop'],
            [100, '123', 'campaign2', None, 'commission', 12, '2020-07-02', 'Lifo shop'],
            [10, '456', 'campaign1', 20, 'commission', 10, '2020-07-01', 'Lifo shop'],
        ]
        return rows

    def test_per_inf_performance(self):
        rows = self.gen_per_shop_per_campaign_join_data()
        print(calculate_per_inf_roi(rows))

if __name__ == '__main__':
    unittest.main()
