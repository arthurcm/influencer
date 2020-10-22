from . import d_b
import datetime

class Influencer_transaction(d_b.Model):
    __tablename__ = 'influencer_transaction'

    id = d_b.Column(d_b.Integer,primary_key=True)
    influencer_id = d_b.Column(d_b.String(127),nullable=False)
    status = d_b.Column(d_b.String(63),nullable=False)
    transaction_type = d_b.Column(d_b.String(63),nullable=False)
    amount = d_b.Column(d_b.Float,nullable=False,default=0)
    before_account_balance = d_b.Column(d_b.Float,nullable=False,default=0)
    after_account_balance = d_b.Column(d_b.Float,nullable=False,default=0)
    before_pending_balance = d_b.Column(d_b.Float,nullable=False,default=0)
    after_pending_balance = d_b.Column(d_b.Float,nullable=False,default=0)
    transaction_time = d_b.Column(d_b.DateTime,default=datetime.datetime.now)


class Influencer_account(d_b.Model):
    id = d_b.Column(d_b.Integer, primary_key=True)
    influencer_id = d_b.Column(d_b.String(127), nullable=False)
    account_balance = d_b.Column(d_b.Float,default=0)
    pending_balance = d_b.Column(d_b.Float,default=0)
    total_earning = d_b.Column(d_b.Float,default=0)
    paypal_account = d_b.Column(d_b.Text)