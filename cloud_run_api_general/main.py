# -*- coding: utf-8 -*-

import os
import flask
import json
import hashlib

from validator_collection import checkers

from flask import request
from flask_cors import CORS

# Imports the Google Cloud client library
import google.cloud.logging
import logging

from email_util import share_draft_email
from cloud_sql import sql_handler
from campaign_perf_utils import (fixed_commission_per_shop, percentage_commission_per_shop, combine_final_commissions,
                                 count_visits_daily, calculate_shop_daily_revenue, calculate_campaign_daily_revenue)

# Instantiates a client
client = google.cloud.logging.Client()

# Connects the logger to the root logging handler; by default this captures
# all logs at INFO level and higher
client.setup_logging()

# This variable specifies the name of a file that contains the OAuth 2.0
# information for this application, including its client_id and client_secret.
CLIENT_SECRETS_FILE = "/tmp/client_secret_65044462485-6h2vnliteh06hllhb5n1o4g95h3v52tq.apps.googleusercontent.com.json"

VALID_PRIVACY_STATUSES = ("public", "private", "unlisted")

import firebase_admin
from firebase_admin import auth
from firebase_admin import exceptions

ACCOUNT_MANAGER_FLAG = 'account_manager'
STORE_ACCOUNT = 'store_account'
FROM_SHOPIFY = 'from_shopify'

firebase_app = firebase_admin.initialize_app()

app = flask.Flask(__name__)
CORS(app)
# Note: A secret key is included in the sample so that it works.
# If you use this code in your application, replace this with a truly secret
# key. See https://flask.palletsprojects.com/quickstart/#sessions.
app.secret_key = 'REPLACE ME - this value is here as a placeholder.'


@app.route('/share', methods=['POST'])
def share():
    if not request.json:
        return flask.make_response(400)
    if not share_draft_email(request.json):
        res = flask.make_response(400)
    else:
        res = flask.make_response("email sent successfully!")
    return res


@app.route("/track", methods=["POST"])
def track():
    """
    public endpoint (no auth)
    Note: Shopify client side is using the following code snippet to send tracking events:
    # req.send(JSON.stringify({
    #     lifo_tracker_id: lifo_tracker_id,
    #     shop: getShop(),
    #     location: document.location,
    #     navigator: navigator.userAgent,
    #     referrer: document.referrer,
    #     discount_code,
    # })),
    """
    data = flask.request.json
    logging.info(f'Receiving /track request {data}')
    if not data.get('shop'):
        logging.warning(f'Invalid shop data received {data}')
    elif not data.get('lifo_tracker_id'):
        logging.debug(f'Skip none lifo event {data}')
    else:
        try:
            res = sql_handler.save_track_visit(data)
            if res.status_code == 200:
                logging.info('Data saved to cloud SQL')
        except Exception as e:
            logging.error(f'Saving events error: {e}')
    response = flask.jsonify({'status': 'OK'})
    response.status_code = 200
    return response


@app.route("/order_complete", methods=["POST"])
def order_complete():
    """
    Public endpoint (no auth)
    Don't confuse this one with Shopify webhook.
    Note: Shopify client side is using the following code snippet to send order_complete events:
    # n.send(JSON.stringify({
    #     lifo_tracker_id: lifo_tracker_id,
    #     shop: getShop(),
    #     location: document.location,
    #     navigator: navigator.userAgent,
    #     referrer: document.referrer,
    #     discount_code,
    #     order_id,
    #     customer_id: data.customer_id,
    #     order_data,
    # }));
    """
    data = flask.request.json
    logging.info(f'Receiving order_complete request {data}')
    if not data.get('shop') or not data.get('order_id') or not data.get('customer_id'):
        logging.warning(f'Invalid shop/customer data received {data}')
    elif not data.get('lifo_tracker_id'):
        logging.debug(f'Skip none lifo event {data}')
    else:
        try:
            order_data = data.get('order_data')
            # we use subtotal_price for calculation, before tax and shipping
            subtotal_price = float(order_data.get('subtotal_price'))
            logging.debug(f'Received order with revenue of {subtotal_price}')
            res = sql_handler.save_order_complete(data, subtotal_price)
            if res.status_code == 200:
                logging.info('Data saved to cloud SQL')
        except Exception as e:
            logging.error(f'Saving events error: {e}')
    response = flask.jsonify({'status': 'OK'})
    response.status_code = 200
    return response


@app.route("/orders_paid", methods=["POST"])
def orders_paid():
    """
    This is the public endpoint (no auth) for shopify orders_paid webhook.
    """
    data = flask.request.json
    logging.info(f'Receiving orders_paid request {data}')
    if data.get('topic') != 'ORDERS_PAID':
        logging.warning(f'Invalid not ORDERS_PAID data received {data}')
    elif not data.get('domain') or not data.get('payload'):
        logging.warning(f'Invalid shop/customer data received {data}')
    else:
        try:
            shop = data.get('domain')
            order_id = data.get('payload').get('id')
            customer_id = data.get('payload').get('customer').get('id')
            payload = data.get('payload')
            res = sql_handler.save_orders_paid(shop, order_id, customer_id, payload)
            if res.status_code == 200:
                logging.info('Data saved to cloud SQL')
        except Exception as e:
            logging.error(f'Saving events error: {e}')
    response = flask.jsonify('OK')
    response.status_code = 200
    return response


@app.route("/customers_redact", methods=["POST"])
def customers_redact():
    """
    This is the public endpoint (no auth) for shopify customers/redact webhook.
    """
    data = flask.request.json
    logging.info(f'Receiving customers_redact request {data}')

    try:
        shop_domain = data.get('shop_domain')
        customer_id = data.get('customer').get('id')
        res = sql_handler.del_customer_info(shop_domain, customer_id)
        if res.status_code == 200:
            logging.info('Customer data deleted from cloud SQL')
    except Exception as e:
        logging.error(f'Customer data deleted events error: {e}')
    response = flask.jsonify('OK')
    response.status_code = 200
    return response


@app.route("/shop_redact", methods=["POST"])
def shop_redact():
    """
    This is the public endpoint (no auth) for shopify shop/redact webhook.
    """
    data = flask.request.json
    logging.info(f'Receiving shop_redact request {data}')

    try:
        shop_domain = data.get('shop_domain')   
        res = sql_handler.del_shop_info(shop_domain)
        if res.status_code == 200:
            logging.info('Shop data deleted from cloud SQL')
    except Exception as e:
        logging.error(f'Shop data deleted events error: {e}')
    response = flask.jsonify('OK')
    response.status_code = 200
    return response


@app.route("/customers_data_request", methods=["POST"])
def customers_data_request():
    """
    This is the public endpoint (no auth) for shopify customers/data_request webhook.
    """
    data = flask.request.json
    logging.info(f'Receiving customers_data_request request {data}')

    try:
        shop_domain = data.get('shop_domain')
        customer_id = data.get('customer').get('id')
        res = sql_handler.get_customer_data(shop_domain, customer_id)
        if res.status_code == 200:
            logging.info('Customer data queried from cloud SQL')
    except Exception as e:
        logging.error(f'Customer data queried error: {e}')
    response = flask.jsonify({'result': str(res.response)})
    response.status_code = 200
    return response   


def token_verification(id_token):
    try:
        decoded_token = auth.verify_id_token(id_token)
    except ValueError or exceptions.InvalidArgumentError:
        logging.error('id_token not string or empty or invalid')
        return ''
    except auth.RevokedIdTokenError:
        logging.error('id_token has been revoked')
        return ''
    return decoded_token


def _build_cors_prelight_response():
    response = flask.make_response()
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    return response


@app.before_request
def hook():
    if request.method == "OPTIONS": # CORS preflight
        return _build_cors_prelight_response()
    if request.path.startswith('/brand') or request.path.startswith('/am') or request.path.startswith('/influencer'):
        id_token = flask.request.headers.get('Authorization') or flask.request.args.get('id_token')
        if not id_token:
            logging.error('Valid id_token required')
            response = flask.jsonify('Valid id_token required')
            response.status_code = 401
            return response
        decoded_token = token_verification(id_token)
        uid = decoded_token['uid']
        if not uid:
            logging.error('id_token verification failed')
            response = flask.jsonify('id_token verification failed')
            response.status_code = 401
            return response
        logging.info(f'request path is: {request.path} with decoded token {decoded_token}')
        if decoded_token.get(ACCOUNT_MANAGER_FLAG):
            logging.info('AM account has admin access')
        elif not decoded_token.get(ACCOUNT_MANAGER_FLAG) and request.path.startswith('/am'):
            response = flask.jsonify({"status": "not authorized"})
            response.status_code = 403
            return response
        elif (request.path.startswith('/brand') and not decoded_token.get(STORE_ACCOUNT))\
                or (request.path.startswith('/influencer') and decoded_token.get(STORE_ACCOUNT)):
            response = flask.jsonify({"status": "not authorized"})
            response.status_code = 403
            return response

        flask.session['uid'] = uid
        flask.session[FROM_SHOPIFY] = decoded_token.get(FROM_SHOPIFY)
        flask.session[STORE_ACCOUNT] = decoded_token.get(STORE_ACCOUNT)
        flask.session[ACCOUNT_MANAGER_FLAG] = decoded_token.get(ACCOUNT_MANAGER_FLAG)
        flask.session['name'] = decoded_token.get('name')
        flask.session['email'] = decoded_token.get('email')
    else:
        logging.debug(f'By passing auth for request {request.path}')


def create_tracker_id(uid, brand_campaign_id):
    m = hashlib.sha256()
    m.update(str(uid + brand_campaign_id).encode('utf-8'))
    lifo_tracker_id = m.hexdigest()
    return lifo_tracker_id


def generate_shop_url(domain_or_url):
    url = None
    if checkers.is_domain(domain_or_url):
        url = f'https://{domain_or_url}'
    elif checkers.is_url(domain_or_url):
        url = domain_or_url
    return url


@app.route("/influencer/lifo_tracker_id", methods=["POST"])
def create_lifo_tracker_id():
    """
    This is the internal endpoint for creating lifo tracker id, and requires auth from Influencers.
    The caller is currently from campaign side, where queries are sent from api_nodejs during influencer
    signing up for brand initiated campaigns.
    The request payload will include campaign_data as defined in campaign.js under api_nodejs.
    """
    # influencer uid, NOT shop
    uid = flask.session['uid']

    # a flag to differentiate Shopify accounts, which use store domain as uid
    from_shopify = flask.session['from_shopify']

    campaign_data = flask.request.json
    logging.debug(f'{request.path} receiving campaign data {campaign_data}')
    if not campaign_data.get('brand_campaign_id'):
        response = flask.jsonify({'Status': 'A valid brand_campaign_id is required'})
        response.status_code = 422
        return response

    lifo_tracker_id = create_tracker_id(uid=uid,
                                        brand_campaign_id=campaign_data.get('brand_campaign_id'))
    try:
        if from_shopify:
            domain_or_url = campaign_data.get('brand_id')
        else:
            domain_or_url = campaign_data.get('website')
        shop_url = generate_shop_url(domain_or_url)
        if not shop_url:
            response = flask.jsonify({'Status': 'Invalid shop url'})
            response.status_code = 422
            return response
        tracking_url = f'{shop_url}/?lftracker={lifo_tracker_id}'
        commission = campaign_data.get('commission_dollar')
        commission_type = campaign_data.get('commission_type')
        commission_percentage = campaign_data.get('commission_percentage')
        brand_campaign_id = campaign_data.get('brand_campaign_id')
        res = sql_handler.save_lifo_tracker_id(uid, lifo_tracker_id, domain_or_url, commission, commission_type,
                                               commission_percentage, brand_campaign_id, tracking_url)
        if len(res) > 0:
            logging.info(f'Data saved to cloud SQL: {tracking_url}')
    except Exception as e:
        logging.error(f'Saving events error: {e}')
        response = flask.jsonify({'Status': 'Failed'})
        response.status_code = 400
        return response
    response = flask.jsonify({'tracking_url': tracking_url})
    response.status_code = 200
    return response


@app.route("/influencer/entitlement", methods=["GET"])
def entitlement():
    """
    This should be replaced with matching algorithm with human supervision in near future
    before GA. Currently this assumes manual input of entitlement data (from BD and sales team)
    before each POC.
    :return: list of matched "shop" along with potential commission information (to be consumed)
    """
    uid = flask.session['uid']
    user = auth.get_user(uid)
    influencer_email = user.email
    if not influencer_email or not checkers.is_email(influencer_email):
        logging.warning(f'Influencer {user} does not have valid email')
        response = flask.jsonify({'Status': 'Need valid email'})
        response.status_code = 422
        return response
    shops = sql_handler.get_campaign_entitlement(influencer_email)
    res = {individual_shop['shop']: individual_shop for individual_shop in shops}
    response = flask.jsonify(res)
    response.status_code = 200
    return response


def get_revenue_per_shop(shop):
    revenue_results = {'shop': shop}
    try:
        ts_results = sql_handler.get_revenue_ts_per_shop(shop)
        revenue_ts = calculate_shop_daily_revenue(ts_results)
    except Exception as e:
        logging.error(f'Getting revenue daily ts error: {e}')
        revenue_ts = []
    try:
        campaign_results = sql_handler.get_revenue_ts_per_campaign(shop)
        campaign_revenue = calculate_campaign_daily_revenue(campaign_results)
    except Exception as e:
        logging.error(f'Getting revenue error: {e}')
        campaign_revenue = {}
    total_revenue = 0
    for rev in campaign_revenue.values():
        total_revenue += rev
    revenue_results['revenue_ts'] = revenue_ts
    revenue_results['campaign_revenue'] = campaign_revenue
    revenue_results['shop_revenue'] = total_revenue
    logging.info(f'Revenue results are {revenue_results}')
    return revenue_results


@app.route("/tam/entitlement", methods=["POST"])
def create_entitlement():
    """
    TODO: create internal TAM type accounts as internal tool to create entitlements,
    so that business team can help operate POC.
    This is an internal API for TAM to create entitlement records.
    This should be replaced with matching algorithm with human supervision in near future
    before GA. Currently this assumes manual input of entitlement data (from BD and sales team)
    before each POC.
    :return: list of matched "shop" along with potential commission information (to be consumed)
    """
    uid = flask.session['uid']
    user = auth.get_user(uid)
    data = flask.request.json
    logging.info(f'Receiving request from {user} with data {data}')
    influencer_email = data.get('influencer_email')
    shop = data.get('shop')
    if not influencer_email or not checkers.is_email(influencer_email)\
            or not shop:
        logging.error(f'Invalid email or shop')
        response = flask.jsonify({'Status': 'Need valid email and shop'})
        response.status_code = 422
        return response
    res = sql_handler.save_campaign_entitlement(influencer_email, shop, data.get('commission'))
    response = flask.jsonify(res)
    response.status_code = 200
    return response


@app.route('/brand/revenue', methods=['GET'])
def revenue():
    shop = flask.session['uid'] #flask.request.args.get('shop')
    revenue_results = get_revenue_per_shop(shop)
    response = flask.jsonify(revenue_results)
    response.status_code = 200
    return response


@app.route('/brand/track', methods=['GET'])
def track_visits():
    shop = flask.session['uid']
    if not shop:
        response = flask.jsonify({'Status': 'Failed'})
        response.status_code = 422
        return response
    try:
        # schema: COUNT(*) as visits, shop
        sql_results = sql_handler.counts_visits_per_shop(shop)
        visit_results = count_visits_daily(sql_results)
    except Exception as e:
        logging.error(f'Getting track_visit error: {e}')
    logging.debug(f'Obtained tracking report {visit_results}')
    response = flask.jsonify(visit_results)
    response.status_code = 200
    return response


@app.route('/brand/roi', methods=['GET'])
def roi():
    shop = flask.session['uid']
    revenue_results = get_revenue_per_shop(shop)
    shop_revenue = revenue_results.get('shop_revenue')
    try:
        sqldata_fixed = sql_handler.get_fixed_commission_per_shop_per_campaign(shop)
        fixed_commission = fixed_commission_per_shop(sqldata_fixed)
    except Exception as e:
        logging.error(f'Getting fixed_commission error: {e}')
        fixed_commission = {
            'total_fixed_commission': 0,
            'per_campaign_fixed_commission': {}
        }
    try:
        sqldata_per = sql_handler.get_all_data_per_shop_per_campaign(shop)
        percentage_commission = percentage_commission_per_shop(sqldata_per)
    except Exception as e:
        logging.error(f'Getting percentage_commission error: {e}')
        percentage_commission = {
            'total_percentage_commission': 0,
            'per_campaign_percentage_commission': {}
        }
    logging.info(f'Fixed commission results: {fixed_commission}')
    logging.info(f'Percentage commission results: {percentage_commission}')
    try:
        # final_results['per_campaign_total']
        # final_results['per_campaign_fixed']
        # final_results['per_campaign_percentage']
        final_results = combine_final_commissions(fixed_commission, percentage_commission)
        total_commission = final_results.get('total_commission')
        if total_commission == 0:
            ROI = 0
        else:
            ROI = max((shop_revenue - total_commission) / total_commission, 0)
        final_results['ROI'] = float("{:.2f}".format(ROI))
        final_results['revenue'] = revenue_results
    except Exception as e:
        logging.error(f'Getting final results error: {e}')
        final_results = {
            'ROI': 0,
            'total_commission': 0,
            'per_campaign_total': {},
            'per_campaign_fixed': fixed_commission,
            'per_campaign_percentage': percentage_commission,
            'revenue': revenue_results
        }
    final_results['shop'] = shop
    logging.info(f'For shop: {shop}, getting total campaign report of {final_results}')
    response = flask.jsonify(final_results)
    response.status_code = 200
    return response


@app.route('/brand/auth', methods=['POST', 'GET'])
def register_brand():
    """
    This endpoint is called upon Shopify brands authentication (to save their access_token)
    """
    if flask.request.method == 'POST':
        data = flask.request.json
        shop = data['shop']
        access_token = data['access_token']
        logging.info(f'Received shop {shop} with access_token {access_token}')
        res = sql_handler.save_shop_auth(shop, access_token)
    else:
        shop = flask.request.args.get('shop')
        res = sql_handler.get_shop_auth(shop)
        if not res:
            res = {'status': 'access token not found'}
            response = flask.jsonify(res)
            response.status_code = 404
            return response
    response = flask.jsonify(res)
    response.status_code = 200
    return response


def get_client_secret():
    """
    To enable iam role access (for service accounts) to the secret, run the following:
    gcloud beta secrets add-iam-policy-binding client_secret
    --role roles/secretmanager.secretAccessor
    --member serviceAccount:influencer-272204@appspot.gserviceaccount.com
    :return: content of client secret string
    """

    # Import the Secret Manager client library.
    from google.cloud import secretmanager

    # GCP project in which to store secrets in Secret Manager.
    project_id = 'influencer-272204'

    # ID of the secret to create.
    secret_id = 'client_secret'

    # Create the Secret Manager client.
    client = secretmanager.SecretManagerServiceClient()

    # Build the parent name from the project.
    # parent = client.project_path(project_id)

    resource_name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
    response = client.access_secret_version(resource_name)
    secret_string = response.payload.data.decode('UTF-8')
    return secret_string


def write_client_secret():

    # Writing to sample.json
    if not os.path.exists(CLIENT_SECRETS_FILE):
        json_str = get_client_secret()
        dictionary = json.loads(json_str)

        # Serializing json
        json_object = json.dumps(dictionary, indent=4)
        with open(CLIENT_SECRETS_FILE, "w") as outfile:
            outfile.write(json_object)
            print(f'Sucessfully wrote secret file to {CLIENT_SECRETS_FILE}')
    else:
        print('Client secret file found. Continue')


if __name__ == '__main__':
  # When running locally, disable OAuthlib's HTTPs verification.
  # ACTION ITEM for developers:
  #     When running in production *do not* leave this option enabled.
  os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
  os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = 'True'
  write_client_secret()

  # Specify a hostname and port that are set as a valid redirect URI
  # for your API project in the Google API Console.
  app.run('0.0.0.0', 8080, debug=True)
