#!/usr/bin/python

import http.client as httplib
import httplib2
import os
import random
import sys
import time
import json

import hashlib
from argparse import Namespace
import flask
from flask import Flask
from google.cloud import storage
from google.cloud.storage.blob import Blob
from apiclient.discovery import build
from apiclient.errors import HttpError
from apiclient.http import MediaFileUpload
from oauth2client.client import flow_from_clientsecrets
from oauth2client.file import Storage
from oauth2client.tools import argparser, run_flow

# from cloud_sql import sql_handler
from video_intel import video_text_reg, uri_parser
from nlp_gcp import nlp_text_sentiment


# Explicitly tell the underlying HTTP transport library not to retry, since
# we are handling retry logic ourselves.
httplib2.RETRIES = 1

# Maximum number of times to retry before giving up.
MAX_RETRIES = 10

# Always retry when these exceptions are raised.
RETRIABLE_EXCEPTIONS = (httplib2.HttpLib2Error, IOError, httplib.NotConnected,
  httplib.IncompleteRead, httplib.ImproperConnectionState,
  httplib.CannotSendRequest, httplib.CannotSendHeader,
  httplib.ResponseNotReady, httplib.BadStatusLine)

# Always retry when an apiclient.errors.HttpError with one of these status
# codes is raised.
RETRIABLE_STATUS_CODES = [500, 502, 503, 504]

# The CLIENT_SECRETS_FILE variable specifies the name of a file that contains
# the OAuth 2.0 information for this application, including its client_id and
# client_secret. You can acquire an OAuth 2.0 client ID and client secret from
# the Google API Console at
# https://console.developers.google.com/.
# Please ensure that you have enabled the YouTube Data API for your project.
# For more information about using OAuth2 to access the YouTube Data API, see:
#   https://developers.google.com/youtube/v3/guides/authentication
# For more information about the client_secrets.json file format, see:
#   https://developers.google.com/api-client-library/python/guide/aaa_client_secrets
CLIENT_SECRETS_FILE = "/tmp/client_secret_65044462485-6h2vnliteh06hllhb5n1o4g95h3v52tq.apps.googleusercontent.com.json"

# This OAuth 2.0 access scope allows an application to upload files to the
# authenticated user's YouTube channel, but doesn't allow other types of access.
YOUTUBE_UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload"
YOUTUBE_API_SERVICE_NAME = "youtube"
YOUTUBE_API_VERSION = "v3"

# This variable defines a message to display if the CLIENT_SECRETS_FILE is
# missing.
MISSING_CLIENT_SECRETS_MESSAGE = """
WARNING: Please configure OAuth 2.0

To make this sample run you will need to populate the client_secrets.json file
found at:

   %s

with information from the API Console
https://console.developers.google.com/

For more information about the client_secrets.json file format, please visit:
https://developers.google.com/api-client-library/python/guide/aaa_client_secrets
""" % os.path.abspath(os.path.join(os.path.dirname(__file__),
                                   CLIENT_SECRETS_FILE))

VALID_PRIVACY_STATUSES = ("public", "private", "unlisted")


def get_authenticated_service(args):
  """
  Currently this thing does not work out of the box with main.py.
  Instead, we may need to create a standalone API to authorize YouTube access separately.
  """
  flow = flow_from_clientsecrets(CLIENT_SECRETS_FILE,
    scope=YOUTUBE_UPLOAD_SCOPE,
    message=MISSING_CLIENT_SECRETS_MESSAGE)

  storage = Storage("%s-oauth2.json" % sys.argv[0])
  credentials = storage.get()

  if credentials is None or credentials.invalid:
    credentials = run_flow(flow, storage, args)

  return build(YOUTUBE_API_SERVICE_NAME, YOUTUBE_API_VERSION,
    http=credentials.authorize(httplib2.Http()))

def initialize_upload(youtube, options):
  """
  This code sample is from https://developers.google.com/youtube/v3/guides/uploading_a_video
  """

  tags = None
  if options.keywords:
    tags = options.keywords.split(",")

  body=dict(
    snippet=dict(
      title=options.title,
      description=options.description,
      tags=tags,
      categoryId=options.category
    ),
    status=dict(
      privacyStatus=options.privacyStatus
    )
  )

  # Call the API's videos.insert method to create and upload the video.
  insert_request = youtube.videos().insert(
    part=",".join(body.keys()),
    body=body,
    # The chunksize parameter specifies the size of each chunk of data, in
    # bytes, that will be uploaded at a time. Set a higher value for
    # reliable connections as fewer chunks lead to faster uploads. Set a lower
    # value for better recovery on less reliable connections.
    #
    # Setting "chunksize" equal to -1 in the code below means that the entire
    # file will be uploaded in a single HTTP request. (If the upload fails,
    # it will still be retried where it left off.) This is usually a best
    # practice, but if you're using Python older than 2.6 or if you're
    # running on App Engine, you should set the chunksize to something like
    # 1024 * 1024 (1 megabyte).
    media_body=MediaFileUpload(options.file, chunksize=-1, resumable=True)
  )

  resumable_upload(insert_request)

# This method implements an exponential backoff strategy to resume a
# failed upload.
def resumable_upload(insert_request):
  response = None
  error = None
  retry = 0
  while response is None:
    try:
      print("Uploading file...")
      status, response = insert_request.next_chunk()
      if response is not None:
        if 'id' in response:
          print("Video id '%s' was successfully uploaded." % response['id'])
        else:
          exit("The upload failed with an unexpected response: %s" % response)
    except HttpError as e:
      if e.resp.status in RETRIABLE_STATUS_CODES:
        error = "A retriable HTTP error %d occurred:\n%s" % (e.resp.status,
                                                             e.content)
      else:
        raise
    except RETRIABLE_EXCEPTIONS as e:
      error = "A retriable error occurred: %s" % e

    if error is not None:
      print(error)
      retry += 1
      if retry > MAX_RETRIES:
        exit("No longer attempting to retry.")

      max_sleep = 2 ** retry
      sleep_seconds = random.random() * max_sleep
      print("Sleeping %f seconds and then retrying..." % sleep_seconds)
      time.sleep(sleep_seconds)


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


def download_video_from_gcs(bucket_name, source_blob_name, destination_file_name):
    """Downloads a blob from the bucket."""
    # bucket_name = "your-bucket-name"
    # source_blob_name = "storage-object-name"
    # destination_file_name = "local/path/to/file"

    storage_client = storage.Client()

    # bucket = storage_client.bucket(bucket_name)
    blob = Blob.from_string(bucket_name + source_blob_name)
    # blob = bucket.blob(source_blob_name)
    blob.download_to_filename(destination_file_name, client=storage_client)

    print(
      "Blob {} downloaded to {}.".format(
        source_blob_name, destination_file_name
      )
    )
    return destination_file_name


def upload_video_youtube_http_gcf(request):
    """HTTP Cloud Function.
    Note: here we need the request to pass in access token.
    To deploy: 
    gcloud functions deploy upload_video_youtube_http_gcf --runtime python37 --trigger-http
    Args:
        request (flask.Request): The request object.
        <http://flask.pocoo.org/docs/1.0/api/#flask.Request>
    Returns:
        The response text, or any set of values that can be turned into a
        Response object using `make_response`
        <http://flask.pocoo.org/docs/1.0/api/#flask.Flask.make_response>.
    """
    request_json = request.get_json(silent=True)
    _upload_video_youtube_internal(request_json)


def upload_video_youtube_pubsub_gcf(event, context):
    """Background Cloud Function to be triggered by Pub/Sub.
    To deploy: 
    gcloud functions deploy upload_video_youtube_pubsub_gcf --runtime python37 --trigger-topic ytpost
    Args:
         event (dict):  The dictionary with data specific to this type of
         event. The `data` field contains the PubsubMessage message. The
         `attributes` field will contain custom attributes if there are any.
         context (google.cloud.functions.Context): The Cloud Functions event
         metadata. The `event_id` field contains the Pub/Sub message ID. The
         `timestamp` field contains the publish time.
    """
    # we are assuming the data field here is a json. Add error handling later.
    if not event or not event['data']:
        return 0
    event_message = event['data']
    print(f'the pubsub message is {event_message}')
    try:
      request_json = json.loads(event_message)
    except Exception as e:
      print(f"Load message error: {event_message}")
      return 0
    _upload_video_youtube_internal(request_json)


def _upload_video_youtube_internal(request_json):
    print(f'request json is {request_json}')
    file = download_video_from_gcs(request_json['bucket_name'], request_json['blob_name'],
                                   destination_file_name='/tmp/' + request_json['blob_name'])
    request_json['file'] = file
    args = Namespace(**request_json)
    # request_args = request.args
    write_client_secret()
    youtube = get_authenticated_service(args)
    print(args)
    try:
      initialize_upload(youtube, args)
    except HttpError as e:
      print("An HTTP error %d occurred:\n%s" % (e.resp.status, e.content))


import google.oauth2.credentials
import google_auth_oauthlib.flow

from flask import Flask

app = Flask(__name__)
app.secret_key = "super secret key"

def redirect_youtube_for_oauth_http_gcf(request):
    """
    To deploy:
    gcloud functions deploy redirect_youtube_for_oauth_http_gcf --runtime python37 --trigger-http
    This cloud function redirects the user to Google's Oauth server for proper video uploading access tokens.
    """
    write_client_secret()
    # Create a state token to prevent request forgery.
    # Store it in the session for later validation.
    state = hashlib.sha256(os.urandom(1024)).hexdigest()

    # Use the client_secret.json file to identify the application requesting
    # authorization. The client ID (from that file) and access scopes are required.
    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=[YOUTUBE_UPLOAD_SCOPE], state=state)

    # Indicate where the API server will redirect the user after the user completes
    # the authorization flow. The redirect URI is required. The value must exactly
    # match one of the authorized redirect URIs for the OAuth 2.0 client, which you
    # configured in the API Console. If this value doesn't match an authorized URI,
    # you will get a 'redirect_uri_mismatch' error.
    # flow.redirect_uri = 'https://influencer-272204.firebaseapp.com/__/auth/handler'
    flow.redirect_uri = 'https://us-central1-influencer-272204.cloudfunctions.net/oauth_handler_gcf'

    # Generate URL for request to Google's OAuth 2.0 server.
    # Use kwargs to set optional request parameters.
    authorization_url, state = flow.authorization_url(
        # Enable offline access so that you can refresh an access token without
        # re-prompting the user for permission. Recommended for web server apps.
        access_type='offline',
        # Enable incremental authorization. Recommended as a best practice.
        include_granted_scopes='true')
    # Store the state so the callback can verify the auth server response.
    # flask.session['state'] = state
    return flask.redirect(authorization_url)


def oauth_handler_gcf(request):
    """
    Handle the Oauth response after user consents to redirect_youtube_for_oauth_http_gcf().
    To deploy:
    gcloud functions deploy oauth_handler_gcf --runtime python37 --trigger-http
    """

    write_client_secret()
    print(f'current request is {request} with uri being {request.url}')

    # state = flask.session['state']
    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=[YOUTUBE_UPLOAD_SCOPE])

    flow.redirect_uri = 'https://us-central1-influencer-272204.cloudfunctions.net/oauth_handler_gcf'
    #flask.url_for('oauth2callback', _external=True)

    authorization_response = flask.request.url
    if authorization_response.startswith('http://'):
        authorization_response = authorization_response.replace('http://', 'https://', 1)
    print(f'auth response is {authorization_response}')
    flow.fetch_token(authorization_response=authorization_response)

    # Store the credentials in the session.
    # ACTION ITEM for developers:
    #     Store user's access and refresh tokens in your data store if
    #     incorporating this code into your real app.
    credentials = flow.credentials
    flask.session['credentials'] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes}
    print(credentials)
    # try:
    #   sql_handler.save_token(flask.session['credentials'])
    # except Exception as e:
    #   print(f'saving credentials to SQL error: {e}')
    return


import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

# Use the application default credentials
cred = credentials.ApplicationDefault()
firebase_admin.initialize_app(cred, {
    'projectId': 'influencer-272204',
})

db = firestore.client()


def video_text_reg_gcf(data, context):
    """
    For each video uploaded to GCS video bucket, perform text recognition, and store the results back to campaign data.
    To deploy:
    gcloud functions deploy video_text_reg_gcf --runtime python37 --trigger-resource influencer-272204.appspot.com --trigger-event google.storage.object.finalize
    :param data: The Cloud Functions event payload.
    :param context: (google.cloud.functions.Context): Metadata of triggering event.
    :return: None
    """
    print(f"receving data {data} with {context}")
    if not data['contentType'].startswith('video/'):
        print('This is not a video')
        return None

    name = data['name']
    bucket = data['bucket']
    video_uri = f'gs://{bucket}/{name}'
    try:
        uid, campaign_id, history_id = uri_parser(name)
    except Exception as e:
        print(f'Parsing video URI {video_uri} error: {e}')
        return None

    try:
        res = video_text_reg(input_uri=video_uri)
    except Exception as e:
        print(f'Annotating video {video_uri} exception: {e}')
        return None

    return (db.collection(u'campaigns').document(campaign_id)
            .collection(u'campaignHistory').document(history_id)
            .set({u'text_reg_res': res}))


def nlp_text_sentiment_gcf(request):
    """
    To deploy:
    gcloud functions deploy nlp_text_sentiment_gcf --runtime python37 --trigger-http
    Args:
        request (flask.Request): The request object.
        <http://flask.pocoo.org/docs/1.0/api/#flask.Request>
    Returns:
        The response text, or any set of values that can be turned into a
        Response object using `make_response`
        <http://flask.pocoo.org/docs/1.0/api/#flask.Flask.make_response>.
    """
    request_json = request.get_json(silent=True)
    request_args = request.args

    if request_json and 'text' in request_json:
        text = request_json['text']
    elif request_args and 'name' in request_args:
        text = request_args['text']
    else:
        return Flask.make_response(app, 'Request missing text field', code=400)
    try:
        score, magnitude = nlp_text_sentiment(text)
    except Exception as e:
        return Flask.make_response(app, f'NLP API error: {e}', code=400)
    return json.dumps({'score':  str(round(score, 2)), 'magnitude':  str(round(magnitude, 2))})
