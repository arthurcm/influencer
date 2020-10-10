# -*- coding: utf-8 -*-

import os
import flask
import json
import datetime
import time

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
# (Local Dev)
client = google.cloud.logging.Client()

# Connects the logger to the root logging handler; by default this captures
# all logs at INFO level and higher
# (Local Dev)
client.setup_logging()
logging.basicConfig(level=logging.INFO)

# This variable specifies the name of a file that contains the OAuth 2.0
# information for this application, including its client_id and client_secret.
# (Local Dev)
CLIENT_SECRETS_FILE = "/tmp/client_secret_65044462485-6h2vnliteh06hllhb5n1o4g95h3v52tq.apps.googleusercontent.com.json"
# CLIENT_SECRETS_FILE = "/Users/shuoshan/Downloads/influencer-272204-local-dev.json"

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

FIELD_DELIMITER = "_"


SEARCHABLE_AUDIENCE_LANGUAGE_PREFIX = 'languages'
SEARCHABLE_AUDIENCE_ETH_PREFIX = 'ethnicities'
SEARCHABLE_AUDIENCE_GENDER_PREFIX = 'genders'
SEARCHABLE_AUDIENCE_CITIES_PREFIX = 'geocities'
SEARCHABLE_AUDIENCE_COUNTRIES_PREFIX = 'geocountries'
SEARCHABLE_AUDIENCE_AGES_PREFIX = 'ages'
SEARCHABLE_AUDIENCE_INTERESTS_PREFIX = 'audience_interests'

SUPPORTED_FIELDS_RANGE_FILTERS = {
    "followers", "engagementRate", "paidPostPerformance"
}

SUPPORTED_FIELDS_CONTAINS_FILTERS = {
    "gender", "interests"
}

SUPPORTED_FILTER_PREFIXES = {
    SEARCHABLE_AUDIENCE_LANGUAGE_PREFIX,
    SEARCHABLE_AUDIENCE_ETH_PREFIX,
    # SEARCHABLE_AUDIENCE_GENDER_PREFIX,
    SEARCHABLE_AUDIENCE_CITIES_PREFIX,
    # SEARCHABLE_AUDIENCE_COUNTRIES_PREFIX,
    # SEARCHABLE_AUDIENCE_AGES_PREFIX,
    # SEARCHABLE_AUDIENCE_INTERESTS_PREFIX
}


DEFFAULT_DATE_RANGE = 90
MAX_SHOPIFY_RESULTS_LIMIT = 200

import firebase_admin
from firebase_admin import auth
from firebase_admin import credentials
from firebase_admin import exceptions
from firebase_admin import firestore


firebase_app = firebase_admin.initialize_app()

# here the db variable is a firestore client. We name it as "db" just to be consistent with JS side.
db = firestore.client()

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


def process_modash_profile(profile_ref, profile, platform='instagram'):
    account_profile = profile.get('profile')

    interests = profile.get('interests')
    interests_flattened = [pair.get('name') for pair in interests]

    # hashtags are in an array with tuple format, flatten it to collections so that we can sort and filter.
    hashtags = profile.get('hashtags')
    hashtags_flattened = convert_tuple_to_map(hashtags, 'hashtag', 'tag')

    mentions = profile.get('mentions')
    mentions_flattened = convert_tuple_to_map(mentions, 'mention', 'tag')

    # the following three are single valued numerics
    profile_stats = profile.get('stats')
    if profile_stats:
        avg_likes = profile_stats.get('avgLikes').get('value')
        followers = profile_stats.get('followers').get('value')
        paidPostPerformance =profile_stats.get('paidPostPerformance')
    else:
        avg_likes = profile.get('profile').get('engagements')
        followers = profile.get('profile').get('followers')
        paidPostPerformance = profile.get('profile').get('paidPostPerformance')

    # the following audience data needs to be flattened so that it can be easier to query.
    audience = profile.get('audience')
    audience_language = audience.get('languages')
    audience_language_dict = convert_tuple_to_map(audience_language, SEARCHABLE_AUDIENCE_LANGUAGE_PREFIX, 'name')

    audience_ethnicities = audience.get('ethnicities')
    audience_ethnicities_dict = convert_tuple_to_map(audience_ethnicities, SEARCHABLE_AUDIENCE_ETH_PREFIX, 'code')

    audience_credibility = audience.get('credibility')

    audience_genders = audience.get('genders')
    audience_genders_dict = convert_tuple_to_map(audience_genders, 'genders', 'code')

    audience_geoCities = audience.get('geoCities')
    audience_geoCities_dict = convert_tuple_to_map(audience_geoCities, SEARCHABLE_AUDIENCE_CITIES_PREFIX, 'name')

    audience_geoCountries = audience.get('geoCountries')
    audience_geoCountries_dict = convert_tuple_to_map(audience_geoCountries, SEARCHABLE_AUDIENCE_COUNTRIES_PREFIX, 'code')

    # audience_gendersPerAge = audience.get('gendersPerAge')

    audience_ages = audience.get('ages')
    audience_ages_dict = convert_tuple_to_map(audience_ages, SEARCHABLE_AUDIENCE_AGES_PREFIX, 'code')

    audience_interests = audience.get('interests')
    audience_interests_dict = convert_tuple_to_map(audience_interests, SEARCHABLE_AUDIENCE_INTERESTS_PREFIX, 'name')

    trans = db.transaction()

    trans.set(profile_ref, account_profile, merge=True)
    trans.set(profile_ref, hashtags_flattened, merge=True)
    trans.set(profile_ref, mentions_flattened, merge=True)
    trans.set(profile_ref, audience_language_dict, merge=True)
    trans.set(profile_ref, audience_ethnicities_dict, merge=True)
    trans.set(profile_ref, audience_genders_dict, merge=True)
    trans.set(profile_ref, audience_geoCities_dict, merge=True)
    trans.set(profile_ref, audience_geoCountries_dict, merge=True)
    trans.set(profile_ref, audience_ages_dict, merge=True)
    trans.set(profile_ref, audience_interests_dict, merge=True)
    profile_processed = {
        "profile_json": profile,
        "platform": platform,
        "avg_likes": avg_likes,
        "followers": followers,
        "paidPostPerformance": paidPostPerformance,
        "interests": interests_flattened,
        "credibility": audience_credibility
    }

    trans.set(profile_ref, profile_processed, merge=True)
    trans.commit()
    return profile_processed


def convert_tuple_to_map(tag_tuple_list, field_prefix, field_name):
    if tag_tuple_list:
        return dict({f'{field_prefix}{FIELD_DELIMITER}{pair.get(field_name)}': pair.get('weight') for pair in tag_tuple_list})
    return {}

def save_modash_profile_firebase(user_id, profile, platform='instagram'):
    profile_ref = db.document('modash', user_id)
    profile_processed = process_modash_profile(profile_ref, profile, platform)
    logging.info(f'{user_id} saving processed profile {profile_processed}')


def field_range_filter_handler(modash_profile_ref, field_range_filters):
    pass


def field_contain_filter_handler(modash_profile_ref, field_contain_filters):
    pass


def prefix_filters_handler(modash_profile_ref, prefix_filters):
    """
    The prefix filters have to be supported in SUPPORTED_FILTER_PREFIXES, and only one will be applied
    :param modash_profile_ref:
    :param prefix_filters:
          "prefix_filters": [
                {
                  "prefix": "languages",
                  "value": "Chinese",
                  "min": 0,
                  "max": 0.10
                }
              ]
    :return:
    """
    for filter in prefix_filters:
        cur_prefix = filter.get('prefix')
        cur_value = filter.get('value')
        if not cur_prefix or cur_prefix not in SUPPORTED_FILTER_PREFIXES or not cur_value:
            continue
        field_name = f'{cur_prefix}{FIELD_DELIMITER}{cur_value}'
        logging.info(f'filtering on field: {field_name}')
        cur_min = filter.get('min') or 0
        cur_max = filter.get('max') or 1
        if cur_max > 1:
            cur_max = cur_max/100
        prefix_query = modash_profile_ref.where(field_name, u'>=', cur_min).where(field_name, u'<=', cur_max)
        return prefix_query
    return modash_profile_ref


@app.route("/am/modash/match", methods=["POST"])
def modash_match():
    filters = flask.request.json
    if not filters:
        response = flask.jsonify({"error": "None empty post body required!"})
        response.status_code = 412
        return response
    field_range_filters = filters.get('field_range_filters')
    field_contain_filters = filters.get('field_contain_filters')
    prefix_filters = filters.get('prefix_filters')

    modash_profile_ref = db.collection('modash')
    if field_range_filters:
        logging.warning('Field range filters are not supported in server side')
    modash_profile_ref = prefix_filters_handler(modash_profile_ref, prefix_filters)
    snap_list = modash_profile_ref.limit(1000).get()
    results = [doc.to_dict().get('profile_json') for doc in snap_list]
    response = flask.jsonify(results)
    response.status_code = 200
    return response

def fetch_single_profile(force_update, userId, social_platform='instagram'):
    profile = None

    if not force_update:
        profile, update_time = sql_handler.get_profile(userId, platform=social_platform)
        logging.info(f'Not forcing profile update, and obtained profile {profile}')
    if not profile or len(profile) == 0:
        for i in range(0, 5):
            logging.info(f'Fetching profile from Modash for userid {userId}: # {i+1}th try')
            url = f'{MODASH_API_ENDPINT}/{social_platform}/profile/{userId}/report'
            logging.info(f'Receiving request for url {url}')
            headers = {'Authorization': MODASH_AUTH_HEADER}
            profile_res = requests.get(url, headers=headers)
            profile_json = profile_res.json()
            logging.info(f'Modash {social_platform} profile response is: {profile_res.json()}')
            profile = profile_json.get('profile')
            if profile:
                save_modash_profile_firebase(userId, profile, social_platform)
                sql_handler.save_profile(userId, social_platform, profile)
                break
            else:
                logging.warning('Modash API not responding, retrying')
                time.sleep(1)
    return profile

def modash_report(social_platform='instagram'):
    """
    This API pulls instagram, tiktok, YouTube full report from Modash
    https://api.modash.io/v1/{social_platform}/profile/{userId}/report
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

    profile = fetch_single_profile(force_update, userId, social_platform='instagram')

    if profile:
        response = flask.jsonify(profile)
        response.status_code = 200
    else:
        response = flask.jsonify({"error": f"Failed to obtain {social_platform} profile"})
        response.status_code = 400
    return response

def modash_batch_report(social_platform='instagram'):
    body = flask.request.json
    influencer_list = body['influencer_list']
    if not influencer_list or len(influencer_list) <= 0:
        response = flask.jsonify({"error": "Valid influencer ids required!"})
        response.status_code = 412
        return response

    force_update = flask.request.args.get('force_update')
    if not force_update:
        force_update = False

    influencer_profiles = {}
    for userId in influencer_list:
        profile = fetch_single_profile(force_update, userId, social_platform)
        if profile:
            influencer_profiles[userId] = profile
    
    if influencer_profiles:
        response = flask.jsonify(influencer_profiles)
        response.status_code = 200
    else:
        response = flask.jsonify({"error": f"Failed to obtain {social_platform} profile"})
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
    return modash_report('instagram')


@app.route("/am/modash/profile", methods=["GET"])
def modash_report_api():
    """
    This API pulls instagram full report from Modash
    https://api.modash.io/v1/instagram/profile/{userId}/report
    The default behavior is to use a cached version of report stored in Lifo's SQL server.
    If "force_update" parameter is true, the profile will then be updated, each pull of which costs ~$0.40
    """
    platform = flask.request.args.get('platform')
    if platform not in {'instagram', 'tiktok', 'youtube'}:
        response = flask.jsonify({"error": f"{platform} not supported"})
        response.status_code = 422
        return response
    return modash_report(platform)

@app.route("/am/modash/batch_profile", methods=["POST"])
def modash_batch_report_api():
    """
    This API pulls instagram full report from Modash
    https://api.modash.io/v1/instagram/profile/{userId}/report
    The default behavior is to use a cached version of report stored in Lifo's SQL server.
    If "force_update" parameter is true, the profile will then be updated, each pull of which costs ~$0.40
    """
    platform = flask.request.args.get('platform')
    if platform not in {'instagram', 'tiktok', 'youtube'}:
        response = flask.jsonify({"error": f"{platform} not supported"})
        response.status_code = 422
        return response
    return modash_batch_report(platform)

@app.route("/influencer/instagram/profile", methods=["GET"])
def instagram_report_influencer():
    """
    We need this endpoint to check if influencer has an Instagram account.
    This API pulls instagram full report from Modash
    https://api.modash.io/v1/instagram/profile/{userId}/report
    The default behavior is to use a cached version of report stored in Lifo's SQL server.
    If "force_update" parameter is true, the profile will then be updated, each pull of which costs ~$0.40
    """
    return modash_report('instagram')


@app.route("/influencer/modash/profile", methods=["GET"])
def modash_report_influencer():
    """
    We need this endpoint to check if influencer has an Instagram account.
    This API pulls instagram full report from Modash
    https://api.modash.io/v1/modash/profile/{userId}/report
    The default behavior is to use a cached version of report stored in Lifo's SQL server.
    If "force_update" parameter is true, the profile will then be updated, each pull of which costs ~$0.40
    """
    platform = flask.request.args.get('platform')
    if platform not in {'instagram', 'tiktok', 'youtube'}:
        response = flask.jsonify({"error": f"{platform} not supported"})
        response.status_code = 422
        return response
    return modash_report(platform)




@app.route("/brand/instagram/interests", methods=["GET"])
def instagram_interests():
    """
    https://docs.modash.io/#tag/Instagram/paths/~1instagram~interests/get
    This is to get the brands IDs provided by Modash. Essentially this is getting the enum
    for interests, which will be used for hooking up search functionalities.
    """
    return modash_utils('interests')


@app.route("/brand/modash/interests", methods=["GET"])
def modash_interests():
    """
    https://docs.modash.io/#tag/Instagram/paths/~1instagram~interests/get
    This is to get the brands IDs provided by Modash. Essentially this is getting the enum
    for interests, which will be used for hooking up search functionalities.
    """
    platform = flask.request.args.get('platform')
    if platform not in {'instagram', 'tiktok', 'youtube'}:
        response = flask.jsonify({"error": f"{platform} not supported"})
        response.status_code = 422
        return response
    return modash_utils('interests', social_platform=platform)


@app.route("/brand/instagram/brands", methods=["GET"])
def instagram_brands():
    """
    https://docs.modash.io/#tag/Instagram/paths/~1instagram~brands/get
    This is to get the brands IDs provided by Modash. Essentially this is getting the enum
    for brands, which will be used for hooking up search functionalities.
    """
    return modash_utils('brands')


@app.route("/brand/modash/brands", methods=["GET"])
def modash_brands():
    """
    https://docs.modash.io/#tag/Instagram/paths/~1instagram~brands/get
    This is to get the brands IDs provided by Modash. Essentially this is getting the enum
    for brands, which will be used for hooking up search functionalities.
    """
    platform = flask.request.args.get('platform')
    if platform not in {'instagram', 'tiktok', 'youtube'}:
        response = flask.jsonify({"error": f"{platform} not supported"})
        response.status_code = 422
        return response
    return modash_utils('brands', social_platform=platform)


@app.route("/brand/instagram/languages", methods=["GET"])
def instagram_languages():
    """
    https://docs.modash.io/#tag/Instagram/paths/~1instagram~languages/get
    This is to get the location IDs provided by Modash. Essentially this is getting the enum
    for languages, which will be used for hooking up search functionalities.
    There are so many languages, so it is better to hook up a standard location library and
    use the "query" parameter when calling.
    """
    return modash_utils('languages')


@app.route("/brand/modash/languages", methods=["GET"])
def modash_languages():
    """
    https://docs.modash.io/#tag/Instagram/paths/~1instagram~languages/get
    This is to get the location IDs provided by Modash. Essentially this is getting the enum
    for languages, which will be used for hooking up search functionalities.
    There are so many languages, so it is better to hook up a standard location library and
    use the "query" parameter when calling.
    """
    platform = flask.request.args.get('platform')
    if platform not in {'instagram', 'tiktok', 'youtube'}:
        response = flask.jsonify({"error": f"{platform} not supported"})
        response.status_code = 422
        return response
    return modash_utils('languages', social_platform=platform)


@app.route("/brand/instagram/locations", methods=["GET"])
def instagram_locations():
    """
    https://docs.modash.io/#tag/Instagram/paths/~1instagram~1locations/get
    This is to get the location IDs provided by Modash. Essentially this is getting the enum
    for locations, which will be used for hooking up search functionalities.
    There are so many locations, so it is better to hook up a standard location library and
    use the "query" parameter when calling.
    """
    return modash_utils('locations')


@app.route("/brand/modash/locations", methods=["GET"])
def modash_locations():
    """
    https://docs.modash.io/#tag/Instagram/paths/~1instagram~1locations/get
    This is to get the location IDs provided by Modash. Essentially this is getting the enum
    for locations, which will be used for hooking up search functionalities.
    There are so many locations, so it is better to hook up a standard location library and
    use the "query" parameter when calling.
    """
    platform = flask.request.args.get('platform')
    if platform not in {'instagram', 'tiktok', 'youtube'}:
        response = flask.jsonify({"error": f"{platform} not supported"})
        response.status_code = 422
        return response
    return modash_utils('locations', social_platform=platform)


def modash_utils(endpoint_suffix, social_platform='instagram'):
    try:
        query_string = flask.request.args.get('query')
        limit = flask.request.args.get('limit')
        if not limit:
            limit = MAX_RESULT_LIMIT
        params = {'limit': limit}
        if query_string:
            logging.info(f'{endpoint_suffix} query string: {query_string}')
            params['query'] = query_string
        url = f'{MODASH_API_ENDPINT}/{social_platform}/{endpoint_suffix}'
        logging.info(f'Receiving request for url {url}')
        headers = {'Authorization': MODASH_AUTH_HEADER}
        res = requests.get(url, headers=headers, params=params)
        response = flask.jsonify(res.json())
        response.status_code = 200
        return response
    except Exception as e:
        logging.error(f'{endpoint_suffix} search error: {e}')
        response = flask.jsonify({'Error': f'Failed to find {endpoint_suffix}'})
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
        response.status_code = 204
        return response
    shop_access_token = res

    #TODO: no need to get shop info every time.
    shop_info = get_shopify_shop_info(shop)

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


def get_single_product(external_facing=True):
    shop = flask.request.args.get('shop')
    product_id = flask.request.args.get('product_id')
    logging.info(f'Retrieving product information from shop {shop}')
    single_product = sql_handler.get_product_info(shop, product_id)

    # this is to make sure that we get shop information
    shop_info = get_shopify_shop_info(shop)
    logging.info(f'Retrieving shop information {shop_info}')

    if len(single_product) > 0:
        product_res = single_product[2]
        response = flask.jsonify(product_res)
        response.status_code = 200
    else:
        res = {'status': 'product not found'}
        response = flask.jsonify(res)
        if external_facing:
            response.status_code = 200
        else:
            response.status_code = 404
    return response


@app.route('/am/shopify_single_product', methods=['GET'])
def am_get_product_info():
    """
    This endpoint is called upon AM to access Shopify shop products for access_token
    """
    return get_single_product(external_facing=False)


@app.route('/brand/shopify_single_product', methods=['GET'])
def brand_get_product_info():
    """
    This endpoint is called upon AM to access Shopify shop products for access_token
    """
    return get_single_product()


def get_shopify_shop_info(shop):
    shop_info_ref = db.document('brands', shop).get()
    if shop_info_ref.to_dict():
        logging.info('Shop info exists. Skip pulling it from Shopify API.')
        return shop_info_ref.to_dict()
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
    return res.json()


@app.route('/am/shopify_shop_info', methods=['GET'])
def shop_info():
    """
    This endpoint is called upon AM to access Shopify shop products for access_token
    """
    shop = flask.request.args.get('shop')
    shop_info = get_shopify_shop_info(shop)
    if type(shop_info) is flask.Response:
        return shop_info
    response = flask.jsonify(shop_info)
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


def get_shopify_shop_info(shop):
    shop_info_ref = db.document('brands', shop).get()
    if shop_info_ref.to_dict():
        logging.info('Shop info exists. Skip pulling it from Shopify API.')
        return shop_info_ref.to_dict()
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
    return res.json()


@app.route('/brand/create_campaign_payment', methods=['POST'])
def create_campaign_payment():
    """
    This endpoint is called when brand create a commission based campaign.
    He/she will need to complete payment before 
    """
    campaign_info = flask.request.json
    # TODO: Idealy we get shop from token
    shop = campaign_info['shop']
    res = get_shopify_access_token(shop)
    if not res:
        res = {'status': 'access token not found'}
        response = flask.jsonify(res)
        response.status_code = 404
        return response
    shop_access_token = res

    campaign_id = campaign_info['campaign_id']
    campaign_ref = db.collection('brand_campaigns').document(campaign_id)
    campaign = campaign_ref.get()
    if not campaign.exists:
        res = {'status': 'campaign not found'}
        response = flask.jsonify(res)
        response.status_code = 400
        return response
    campaign_data = campaign.to_dict()
    campaign_name = campaign_data.get('campaign_name')

    url = f'https://{shop}/admin/api/{API_VERSION}/application_charges.json'
    logging.info(f'Receiving request for url {url}')
    headers = {"X-Shopify-Access-Token": shop_access_token}
    payload = {
        'application_charge': {
            'name': f'Upfront Payment for Campaign {campaign_name}',
            'price': campaign_info['due_amount'],
            'return_url': f"http://login.lifo.ai/app/complete-campaign-payment/{campaign_id}",
            'test': True
        }
    }

    app.logger.info(f'paylod {json.dumps(payload)}')
    res = requests.post(url, json=payload, headers=headers)
    logging.info(f'Create application charge for {shop}: {res.json()}')
    campaign_ref.set(res.json(), merge=True)
    response = flask.jsonify(res.json())
    response.status_code = 200
    return response


@app.route('/brand/retrieve_campaign_charge', methods=['GET'])
def retrieve_campaign_payment():
    # TODO: Idealy we get shop from token
    shop = flask.request.args.get('shop')
    res = get_shopify_access_token(shop)
    if not res:
        res = {'status': 'access token not found'}
        response = flask.jsonify(res)
        response.status_code = 404
        return response
    shop_access_token = res

    charge_id = flask.request.args.get('charge_id')
    url = f'https://{shop}/admin/api/{API_VERSION}/application_charges/{charge_id}.json'
    logging.info(f'Receiving request for url {url}')
    headers = {"X-Shopify-Access-Token": shop_access_token}
    res = requests.get(url, headers=headers)
    logging.info(f'Retrieve charge id for {shop}: {res.json()}')
    # Status could be pending, accepted, declined
    response = flask.jsonify(res.json())
    response.status_code = 200
    return response


@app.route('/brand/create_order', methods=['POST'])
def create_shopify_order():
    """
    This endpoint is called to 
    """
    campaign_info = flask.request.json
    shop = campaign_info['shop']
    res = get_shopify_access_token(shop)
    if not res:
        res = {'status': 'access token not found'}
        response = flask.jsonify(res)
        response.status_code = 404
        return response
    shop_access_token = res

    campaign_id = campaign_info['campaign_id']
    campaign_ref = db.collection('brand_campaigns').document(campaign_id)
    campaign = campaign_ref.get()
    if not campaign.exists:
        res = {'status': 'campaign not found'}
        response = flask.jsonify(res)
        response.status_code = 400
        return response
    influencer_ref = campaign_ref.collection('influencers').document(campaign_info['account_id'])
    influencer = influencer_ref.get()
    if not influencer.exists:
        res = {'status': 'influencer not found'}
        response = flask.jsonify(res)
        response.status_code = 400
        return response
    
    url = f'https://{shop}/admin/api/{API_VERSION}/orders.json'
    logging.info(f'Receiving request for url {url}')
    headers = {"X-Shopify-Access-Token": shop_access_token}
    payload = {
        "order": {
            "email": campaign_info['email'],
            "shipping_address": {
                "first_name": campaign_info['first_name'],
                "last_name": campaign_info['last_name'],
                "address1": campaign_info['address_line_1'],
                "address2": campaign_info['address_line_2'],
                "phone": campaign_info['phone_number'],
                "city": campaign_info['city'],
                "province": campaign_info['province'],
                "country": campaign_info['country'],
                "zip": campaign_info['zip']
            },
            "line_items": [
                {
                    "variant_id": campaign_info['variant_id'],
                    "quantity": 1
                }
            ],
            "financial_status": "paid"
        }
    }   

    app.logger.info(f'paylod {json.dumps(payload)}')
    res = requests.post(url, json=payload, headers=headers)
    logging.info(f'Create order for {shop}: {res.json()}')
    influencer_ref.set(res.json(), merge=True)
    response = flask.jsonify(res.json())
    response.status_code = 200
    return response

@app.route('/brand/view_order', methods=['GET'])
def view_shopify_order():
    """
    This endpoint is called to 
    """
    shop = flask.request.args.get('shop')
    order_id = flask.request.args.get('order_id')
    res = get_shopify_access_token(shop)
    if not res:
        res = {'status': 'access token not found'}
        response = flask.jsonify(res)
        response.status_code = 404
        return response
    shop_access_token = res

    url = f'https://{shop}/admin/api/{API_VERSION}/orders/{order_id}.json'
    logging.info(f'Receiving request for url {url}')
    headers = {"X-Shopify-Access-Token": shop_access_token}
    res = requests.get(url, headers=headers)
    logging.info(f'get order for {shop}: {res.json()}')
    # Status could be pending, accepted, declined
    response = flask.jsonify(res.json())
    response.status_code = 200
    return response

@app.route('/brand/update_order', methods=['PUT'])
def update_shopify_order():  
    order_info = flask.request.json
    shop = order_info['shop']
    res = get_shopify_access_token(shop)
    if not res:
        res = {'status': 'access token not found'}
        response = flask.jsonify(res)
        response.status_code = 404
        return response
    shop_access_token = res

    campaign_id = order_info['campaign_id']
    campaign_ref = db.collection('brand_campaigns').document(campaign_id)
    campaign = campaign_ref.get()
    if not campaign.exists:
        res = {'status': 'campaign not found'}
        response = flask.jsonify(res)
        response.status_code = 400
        return response
    influencer_ref = campaign_ref.collection('influencers').document(order_info['account_id'])
    influencer = influencer_ref.get()
    if not influencer.exists:
        res = {'status': 'influencer not found'}
        response = flask.jsonify(res)
        response.status_code = 400
        return response

    influencer_data = influencer.to_dict()
    order_id = ''
    if influencer_data.get('order') and influencer_data.get('order').get('id'):
        order_id = influencer_data.get('order').get('id')
    if not order_id:
        res = {'status': 'order not found'}
        response = flask.jsonify(res)
        response.status_code = 400
        return response

    url = f'https://{shop}/admin/api/{API_VERSION}/orders/{order_id}.json'
    logging.info(f'Receiving request for url {url}')
    headers = {"X-Shopify-Access-Token": shop_access_token}
    res = requests.get(url, headers=headers)
    logging.info(f'get order for {shop}: {res.json()}')
    # Status could be pending, accepted, declined
    order_data = res.json()
    # If Shipping Info
    if (order_data['order']['fulfillments'] and len(order_data['order']['fulfillments']) > 0):
        shipping_info = {
            'tracking_number': order_data['order']['fulfillments'][0]['tracking_number'],
            'carrier': order_data['order']['fulfillments'][0]['tracking_company'] 
        }
        order_data['shipping_info'] = shipping_info
        order_data['product_ship_time'] = datetime.datetime.fromisoformat(order_data['order']['fulfillments'][0]['created_at']).timestamp()
    influencer_ref.set(order_data, merge=True)
    response = flask.jsonify(order_data)
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
