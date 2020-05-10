# Imports from the Python standard library
from __future__ import print_function
import os
import sys
import textwrap
import datetime

from cloud_sql import sql_handler
import firebase_admin
from firebase_admin import auth, exceptions

# Imports the Google Cloud client library
import google.cloud.logging
import logging

# Instantiates a client
client = google.cloud.logging.Client()

# Connects the logger to the root logging handler; by default this captures
# all logs at INFO level and higher
client.setup_logging()

firebase_app = firebase_admin.initialize_app()


# Imports from third-party modules that this project depends on
try:
    import requests
    import flask
    from flask import Flask, render_template
    from werkzeug.middleware.proxy_fix import ProxyFix
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
app.config.from_json("config.json")

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

SCOPE_REDIRECT_URL_MAPPING = {
    'calendar': "http://auth.lifo.ai/authorize",
    'email.send': "http://auth.lifo.ai/authorize"
}


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
        uid = decoded_token['uid']
    except ValueError or exceptions.InvalidArgumentError:
        logging.error('id_token not string or empty or invalid')
        return ''
    except auth.RevokedIdTokenError:
        logging.error('id_token has been revoked')
        return ''
    return uid


@app.route("/authorize")
def authorize():
    """
    This API authenticate for a chosen scope, and saves the nylas access code to cloud sql.
    :return: flask response, 200 if success, 400 if failed.
    """
    nylas_code = flask.request.args.get('code')
    nylas_client = APIClient(app_id=app.config["NYLAS_OAUTH_CLIENT_ID"],
                             app_secret=app.config["NYLAS_OAUTH_CLIENT_SECRET"])
    if not nylas_code:
        # id_token = flask.request.args.get('id_token')
        id_token = flask.request.headers.get('Authorization')
        if not id_token:
            logging.error('Valid id_token required')
            response = flask.jsonify('Valid id_token required')
            response.status_code = 400
            return response
        uid = token_verification(id_token)
        if not uid:
            logging.error('id_token verification failed')
            response = flask.jsonify('id_token verification failed')
            response.status_code = 400
            return response
        flask.session['uid'] = uid
        scope = flask.request.args.get('scope')
        if not scope:
            logging.error('Need a valid scope string, currently supporting: calendar or email.send')
            response = flask.jsonify('Need a valid scope string, currently supporting: calendar or email.send')
            response.status_code = 400
            return response
        redirect_url = SCOPE_REDIRECT_URL_MAPPING.get(scope)
        if not redirect_url:
            response = flask.jsonify(f'{scope} not supported')
            response.status_code = 400
            return response
        logging.info(f'receiving request for scope {scope}, and redirect to {redirect_url}')

        # Redirect your user to the auth_url
        auth_url = nylas_client.authentication_url(
            redirect_url,
            scopes=scope
        )
        return flask.redirect(auth_url)
    else:
        # note, here we have not handled the declined auth case
        logging.info('authentication success')
        uid = flask.session['uid']
        logging.info(f'handling auth for uid: {uid}')
        access_token = nylas_client.token_for_code(nylas_code)
        return sql_handler.save_nylas_token(uid, nylas_access_token=access_token)


@app.route("/create_calendar_event", methods=["POST"])
def create_calendar_event():
    id_token = flask.request.headers.get('Authorization')
    session_uid = flask.session.get('uid')
    data = flask.request.json
    logging.info(f'Receiving request {data} for session uid {session_uid} and id_token {id_token}')
    if not id_token and not session_uid:
        logging.error('Valid id_token required')
        response = flask.jsonify('Valid id_token required')
        response.status_code = 400
        return response
    elif not session_uid:
        uid = token_verification(id_token)
        if not uid:
            logging.error('id_token verification failed')
            response = flask.jsonify('id_token verification failed')
            response.status_code = 400
            return response
    else:
        uid = session_uid
    access_token = sql_handler.get_nylas_access_token(uid)
    if not access_token:
        response = flask.jsonify('Failed to get access token! Re-authenticate the user')
        response.status_code = 400
        return response
    logging.info(f'Retrieved nylas access token {access_token}')

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
        response = flask.jsonify('No writable calendar found!')
        response.status_code = 400
        return response

    # Create a new event
    event = nylas.events.create()

    event.title = data.get('title')
    event.location = data.get('location')
    event.description = data.get('description')
    event.busy = True

    # Provide the appropriate id for a calendar to add the event to a specific calendar
    event.calendar_id = calendar_id

    # Participants are added as a list of dictionary objects
    # email is required, name is optional
    event.participants = data.get('participants')

    # The event date/time can be set in one of 3 ways.
    # For details: https://docs.nylas.com/reference#event-subobjects
    event.when = data.get('when')

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
    id_token = flask.request.headers.get('Authorization')
    session_uid = flask.session.get('uid')
    data = flask.request.json
    logging.info(f'Receiving request {data} for session uid {session_uid} and id_token {id_token}')
    if not id_token and not session_uid:
        logging.error('Valid id_token required')
        response = flask.jsonify('Valid id_token required')
        response.status_code = 400
        return response
    elif not session_uid:
        uid = token_verification(id_token)
        if not uid:
            logging.error('id_token verification failed')
            response = flask.jsonify('id_token verification failed')
            response.status_code = 400
            return response
    else:
        uid = session_uid
    access_token = sql_handler.get_nylas_access_token(uid)
    if not access_token:
        response = flask.jsonify('Failed to get access token! Re-authenticate the user')
        response.status_code = 400
        return response
    logging.info(f'Retrieved nylas access token {access_token}')
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
