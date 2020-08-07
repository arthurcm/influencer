# -*- coding: utf-8 -*-

import os
import flask
import json
import datetime

from validator_collection import checkers
import shopify

import requests
from flask import request
from flask_cors import CORS

# Imports the Google Cloud client library
import google.cloud.logging
import logging

from cloud_sql import sql_handler
# Instantiates a client
client = google.cloud.logging.Client()

# Connects the logger to the root logging handler; by default this captures
# all logs at INFO level and higher
client.setup_logging()

# This variable specifies the name of a file that contains the OAuth 2.0
# information for this application, including its client_id and client_secret.
CLIENT_SECRETS_FILE = "/tmp/client_secret_65044462485-6h2vnliteh06hllhb5n1o4g95h3v52tq.apps.googleusercontent.com.json"


# This is taken from https://marketer.modash.io/developer
MODASH_API_ACCESS_KEY = "Xuomvq8poz8x9PdJNvKVadzUyO7xuj1X"
MODASH_API_ENDPINT = "https://api.modash.io/v1"
MODASH_AUTH_HEADER = f'Bearer {MODASH_API_ACCESS_KEY}'
MAX_RESULT_LIMIT = 200

API_VERSION = os.getenv('API_VERSION', '2020-07')


ACCOUNT_MANAGER_FLAG = 'account_manager'
STORE_ACCOUNT = 'store_account'
FROM_SHOPIFY = 'from_shopify'

VALID_PRIVACY_STATUSES = ("public", "private", "unlisted")

DEFFAULT_DATE_RANGE = 90
MAX_SHOPIFY_RESULTS_LIMIT = 200

import firebase_admin
from firebase_admin import auth
from firebase_admin import exceptions
from google.cloud import firestore


firebase_app = firebase_admin.initialize_app()

# here the db variable is a firestore client. We name it as "db" just to be consistent with JS side.
db = firestore.Client()

app = flask.Flask(__name__)
CORS(app)
# Note: A secret key is included in the sample so that it works.
# If you use this code in your application, replace this with a truly secret
# key. See https://flask.palletsprojects.com/quickstart/#sessions.
app.secret_key = 'REPLACE ME - this value is here as a placeholder.'


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


@app.route("/am/instagram/search", methods=["POST"])
def instagram_search():
    """
        AM use. This is to search instagram account from Modash
    """
    try:
        data = flask.request.json
        url = f'{MODASH_API_ENDPINT}/instagram/search'
        logging.info(f'Receiving request for url {url} and body {data}')
        headers = {'Content-type': 'application/json',
                   'Authorization': MODASH_AUTH_HEADER}
        modash_search = requests.post(url, data=json.dumps(data), headers=headers)
        search_res = modash_search.json()
        logging.info(f'Modash search returned {search_res}')
        if search_res.get('error'):
            logging.error('Search returned error')
            response = flask.jsonify({'Error': 'Failed to search'})
            response.status_code = 400
        else:
            response = flask.jsonify(search_res)
            response.status_code = 200
    except Exception as e:
        logging.error(f'Search error: {e}')
        response = flask.jsonify({'Error': 'Failed to search'})
        response.status_code = 400
    return response


@app.route("/am/instagram/profile", methods=["GET"])
def instagram_report():
    """
    This API pulls instagram full report from Modash
    https://api.modash.io/v1/instagram/profile/{userId}/report
    The default behavior is to use a cached version of report stored in Lifo's SQL server.
    If "force_update" parameter is true, the profile will then be updated, each pull of which costs ~$0.40
    """
    userId = flask.request.args.get('userId')
    if not userId:
        response = flask.jsonify({"error": "Valid userId param required!"})
        response.status_code = 412
        return response

    force_update = flask.request.args.get('force_update')
    if not force_update:
        force_update = False

    profile = None
    if not force_update:
        profile, update_time = sql_handler.get_profile(userId, platform='instagram')
        logging.info(f'Not forcing profile update, and obtained profile {profile}')
    if not profile or len(profile) == 0:
        logging.info(f'Fetching profile from Modash for userid {userId}')
        url = f'{MODASH_API_ENDPINT}/instagram/profile/{userId}/report'
        logging.info(f'Receiving request for url {url}')
        headers = {'Authorization': MODASH_AUTH_HEADER}
        profile_res = requests.get(url, headers=headers)
        profile_json = profile_res.json()
        logging.info(f'Modash instagram profile response is: {profile_res.json()}')
        error = profile_json.get('error')
        if not error:
            profile = profile_json.get('profile')
            sql_handler.save_profile(userId, 'instagram', profile)
    if profile:
        response = flask.jsonify(profile)
        response.status_code = 200
    else:
        response = flask.jsonify({"error": "Failed to obtain instagram profile"})
        response.status_code = 400
    return response


@app.route("/am/instagram/interests", methods=["GET"])
def instagram_interests():
    """
    https://docs.modash.io/#tag/Instagram/paths/~1instagram~interests/get
    This is to get the brands IDs provided by Modash. Essentially this is getting the enum
    for interests, which will be used for hooking up search functionalities.
    """
    return modash_instagram_utils('interests')


@app.route("/am/instagram/brands", methods=["GET"])
def instagram_brands():
    """
    https://docs.modash.io/#tag/Instagram/paths/~1instagram~brands/get
    This is to get the brands IDs provided by Modash. Essentially this is getting the enum
    for brands, which will be used for hooking up search functionalities.
    """
    return modash_instagram_utils('brands')


@app.route("/am/instagram/languages", methods=["GET"])
def instagram_languages():
    """
    https://docs.modash.io/#tag/Instagram/paths/~1instagram~languages/get
    This is to get the location IDs provided by Modash. Essentially this is getting the enum
    for languages, which will be used for hooking up search functionalities.
    There are so many languages, so it is better to hook up a standard location library and
    use the "query" parameter when calling.
    """
    return modash_instagram_utils('languages')


@app.route("/am/instagram/locations", methods=["GET"])
def instagram_locations():
    """
    https://docs.modash.io/#tag/Instagram/paths/~1instagram~1locations/get
    This is to get the location IDs provided by Modash. Essentially this is getting the enum
    for locations, which will be used for hooking up search functionalities.
    There are so many locations, so it is better to hook up a standard location library and
    use the "query" parameter when calling.
    """
    return modash_instagram_utils('locations')


def modash_instagram_utils(endpoint_sufix):
    try:
        query_string = flask.request.args.get('query')
        limit = flask.request.args.get('limit')
        if not limit:
            limit = MAX_RESULT_LIMIT
        params = {'limit': limit}
        if query_string:
            logging.info(f'{endpoint_sufix} query string: {query_string}')
            params['query'] = query_string
        url = f'{MODASH_API_ENDPINT}/instagram/{endpoint_sufix}'
        logging.info(f'Receiving request for url {url}')
        headers = {'Authorization': MODASH_AUTH_HEADER}
        res = requests.get(url, headers=headers, params=params)
        response = flask.jsonify(res.json())
        response.status_code = 200
        return response
    except Exception as e:
        logging.error(f'{endpoint_sufix} search error: {e}')
        response = flask.jsonify({'Error': f'Failed to find {endpoint_sufix}'})
        response.status_code = 400
    return response


def get_shopify_access_token(shop):
    res = sql_handler.get_shop_auth(shop)
    return res


def shopify_products():
    shop = flask.request.args.get('shop')
    res = get_shopify_access_token(shop)
    if not res:
        res = {'status': 'access token not found'}
        response = flask.jsonify(res)
        response.status_code = 404
        return response
    shop_access_token = res

    if request.method == 'PUT':
        url = f'https://{shop}/admin/api/{API_VERSION}/products.json'
        logging.info(f'Receiving request for url {url}')
        headers = {"X-Shopify-Access-Token": shop_access_token}
        params = {'limit': MAX_SHOPIFY_RESULTS_LIMIT}
        res = requests.get(url, headers=headers, params=params)
        logging.info(f'Obtained shop information token {shop_access_token} for shop {shop}: {res.json()}')
        data = res.json()
        products = res.json().get('products')
        if products:
            for product_json in products:
                product_id = product_json.get('id')
                sql_handler.save_product_info(shop, product_id, product_json)
            logging.info(f'Saved {len(products)} for shop {shop}')
        else:
            logging.info('No products found')
    else:
        logging.info(f'Retrieving product information from shop {shop}')
        tags_count = sql_handler.get_product_tags_counts(shop)
        product_images = sql_handler.get_product_images(shop)
        data = {}
        tags_count_res = [{'vendor': row[0], 'tags': row[1], 'count': row[2]} for row in tags_count]
        images_res = [{'title': row[0], 'image': row[1], 'product_id': row[2]} for row in product_images]
        data['tags_count'] = tags_count_res
        data['product_images'] = images_res
    response = flask.jsonify(data)
    response.status_code = 200
    return response


@app.route('/am/shopify_product_info', methods=['GET', 'PUT'])
def am_shop_product_info():
    """
    This endpoint is called upon AM to access Shopify shop products for access_token
    """
    return shopify_products()


@app.route('/brand/shopify_product_info', methods=['GET', 'PUT'])
def brand_shop_product_info():
    """
    This endpoint is called upon AM to access Shopify shop products for access_token
    """
    return shopify_products()


def get_single_product():
    shop = flask.request.args.get('shop')
    product_id = flask.request.args.get('product_id')
    logging.info(f'Retrieving product information from shop {shop}')
    single_product = sql_handler.get_product_info(shop, product_id)
    if len(single_product) > 0:
        product_res = single_product[2]
        response = flask.jsonify(product_res)
        response.status_code = 200
    else:
        res = {'status': 'product not found'}
        response = flask.jsonify(res)
        response.status_code = 404
    return response


@app.route('/am/shopify_single_product', methods=['GET'])
def am_get_product_info():
    """
    This endpoint is called upon AM to access Shopify shop products for access_token
    """
    return get_single_product()


@app.route('/brand/shopify_single_product', methods=['GET'])
def brand_get_product_info():
    """
    This endpoint is called upon AM to access Shopify shop products for access_token
    """
    return get_single_product()


@app.route('/am/shopify_shop_info', methods=['GET'])
def shop_info():
    """
    This endpoint is called upon AM to access Shopify shop products for access_token
    """
    shop = flask.request.args.get('shop')
    res = get_shopify_access_token(shop)
    if not res:
        res = {'status': 'access token not found'}
        response = flask.jsonify(res)
        response.status_code = 404
        return response
    shop_access_token = res

    url = f'https://{shop}/admin/api/{API_VERSION}/shop.json'
    logging.info(f'Receiving request for url {url}')
    headers = {"X-Shopify-Access-Token": shop_access_token}
    res = requests.get(url, headers=headers)
    logging.info(f'Obtained shop information for shop {shop}: {res.json()}')
    brand_ref = db.collection('brands')
    brand_ref.document(shop).set(res.json())
    sql_handler.save_shop_info(shop, res.json())
    response = flask.jsonify(res.json())
    response.status_code = 200
    return response


@app.route('/am/shopify_customers', methods=['GET', 'PUT'])
def shop_customer_info():
    """
    This endpoint is called upon AM to access Shopify shop products for access_token
    """
    shop = flask.request.args.get('shop')
    days_range = flask.request.args.get('days_range')
    try:
        days_range = int(days_range)
    except Exception as e:
        logging.warning('Illegal days_range, revert to default value')
        days_range = DEFFAULT_DATE_RANGE
    res = get_shopify_access_token(shop)
    if not res:
        res = {'status': 'access token not found'}
        response = flask.jsonify(res)
        response.status_code = 404
        return response
    shop_access_token = res

    if request.method == 'PUT':
        created_at_min = datetime.datetime.now() - datetime.timedelta(days=days_range)
        url = f'https://{shop}/admin/api/{API_VERSION}/customers.json'
        logging.info(f'Receiving request for url {url}')
        headers = {"X-Shopify-Access-Token": shop_access_token}
        params = {'limit': MAX_SHOPIFY_RESULTS_LIMIT,
                  'created_at_min': created_at_min.isoformat()}
        res = requests.get(url, headers=headers, params=params)
        data = res.json()

        logging.info(f'Obtained shop information for shop {shop}: {data}')
        customers = data.get('customers')
        if customers:
            for customer_json in customers:
                customer_id = customer_json.get('id')
                sql_handler.save_customer_info(shop, customer_id, customer_json)
            logging.info(f'Saved {len(customers)} for shop {shop}')
        else:
            logging.info('No customers found')
    else:
        logging.info(f'Getting customer location data for shop {shop}')
        query_results = sql_handler.get_shop_customers_locations(shop)
        data = []
        for row in query_results:
            cur_res = {}
            cur_res['city'] = row[0]
            cur_res['province'] = row[1]
            cur_res['location_cnt'] = row[2]
            data.append(cur_res)
    response = flask.jsonify(data)
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
