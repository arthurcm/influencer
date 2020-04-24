#!/usr/bin/python

import http.client as httplib
import httplib2
import os
import random
import sys
import time
import json

from argparse import Namespace
import flask
from google.cloud import storage
from google.cloud.storage.blob import Blob
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload
from oauth2client.client import flow_from_clientsecrets
from oauth2client.file import Storage
from oauth2client.tools import run_flow

from video_intel import video_text_reg, uri_parser
from nlp_gcp import nlp_text_sentiment
from cv_gcp import web_entities_include_geo_results_uri
from gcp_utils import get_secret
from email_util import send_welcome_email, share_draft_email

# Imports the Google Cloud client library
import google.cloud.logging
# Imports Python standard library logging
import logging

# Instantiates a client
client = google.cloud.logging.Client()

# Connects the logger to the root logging handler; by default this captures
# all logs at INFO level and higher
client.setup_logging()

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


def write_client_secret():

    # Writing to sample.json
    if not os.path.exists(CLIENT_SECRETS_FILE):
        json_str = get_secret()
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

from flask import Flask

app = Flask(__name__)
app.secret_key = "super secret key"


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
        uid, campaign_id, history_id, _ = uri_parser(name)
    except Exception as e:
        print(f'Parsing video URI {video_uri} error: {e}')
        return None

    try:
        res = video_text_reg(input_uri=video_uri)
    except Exception as e:
        print(f'Annotating video {video_uri} exception: {e}')
        return None

    return (db.collection(u'campaigns').document(campaign_id)
            .collection(u'videos').document(history_id) # note: here we use the campaign history_id to distinct videos
            .set({u'text_reg_res': res}, merge=True))


def web_entities_detection_gcf(data, context):
    """
    For each image uploaded to GCS image bucket, perform entities detection.
    To deploy:
    (form local)
    gcloud functions deploy web_entities_detection_gcf --runtime python37 --trigger-resource influencer-272204.appspot.com --trigger-event google.storage.object.finalize
    or (remotely)
    gcloud functions deploy web_entities_detection_gcf --source https://source.developers.google.com/projects/influencer-272204/repos/github_rnap_influencer/moveable-aliases/first/paths/python_functions/ --runtime python37 --trigger-resource influencer-272204.appspot.com --trigger-event google.storage.object.finalize

    :param data: The Cloud Functions event payload.
    :param context: (google.cloud.functions.Context): Metadata of triggering event.
    :return: None
    """
    logging.info(f"receving data {data} with {context}")
    if not data['contentType'].startswith('image/'):
        logging.info('This is not an image')
        return None

    name = data['name']
    bucket = data['bucket']
    image_uri = f'gs://{bucket}/{name}'
    try:
        uid, campaign_id, history_id, file_name = uri_parser(name)
    except Exception as e:
        print(f'Parsing image URI {image_uri} error: {e}')
        return None
    res = web_entities_include_geo_results_uri(image_uri)
    # note: here we use the campaign history_id to distinct videos
    return (db.collection(u'campaigns').document(campaign_id)
            .collection(u'images').document(history_id)
            .collection(u'single_image').document(file_name)
            .set({u'entity_detect_res': res}, merge=True))


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


def send_welcome_email_gcf(data, context):
    """
    gcloud functions deploy send_welcome_email_gcf --trigger-event providers/firebase.auth/eventTypes/user.create --trigger-resource influencer-272204 --runtime python37
    This function sends out a welcoming email for any new user sign up.
    """
    send_welcome_email(data, context)


def share_draft_email_gcf(request):
    """
    gcloud functions deploy share_draft_email_gcf --trigger-event providers/firebase.auth/eventTypes/user.create --trigger-resource influencer-272204 --runtime python37
    This function sends out a welcoming email for any new user sign up.
    """
    share_draft_email(data, context)



