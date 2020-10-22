from . import index_blue
from influencer.models import Influencer_account,Influencer_transaction
from influencer import d_b

#充值操作compaign_pay
@index_blue.route('/add/compaign_pay',methods=['GET' ,'POST'])
def compaign_pay():
    print('1')
    #influencer_account
    influencer_id = 'A00001'
    amount = 10
    account_object = Influencer_account.query.filter_by(influencer_id=influencer_id).first()
    #判断是否第一次充值
    #第一次充值，创建账户
    if not account_object:
        account_object = Influencer_account(influencer_id=influencer_id,account_balance=0,pending_balance=amount,total_earning=amount)
        d_b.session.add(account_object)
        d_b.session.commit()

        # influencer_transaction
        after_pending_balance = amount
        transaction_data = Influencer_transaction(influencer_id=influencer_id, transaction_type='CAMPAIGN_PAY',status='PENDING', amount=amount,before_pending_balance=0,after_pending_balance=after_pending_balance)
        d_b.session.add(transaction_data)
        d_b.session.commit()
        return 'ok'
    else:
        before_pending_balance = account_object.pending_balance
        account_object.pending_balance = account_object.pending_balance + amount
        account_object.total_earning = account_object.total_earning + amount

        #influencer_transaction
        after_pending_balance = before_pending_balance + amount
        transaction_data = Influencer_transaction(influencer_id=influencer_id, transaction_type='CAMPAIGN_PAY',status='PENDING', amount=amount,before_pending_balance=before_pending_balance, after_pending_balance=after_pending_balance)
        d_b.session.add(transaction_data)
        d_b.session.commit()
        return 'ok'


#消费操作cash_out
@index_blue.route('/rem/cash_out',methods=['GET' ,'POST'])
def cash_out():
    # influencer_account
    influencer_id = 'A00001'
    amount = 70
    account_object = Influencer_account.query.filter_by(influencer_id=influencer_id).first()
    before_account_balance = account_object.account_balance
    account_object.account_balance = account_object.account_balance - amount
    # influencer_transaction
    transaction_data = Influencer_transaction(influencer_id=influencer_id, transaction_type='CASH_OUT',status='DONE', amount=amount,before_account_balance=before_account_balance,after_account_balance=before_account_balance - amount,before_pending_balance=account_object.pending_balance, after_pending_balance=account_object.pending_balance)
    d_b.session.add(transaction_data)
    d_b.session.commit()
    return 'ok'


#日常daily job
@index_blue.route('/days/credit_convert',methods=['GET' ,'POST'])
def credit_convert():
    account_object = Influencer_account.query.filter_by().all()
    for i in account_object:
        before_account_balance = i.account_balance
        before_pending_balance = i.pending_balance
        i.account_balance = i.account_balance + i.pending_balance
        i.pending_balance = 0
        sum = 0
        transaction_objects = Influencer_transaction.query.filter(Influencer_transaction.influencer_id==i.influencer_id,Influencer_transaction.status == 'PENDING').all()
        for j in transaction_objects:
            sum += j.amount
        transaction_object = Influencer_transaction(influencer_id=i.influencer_id,transaction_type='CREDIT_CONVERT',status='DONE',amount=sum,before_account_balance=before_account_balance,after_account_balance=i.account_balance,before_pending_balance=before_pending_balance,after_pending_balance=i.pending_balance)
        d_b.session.add(transaction_object)
        d_b.session.commit()

    return 'ok'


# 查询account_info
@index_blue.route('/sea/get_account_info',methods=['GET' ,'POST'])
def get_account_info():
    influencer_id = 'A00001'
    account_object = Influencer_account.query.filter_by(influencer_id=influencer_id).all()
    return 'ok'


#查询transaction_history
@index_blue.route('/sea/get_transaction_history',methods=['GET' ,'POST'])
def get_transaction_history():
    influencer_id = 'A00001'
    transaction_objects = Influencer_transaction.query.filter(Influencer_transaction.influencer_id==influencer_id,Influencer_transaction.transaction_type.in_(['CAMPAIGN_PAY', 'CASH_OUT'])).all()
    return 'ok'
