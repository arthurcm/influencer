# Imports from the Python standard library
from __future__ import print_function
import os
import sys
import textwrap
import datetime

import firebase_admin
from firebase_admin import auth, exceptions
from google.cloud import firestore

# Imports the Google Cloud client library
import google.cloud.logging
import logging

# Instantiates a client
client = google.cloud.logging.Client()

# Connects the logger to the root logging handler; by default this captures
# all logs at INFO level and higher
client.setup_logging()

firebase_app = firebase_admin.initialize_app()

# here the db variable is a firestore client. We name it as "db" just to be consistent with JS side.
db = firestore.Client()

LIFO_CALENDAR_EVENT_SIGNATURE = " -- Created by Lifo.ai"

ACCOUNT_MANAGER_FLAG = 'account_manager'
STORE_ACCOUNT = 'store_account'
FROM_SHOPIFY = 'from_shopify'

BRAND_CAMPAIGN_COLLECTIONS = 'brand_campaigns'
INFLUENCER_COLLECTIONS = 'influencers'
EMAILS_COLLECTIONS = 'emails'

# Imports from third-party modules that this project depends on
try:
    import requests
    import flask
    from flask import Flask, render_template, request
    from flask_cors import CORS
    from werkzeug.middleware.proxy_fix import ProxyFix
    from werkzeug.utils import secure_filename
    from flask_dance.contrib.nylas import make_nylas_blueprint, nylas
except ImportError:
    message = textwrap.dedent(
        """
        You need to install the dependencies for this project.
        To do so, run this command:

            pip install -r requirements.txt
    """
    )
    print(message, file=sys.stderr)
    sys.exit(1)

try:
    from nylas import APIClient
except ImportError:
    message = textwrap.dedent(
        """
        You need to install the Nylas SDK for this project.
        To do so, run this command:

            pip install nylas
    """
    )
    print(message, file=sys.stderr)
    sys.exit(1)

# This example uses Flask, a micro web framework written in Python.
# For more information, check out the documentation: http://flask.pocoo.org
# Create a Flask app, and load the configuration file.
app = Flask(__name__)
CORS(app)
app.config.from_json("config.json")
app.config['UPLOAD_FOLDER'] = '/tmp/upload/'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # limit the upload file size to be 16MB

# Check for dummy configuration values.
# If you are building your own application based on this example,
# you can remove this check from your code.
cfg_needs_replacing = [
    key
    for key, value in app.config.items()
    if isinstance(value, str) and value.startswith("replace me")
]
if cfg_needs_replacing:
    message = textwrap.dedent(
        """
        This example will only work if you replace the fake configuration
        values in `config.json` with real configuration values.
        The following config values need to be replaced:
        {keys}
        Consult the README.md file in this directory for more information.
    """
    ).format(keys=", ".join(cfg_needs_replacing))
    print(message, file=sys.stderr)
    sys.exit(1)

# Use Flask-Dance to automatically set up the OAuth endpoints for Nylas.
# For more information, check out the documentation: http://flask-dance.rtfd.org
nylas_bp = make_nylas_blueprint()
app.register_blueprint(nylas_bp, url_prefix="/login")

# Teach Flask how to find out that it's behind an ngrok proxy
app.wsgi_app = ProxyFix(app.wsgi_app)


# Define what Flask should do when someone visits the root URL of this website.
@app.route("/")
def index():
    # If the user has already connected to Nylas via OAuth,
    # `nylas.authorized` will be True. Otherwise, it will be False.
    if not nylas.authorized:
        # OAuth requires HTTPS. The template will display a handy warning,
        # unless we've overridden the check.
        return render_template(
            "before_authorized.html",
            insecure_override=os.environ.get("OAUTHLIB_INSECURE_TRANSPORT"),
        )

    # If we've gotten to this point, then the user has already connected
    # to Nylas via OAuth. Let's set up the SDK client with the OAuth token:
    nylas_client = APIClient(
        app_id=app.config["NYLAS_OAUTH_CLIENT_ID"],
        app_secret=app.config["NYLAS_OAUTH_CLIENT_SECRET"],
        access_token=nylas.access_token,
    )

    # We'll use the Nylas client to fetch information from Nylas
    # about the current user, and pass that to the template.
    account = nylas_client.account
    return render_template("after_authorized.html", account=account)


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
    id_token = flask.request.headers.get('Authorization') \
               or flask.request.args.get('id_token') \
               or flask.session.get('id_token')
    if not id_token:
        logging.error('Valid id_token required')
        response = flask.jsonify({"status": "not authorized"})
        response.status_code = 403
        return response
    decoded_token = token_verification(id_token)
    uid = decoded_token['uid']
    if not uid:
        logging.error('id_token verification failed')
        response = flask.jsonify({'status': 'id_token verification failed'})
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
    flask.session['id_token'] = id_token
    flask.session[FROM_SHOPIFY] = decoded_token.get(FROM_SHOPIFY)
    flask.session[STORE_ACCOUNT] = decoded_token.get(STORE_ACCOUNT)
    flask.session[ACCOUNT_MANAGER_FLAG] = decoded_token.get(ACCOUNT_MANAGER_FLAG)
    flask.session['name'] = decoded_token.get('name')
    flask.session['email'] = decoded_token.get('email')


@app.route("/authorize")
def authorize():
    """
    This API authenticate for a chosen scope, and saves the nylas access code to cloud sql.
    Note: this API is the single entry point for authorization flow, and it will deactivate all previous access tokens
    for the given Nylas id.
    :return: flask response, 200 if success, 400 if failed.
    """
    from cloud_sql import sql_handler
    nylas_code = flask.request.args.get('code')
    error = flask.request.args.get('error')

    uid = flask.session['uid']
    logging.info(f'verifying auth sync status for uid {uid}')
    access_token = sql_handler.get_nylas_access_token(uid)

    # this is to handle potential authorization errors including access denied by customers.
    if error:
        logging.error(f'Authorization failed due to error: {error}')
        response = flask.jsonify(error)
        response.status_code = 400
        return response
    nylas_client = APIClient(app_id=app.config["NYLAS_OAUTH_CLIENT_ID"],
                             app_secret=app.config["NYLAS_OAUTH_CLIENT_SECRET"])
    if not nylas_code:
        scope = flask.request.args.get('scope')
        if not scope:
            logging.error('Need a valid scope string, currently supporting: calendar,email.send,email.modify')
            scope = 'calendar,email.send,email.modify'
        redirect_url = 'http://auth.lifo.ai/authorize'
        logging.info(f'receiving request for scope {scope}, and redirect to {redirect_url}')
        flask.session['scope'] = scope

        # Redirect your user to the auth_url
        auth_url = nylas_client.authentication_url(
            redirect_url,
            scopes=scope
        )
        return flask.redirect(auth_url)
    else:
        # note, here we have not handled the declined auth case
        logging.info(f'authentication success with code: {nylas_code}')
        access_token = nylas_client.token_for_code(nylas_code)
        nylas_client = APIClient(
            app_id=app.config["NYLAS_OAUTH_CLIENT_ID"],
            app_secret=app.config["NYLAS_OAUTH_CLIENT_SECRET"],
            access_token=access_token,
        )

        # Revoke all tokens except for the new one
        nylas_client.revoke_all_tokens(keep_access_token=access_token)

        account = nylas_client.account
        nylas_account_id = account.id

        uid = flask.session['uid']
        scope = flask.session['scope']
        logging.info(f'handling auth for firebase uid: {uid} for scope {scope} and nylas id {nylas_account_id}')

        # Note: here we automatically handle the Nylas id changing case, as each user is recognized by their firebase
        # uid, and any new Nylas ids will be overwritten. This does bring in limitations: a user can only authorize one
        # Calendar account, which is not an issue for foreseeable future.
        sql_handler.save_nylas_token(uid, nylas_access_token=access_token, nylas_account_id=nylas_account_id)
    response = flask.jsonify({'status': 'OK'})
    response.status_code = 200
    return response


@app.route("/revoke_auth", methods=["DELETE"])
def revoke_auth():
    """
    This API essentially unauthorize and removes the customer from the Nylas authentication, along with auth for the
    Calendar and email accounts.
    """

    from cloud_sql import sql_handler
    uid = flask.session['uid']
    access_token = sql_handler.get_nylas_access_token(uid)
    if not access_token:
        logging.info(f'The account {uid} has not authorized yet')
        response = flask.jsonify({'status': 'no auth'})
        response.status_code = 402
        return response
    nylas_client = APIClient(
        app_id=app.config["NYLAS_OAUTH_CLIENT_ID"],
        app_secret=app.config["NYLAS_OAUTH_CLIENT_SECRET"],
        access_token=access_token,
    )
    nylas_client.revoke_all_tokens()
    response = flask.jsonify('OK')
    response.status_code = 200
    return response


@app.route("/verify_auth_status", methods=["GET"])
def verify_auth_status():
    """
    This is an API that verifies the authorization status. Called when user loads up the page.
    """
    from cloud_sql import sql_handler
    uid = flask.session['uid']
    logging.info(f'verifying auth sync status for uid {uid}')
    access_token = sql_handler.get_nylas_access_token(uid)
    if not access_token:
        logging.info(f'The account {uid} has not authorized yet')
        response = flask.jsonify({'status': 'no auth'})
        response.status_code = 402
        return response
    try:
        nylas_client = APIClient(
            app_id=app.config["NYLAS_OAUTH_CLIENT_ID"],
            app_secret=app.config["NYLAS_OAUTH_CLIENT_SECRET"],
            access_token=access_token,
        )
        sync_state = nylas_client.account.sync_state
        logging.info(f'Current syncing status is {sync_state}')
        logging.info(f'The account {uid} is in sync')
        response = flask.jsonify('OK')
        response.status_code = 200
        return response
    except Exception as e:

        # Here we simplify the status into binary cases.
        # for more statuses, check https://docs.nylas.com/reference#account-sync-status
        logging.warning(f'The account {uid} need resync')
        response = flask.jsonify({'status': 'Need resync'})
        response.status_code = 200
        return response


def event_to_dict(event):
    return {
        'id': event.id,
        'title': event.title,
        'when': event.when,
        'status': event.status,
        'busy': event.busy,
        'owner': event.owner,
        'participants': event.participants,
        'location': event.location,
        'calendar_id': event.calendar_id,
        'account_id': event.account_id
    }


@app.route("/get_lifo_events", methods=["GET"])
def get_lifo_events():
    """
    Currently we rely on the hardcoded LIFO_CALENDAR_EVENT_SIGNATURE for events filtering.
    In future we may want to save all the events created by our product, and then get accordingly. 
    But this will force us to fully manage the events life cycle.
    """
    from cloud_sql import sql_handler
    uid = flask.session.get('uid')
    access_token = sql_handler.get_nylas_access_token(uid)
    if not access_token:
        logging.info(f'The account {uid} has not authorized yet')
        response = flask.jsonify({'status': 'no auth'})
        response.status_code = 402
        return response
    nylas_client = APIClient(
        app_id=app.config["NYLAS_OAUTH_CLIENT_ID"],
        app_secret=app.config["NYLAS_OAUTH_CLIENT_SECRET"],
        access_token=access_token
    )
    events = nylas_client.events.where(description=LIFO_CALENDAR_EVENT_SIGNATURE)
    logging.info(f'Found events {str(events)}')
    response = flask.jsonify([event_to_dict(event) for event in events])
    response.status_code = 200
    return response


@app.route("/events/<event_id>", methods=["GET", "PUT", "DELETE"])
def events(event_id):
    from cloud_sql import sql_handler
    if not event_id:
        logging.error('Need a valid event id')
        response = flask.jsonify('Need a valid event id')
        response.status_code = 400
        return response
    uid = flask.session.get('uid')
    access_token = sql_handler.get_nylas_access_token(uid)
    if not access_token:
        logging.info(f'The account {uid} has not authorized yet')
        response = flask.jsonify({'status': 'no auth'})
        response.status_code = 402
        return response
    nylas_client = APIClient(
        app_id=app.config["NYLAS_OAUTH_CLIENT_ID"],
        app_secret=app.config["NYLAS_OAUTH_CLIENT_SECRET"],
        access_token=access_token
    )
    try:
        if flask.request.method == "GET":
            event = nylas_client.events.get(event_id)
            response = flask.jsonify(event_to_dict(event))
            response.status_code = 200
            return response
        elif flask.request.method == "DELETE":
            nylas_client.events.delete(event_id, notify_participants='true')
            response = flask.jsonify('{Status: OK}')
            response.status_code = 200
            return response
        elif flask.request.method == "PUT":
            data = flask.request.json
            event = nylas_client.events.where(event_id=event_id).first()
            if not event:
                response = flask.jsonify('unable to modify event')
                response.status_code = 400
                return response
            event = update_event_from_json(event, data, event.calendar_id)
            event.save(notify_participants='true')
            logging.info('Calendar event updated successfully')
            response = flask.jsonify('Calendar event updated successfully')
            response.status_code = 200
            return response
    except Exception as e:
        response = flask.jsonify(str(e))
        response.status_code = 400
        return response


def update_event_from_json(event, data, calendar_id):
    event.title = data.get('title')
    event.location = data.get('location')

    # we hardcode the description to be our signature here
    # this is to allow easy filtering on the events.
    event.description = LIFO_CALENDAR_EVENT_SIGNATURE
    event.busy = True

    # Provide the appropriate id for a calendar to add the event to a specific calendar
    event.calendar_id = calendar_id

    # Participants are added as a list of dictionary objects
    # email is required, name is optional
    event.participants = data.get('participants')

    # The event date/time can be set in one of 3 ways.
    # For details: https://docs.nylas.com/reference#event-subobjects
    event.when = data.get('when')
    return event


@app.route("/create_calendar_event", methods=["POST"])
def create_calendar_event():
    from cloud_sql import sql_handler
    uid = flask.session.get('uid')
    data = flask.request.json
    logging.info(f'Receiving request {data} for session uid {uid}')
    access_token = sql_handler.get_nylas_access_token(uid)
    if not access_token:
        response = flask.jsonify({'status': 'no auth'})
        response.status_code = 402
        return response
    nylas = APIClient(
        app_id=app.config["NYLAS_OAUTH_CLIENT_ID"],
        app_secret=app.config["NYLAS_OAUTH_CLIENT_SECRET"],
        access_token=access_token
    )

    # Most user accounts have multiple calendars where events are stored
    calendars = nylas.calendars.all()
    calendar_id = ''
    for calendar in calendars:
        # Print the name and description of each calendar and whether or not the calendar is read only
        logging.info("Name: {} | Description: {} | Read Only: {} | ID: {}".format(
            calendar.name, calendar.description, calendar.read_only, calendar.id))
        if calendar.read_only:
            continue
        calendar_id = calendar.id
        logging.info(f'Found a valid writable calendar {calendar.name}')
    if not calendar_id:
        response = flask.jsonify({'status': 'No writable calendar found!'})
        response.status_code = 400
        return response

    # Create a new event
    event = nylas.events.create()
    event = update_event_from_json(event, data, calendar_id)

    # .save()must be called to save the event to the third party provider
    # The event object must have values assigned to calendar_id and when before you can save it.
    event.save(notify_participants='true')
    # notify_participants='true' will send a notification email to
    # all email addresses specified in the participant subobject
    logging.info('calendar event created successfully')
    response = flask.jsonify('calendar event created successfully')
    response.status_code = 200
    return response


@app.route("/send_email", methods=["POST"])
def send_email():
    from cloud_sql import sql_handler
    uid = flask.session.get('uid')
    data = flask.request.json
    logging.info(f'Receiving request {data} for session uid {uid}')
    access_token = sql_handler.get_nylas_access_token(uid)
    if not access_token:
        response = flask.jsonify({'status': 'no auth'})
        response.status_code = 402
        return response
    logging.info(f'Retrieved Nylas access token {access_token}')
    nylas = APIClient(
        app_id=app.config["NYLAS_OAUTH_CLIENT_ID"],
        app_secret=app.config["NYLAS_OAUTH_CLIENT_SECRET"],
        access_token=access_token
    )
    try:
        draft = nylas.drafts.create()
        draft.subject = data.get('subject')
        draft.body = data.get('body')
        draft.to = data.get('to')
        draft.cc = data.get('cc')
        draft.send()
        logging.info('email sent successfully')
        response = flask.jsonify('email sent successfully')
        response.status_code = 200
        return response
    except Exception as e:
        logging.error(f'Sending email failed! Error message is {str(e)}')
        response = flask.jsonify(str(e))
        response.status_code = 400
        return response


@app.route("/email_to_brand", methods=["POST"])
def send_email_to_brand():
    """
    This method sends email with template, and replace:
    ${receiver_name} with to_name
    ${file_id} (if any) with file_id
    """
    from cloud_sql import sql_handler
    uid = flask.session.get('uid')
    sender_name = flask.session.get('name')
    sender_email = flask.session.get('email')
    data = flask.request.json
    logging.info(f'Receiving request {data} for session uid {uid}')
    access_token = sql_handler.get_nylas_access_token(uid)
    if not access_token:
        response = flask.jsonify({'status': 'no auth'})
        response.status_code = 402
        return response
    logging.info(f'Retrieved nylas access token {access_token}')
    nylas = APIClient(
        app_id=app.config["NYLAS_OAUTH_CLIENT_ID"],
        app_secret=app.config["NYLAS_OAUTH_CLIENT_SECRET"],
        access_token=access_token
    )
    try:
        draft = nylas.drafts.create()
        if not data.get('subject') or not data.get('body') or not data.get('to_email') or not data.get('to_name'):
            response = flask.jsonify({'error': 'need valid file_id query param'})
            response.status_code = 412
        draft.subject = data.get('subject')
        body = data.get('body')
        body = body.replace("$(receiver_name)", data.get('to_name'))
        draft.to = [{'email': data.get('to_email'), 'name': data.get('to_name')}]

        # bcc our Lifo's internal support account to allow better tracking.
        draft.bcc = [{'email': 'customer@lifo.ai', 'name': 'lifo customer support'}]
        if data.get('file_id'):
            file = nylas.files.get(data.get('file_id'))
            draft.attach(file)
            body = body.replace("$(file_id)", file.id)
        draft.body = body
        draft.tracking = {'links': 'true',
                          'opens': 'true',
                          'thread_replies': 'true',
                          'payload': data.get('campaign_name') or f'{sender_name} <{sender_email}>'
                          }

        brand_campaign_id = data.get('brand_campaign_id')
        emails_ref = db.collection(BRAND_CAMPAIGN_COLLECTIONS,
                                   brand_campaign_id,
                                   EMAILS_COLLECTIONS)
        email_history = {
            'ts': firestore.SERVER_TIMESTAMP,
            'body': draft.body,
            'subject': draft.subject,
            'to': draft.to,
            'file_id': data.get('file_id')
        }
        emails_ref.document().set(email_history)
        draft.send()
        logging.info('email sent successfully')
        response = flask.jsonify('email sent successfully')
        response.status_code = 200
        return response
    except Exception as e:
        logging.error(f'Sending email failed! Error message is {str(e)}')
        response = flask.jsonify(str(e))
        response.status_code = 400
        return response


@app.route("/single_email_with_template", methods=["POST"])
def send_single_email_with_template():
    """
    This method sends email with template, and replace:
    ${receiver_name} with to_name
    ${file_id} (if any) with file_id
    """
    from cloud_sql import sql_handler
    uid = flask.session.get('uid')
    sender_name = flask.session.get('name')
    sender_email = flask.session.get('email')
    data = flask.request.json
    logging.info(f'Receiving request {data} for session uid {uid}')
    access_token = sql_handler.get_nylas_access_token(uid)
    if not access_token:
        response = flask.jsonify({'status': 'no auth'})
        response.status_code = 402
        return response
    logging.info(f'Retrieved nylas access token {access_token}')
    nylas = APIClient(
        app_id=app.config["NYLAS_OAUTH_CLIENT_ID"],
        app_secret=app.config["NYLAS_OAUTH_CLIENT_SECRET"],
        access_token=access_token
    )
    try:
        draft = nylas.drafts.create()
        if not data.get('subject') or not data.get('body') or not data.get('to_email') or not data.get('to_name'):
            response = flask.jsonify({'error': 'need valid file_id query param'})
            response.status_code = 412
        draft.subject = data.get('subject')
        body = data.get('body')

        #Note: should to_name be account_id instead?
        body = body.replace("$(receiver_name)", data.get('to_name'))
        body = body.replace("$(sender_name)", sender_name)

        # note: need to anonymize the email for external url usage.
        body = body.replace("$(inf_email)", data.get('to_email'))
        brand_campaign_id = data.get('brand_campaign_id')
        body = body.replace("$(brand_campaign_id)", brand_campaign_id)

        draft.to = [{'email': data.get('to_email'), 'name': data.get('to_name')}]

        # bcc our Lifo's internal support account to allow better tracking.
        draft.bcc = [{'email': 'customer@lifo.ai', 'name': 'lifo customer support'}]
        if data.get('file_id'):
            file = nylas.files.get(data.get('file_id'))
            draft.attach(file)
            body = body.replace("$(file_id)", file.id)
        draft.body = body
        draft.tracking = {'links': 'true',
                          'opens': 'true',
                          'thread_replies': 'true',
                          'payload': data.get('campaign_name') or f'{sender_name} <{sender_email}>'
                          }

        """
        Here we access influencer sub_collection under each brand campaign. This is to replicate the following
        function from Nodejs side under api_nodejs service. 
            function access_influencer_subcollection(brand_campaign_id) {
                return db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id)
                    .collection(INFLUENCER_COLLECTIONS);
            }
        """
        inf_account_id = data.get('account_id')
        if inf_account_id != 'lifo' and data.get('to_name') != 'lifo':
            influencer_ref = db.document(BRAND_CAMPAIGN_COLLECTIONS,
                                         brand_campaign_id,
                                         INFLUENCER_COLLECTIONS,
                                         inf_account_id)
            influencer_ref.set(
                {
                    'inf_contacting_status': 'Email sent'
                },
                merge=True
            )
            emails_ref = db.collection(BRAND_CAMPAIGN_COLLECTIONS,
                                       brand_campaign_id,
                                       INFLUENCER_COLLECTIONS,
                                       inf_account_id,
                                       EMAILS_COLLECTIONS)
            email_history = {
                'ts': firestore.SERVER_TIMESTAMP,
                'body': draft.body,
                'subject': draft.subject,
                'to': draft.to,
                'file_id': data.get('file_id')
            }
            emails_ref.document().set(email_history)
        draft.send()
        logging.info('email sent successfully')
        response = flask.jsonify('email sent successfully')
        response.status_code = 200
        return response
    except Exception as e:
        logging.error(f'Sending email failed! Error message is {str(e)}')
        response = flask.jsonify(str(e))
        response.status_code = 400
        return response


@app.route("/files", methods=["POST", "GET"])
def files():
    """
    POST: upload attachment
    GET: get attachment status.
    """
    from cloud_sql import sql_handler
    uid = flask.session.get('uid')
    data = flask.request.files
    logging.info(f'Receiving request {data} for session uid {uid}')
    access_token = sql_handler.get_nylas_access_token(uid)
    if not access_token:
        response = flask.jsonify({'status': 'no auth'})
        response.status_code = 402
        return response
    logging.info(f'Retrieved Nylas access token {access_token}')
    nylas = APIClient(
        app_id=app.config["NYLAS_OAUTH_CLIENT_ID"],
        app_secret=app.config["NYLAS_OAUTH_CLIENT_SECRET"],
        access_token=access_token
    )
    if flask.request.method == 'POST':
        try:
            # check if the post request has the file part
            if 'file' not in flask.request.files:
                logging.info('No file part')
                return flask.redirect(flask.request.url)
            file = flask.request.files['file']
            # if user does not select file, browser also
            # submit an empty part without filename
            if file.filename == '':
                logging.info('No selected file')
                return flask.redirect(flask.request.url)
            if file:
                filename = secure_filename(file.filename)
                # file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

                nylas_file = nylas.files.create()
                nylas_file.filename = file.filename
                nylas_file.stream = file
                # .save() saves the file to Nylas, file.id can then be used to attach the file to an email
                nylas_file.save()
                response = flask.jsonify({'file_id': nylas_file.id})
                response.status_code = 200
            return response
        except Exception as e:
            logging.error(f'Uploading attachment failed! Error message is {str(e)}')
            response = flask.jsonify({'error': f'Uploading attachment failed! Error message is {str(e)}'})
            response.status_code = 400
            return response
    elif flask.request.method == 'GET':
        file_id = flask.request.args.get('file_id')
        if not file_id:
            response = flask.jsonify({'error': 'need valid file_id query param'})
            response.status_code = 412
        nylas_file = nylas.files.get(file_id)
        response = flask.jsonify({'file': nylas_file})
        response.status_code = 200
        return response


def ngrok_url():
    """
    If ngrok is running, it exposes an API on port 4040. We can use that
    to figure out what URL it has assigned, and suggest that to the user.
    https://ngrok.com/docs#list-tunnels
    """
    try:
        ngrok_resp = requests.get("http://localhost:4040/api/tunnels")
    except requests.ConnectionError:
        # I guess ngrok isn't running.
        return None
    ngrok_data = ngrok_resp.json()
    secure_urls = [
        tunnel["public_url"]
        for tunnel in ngrok_data["tunnels"]
        if tunnel["proto"] == "https"
    ]
    return secure_urls[0]


# When this file is executed, run the Flask web server.
if __name__ == "__main__":
    url = ngrok_url()
    if url:
        print(" * Visit {url} to view this Nylas example".format(url=url))

    app.run('0.0.0.0', 8080, debug=True)
