from collections import defaultdict


def percentage_commission_per_row(row):
    """
    Each row is a list of results from cloud_sql.get_all_data_per_shop(), which represents
    one order promoted by one inf for one campaign and one shop
    the row is ordered in:
    subtotal_price, uid, campaign_id, commission, commission_type, commission_percentage, order_complete.shop
    :return: a number for commission of this order.
    """
    subtotal_price = float(row[0])
    uid = row[1]
    campaign_id = row[2]
    if not row[5]:
        commission_percentage = 0
    else:
        commission_percentage = float(row[5])
    if not commission_percentage or commission_percentage <= 0:
        return campaign_id, uid, 0
    elif commission_percentage > 1:
        commission_percentage = commission_percentage / 100.0
    return campaign_id, uid, float(subtotal_price) * commission_percentage


def percentage_commission_per_shop(sqldata):
    """
    Get and calculate all percentage based commission for given shop
    :param shop: shop as identifier
    :return: dict {
        total_percentage_commission,
        per_campaign_percentage_commission : {campaign_id: per_campaign_percentage_commission}
    }
    """
    percentage_commission = {'total_percentage_commission': 0, 'per_campaign_percentage_commission': {}}
    if not sqldata or len(sqldata) == 0:
        return percentage_commission
    per_campaign_commission = {}
    for row in sqldata:
        campaign_id, uid, commission = percentage_commission_per_row(row)
        if campaign_id not in per_campaign_commission:
            per_campaign_commission[campaign_id] = commission
        else:
            per_campaign_commission[campaign_id] = per_campaign_commission[campaign_id] + commission
    total_commission = 0
    for commission in per_campaign_commission.values():
        total_commission += commission
    percentage_commission['total_percentage_commission'] = total_commission
    percentage_commission['per_campaign_percentage_commission'] = per_campaign_commission
    return percentage_commission


def fixed_commission_per_shop(sql_data):
    fixed_commission = {'total_fixed_commission': 0}
    # per row fields: fixed_commission, shop, campaign_id
    if not sql_data or len(sql_data) == 0:
        return fixed_commission
    per_campaign_fixed_commission = {}
    total_fixed_commission = 0
    for row in sql_data:
        if not row[0]:
            fixed_comm = 0
        else:
            fixed_comm = float(row[0])
        campaign_id = row[2]
        total_fixed_commission += fixed_comm
        per_campaign_fixed_commission[campaign_id] = fixed_comm
    fixed_commission['per_campaign_fixed_commission'] = per_campaign_fixed_commission
    fixed_commission['total_fixed_commission'] = total_fixed_commission
    return fixed_commission


def combine_final_commissions(fixed_commission, percentage_commission):
    """
    combine the two results dict from both percentage_commission_per_shop and fixed_commission_per_shop results
    :return: dict with final commission for each campaign, and total commission
    """
    final_results = {}
    final_results['total_commission'] = fixed_commission.get('total_fixed_commission') \
                                        + percentage_commission.get('total_percentage_commission')
    per_campaign = {}
    if 'per_campaign_fixed_commission' in percentage_commission:
        for campaign_id, fixed_comm in fixed_commission['per_campaign_fixed_commission'].items():
            per_campaign[campaign_id] = fixed_comm
    if 'per_campaign_percentage_commission' in percentage_commission:
        for campaign_id, per_comm in percentage_commission['per_campaign_percentage_commission'].items():
            if campaign_id not in per_campaign.keys():
                per_campaign[campaign_id] = per_comm
            else:
                per_campaign[campaign_id] = per_campaign[campaign_id] + per_comm
    final_results['per_campaign_total'] = per_campaign
    final_results['per_campaign_fixed'] = fixed_commission
    final_results['per_campaign_percentage'] = percentage_commission
    return final_results


def count_visits_daily(sqldata):
    """
    :param sqldata: results from the SQL query
            select COUNT(*) as visits, track_visit.shop, DATE(track_visit.timestamp) as visit_date
    """
    visits = {}
    if not sqldata or len(sqldata) == 0:
        visits['visit_counts'] = 0
        visits['daily_visit'] = []
    else:
        total_cnt = 0
        daily_visit = {}
        for row in sqldata:
            visit_count = int(row[0])
            visit_date = str(row[2])
            if visit_date in daily_visit:
                daily_visit[visit_date] += visit_count
            else:
                daily_visit[visit_date] = visit_count
            total_cnt += visit_count
        visits['visit_counts'] = total_cnt
        visits['daily_visit'] = daily_visit
    return visits


def calculate_shop_daily_revenue(sqldata):
    """
    :param sqldata: results from the following schema
                    SELECT SUM(subtotal_price) AS revenue, tracker_id.shop, order_date, campaign_id
    :return:
    """
    revenue_ts = []
    if sqldata and len(sqldata) > 0:
        for row in sqldata:
            cur_ts = {
                'daily_revenue': float(row[0]),
                'order_date': row[2]
            }
            revenue_ts.append(cur_ts)
    return revenue_ts


def calculate_campaign_daily_revenue(sqldata):
    """
    :param sqldata: results from
            SELECT SUM(subtotal_price) AS revenue, tracker_id.shop, order_date, campaign_id
    :return:
    """
    campaign_revenue = {}
    campaign_revenue_ts = {}
    if sqldata and len(sqldata) > 0:
        for row in sqldata:
            campaign_daily_revenue = float(row[0])
            order_date = row[2]
            campaign_id = row[3]
            # cur_ts = {
            #     'campaign_daily_revenue': campaign_daily_revenue,
            #     'order_date': order_date
            # }
            if campaign_id in campaign_revenue:
                campaign_revenue[campaign_id] += campaign_daily_revenue
            else:
                campaign_revenue[campaign_id] = campaign_daily_revenue
    return campaign_revenue


def calculate_per_inf_roi(sqldata):
    """
    Each row is a list of results from cloud_sql.get_all_data_per_shop_per_campaign(), which represents
    one order promoted by one inf for one campaign and one shop
    the row is ordered in:
    subtotal_price, uid, campaign_id, commission, commission_type, commission_percentage, order_date, order_complete.shop
    :return: a series of data representing ROI per influencer.
    """
    total_revenue = {}
    total_fixed_commission = {}
    total_percentage_commission = {}
    total_commission = {}
    revenue_ts = defaultdict(dict)
    total_roi = {}
    for row in sqldata:
        uid = row[1]
        cur_rev = float(row[0])
        if uid not in total_revenue:
            total_revenue[uid] = cur_rev
        else:
            total_revenue[uid] += cur_rev
        cur_fixed_commission = row[3] or 0
        cur_fixed_commission = float(cur_fixed_commission)
        if uid not in total_fixed_commission:
            total_fixed_commission[uid] = cur_fixed_commission
        else:
            total_fixed_commission[uid] += cur_fixed_commission
        cur_commission_percentage = row[5] or 0
        cur_commission_percentage = float(cur_commission_percentage)
        percent_commission = cur_commission_percentage * cur_rev
        if uid not in total_percentage_commission:
            total_percentage_commission[uid] = percent_commission
        else:
            total_percentage_commission[uid] += percent_commission
        order_date = row[6].strftime("%m/%d/%Y")
        if uid not in revenue_ts:
            revenue_ts[uid] = {order_date: cur_rev}
        else:
            if order_date not in revenue_ts[uid]:
                revenue_ts[uid][order_date] = cur_rev
            else:
                revenue_ts[uid][order_date] += cur_rev
    for uid, fixed_comm in total_fixed_commission.items():
        total_commission[uid] = fixed_comm + total_percentage_commission[uid]
        total_roi[uid] = max((total_revenue[uid] - total_commission[uid]) / total_commission[uid], 0)
    res = []
    for uid, roi in total_roi.items():
        res.append({
            'uid': uid,
            'roi': float(roi),
            'total_revenue': float(total_revenue[uid]),
            'total_commission': float(total_commission[uid]),
            'revenue_ts': revenue_ts[uid]
        })
    return res
