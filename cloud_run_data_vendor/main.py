# -*- coding: utf-8 -*-

import os
import flask
import json

from validator_collection import checkers

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

VALID_PRIVACY_STATUSES = ("public", "private", "unlisted")

import firebase_admin
from firebase_admin import auth
from firebase_admin import exceptions


firebase_app = firebase_admin.initialize_app()

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
        if flask.session.get('uid'):
            logging.info('request has been verified')
            return
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
        if (request.path.startswith('/brand') and not decoded_token.get('store_account'))\
                or (request.path.startswith('/influencer') and decoded_token.get('store_account')):
            response = flask.jsonify({"status": "not authorized"})
            response.status_code = 403
            return response

        flask.session['uid'] = uid
        flask.session['from_shopify'] = decoded_token.get('from_shopify')
        flask.session['store_account'] = decoded_token.get('store_account')
    else:
        logging.debug(f'By passing auth for request {request.path}')


# TODO: Add RBAC control!!!
@app.route("/instagram/search", methods=["POST"])
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

# TODO: Add RBAC control!!!
@app.route("/instagram/profile", methods=["GET"])
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

# TODO: Add RBAC control!!!
@app.route("/instagram/interests", methods=["GET"])
def instagram_interests():
    """
    https://docs.modash.io/#tag/Instagram/paths/~1instagram~interests/get
    This is to get the brands IDs provided by Modash. Essentially this is getting the enum
    for interests, which will be used for hooking up search functionalities.
    """
    return modash_instagram_utils('interests')


# TODO: Add RBAC control!!!
@app.route("/instagram/brands", methods=["GET"])
def instagram_brands():
    """
    https://docs.modash.io/#tag/Instagram/paths/~1instagram~brands/get
    This is to get the brands IDs provided by Modash. Essentially this is getting the enum
    for brands, which will be used for hooking up search functionalities.
    """
    return modash_instagram_utils('brands')


# TODO: Add RBAC control!!!
@app.route("/instagram/languages", methods=["GET"])
def instagram_languages():
    """
    https://docs.modash.io/#tag/Instagram/paths/~1instagram~languages/get
    This is to get the location IDs provided by Modash. Essentially this is getting the enum
    for languages, which will be used for hooking up search functionalities.
    There are so many languages, so it is better to hook up a standard location library and
    use the "query" parameter when calling.
    """
    return modash_instagram_utils('languages')

# TODO: Add RBAC control!!!
@app.route("/instagram/locations", methods=["GET"])
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
