# -*- coding: utf-8 -*-

import os
import flask
import json

from flask import request
from flask_cors import CORS

# Imports the Google Cloud client library
import google.cloud.logging
import logging

from email_util import share_draft_email
from cloud_sql import sql_handler

# Instantiates a client
client = google.cloud.logging.Client()

# Connects the logger to the root logging handler; by default this captures
# all logs at INFO level and higher
client.setup_logging()

# This variable specifies the name of a file that contains the OAuth 2.0
# information for this application, including its client_id and client_secret.
CLIENT_SECRETS_FILE = "/tmp/client_secret_65044462485-6h2vnliteh06hllhb5n1o4g95h3v52tq.apps.googleusercontent.com.json"

VALID_PRIVACY_STATUSES = ("public", "private", "unlisted")

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
    logging.info(f'Receiving request {data}')
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
    Don't confuse this one with shopify webhook.
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
    logging.info(f'Receiving request {data}')
    if not data.get('shop') or not data.get('order_id') or not data.get('customer_id'):
        logging.warning(f'Invalid shop/customer data received {data}')
    elif not data.get('lifo_tracker_id'):
        logging.debug(f'Skip none lifo event {data}')
    else:
        try:
            res = sql_handler.save_order_complete(data)
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
    This is the endpoint for shopify orders_paid webhook.

    """
    data = flask.request.json
    logging.info(f'Receiving request {data}')
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
