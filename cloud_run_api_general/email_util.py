# using SendGrid's Python Library
# https://github.com/sendgrid/sendgrid-python
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from flask import Flask
app = Flask(__name__)
app.secret_key = "super secret key"

from cloud_run_api_general.gcp_utils import get_secret

# Imports the Google Cloud client library
import google.cloud.logging
# Imports Python standard library logging
import logging

# Instantiates a client
client = google.cloud.logging.Client()

# Connects the logger to the root logging handler; by default this captures
# all logs at INFO level and higher
client.setup_logging()


DEFAULT_CONTACT_EMAIL = 'influencermkting@gmail.com'


def _send_sendgrid_email(from_email, to_emails,
                         subject, text_content, html_content=None):
    message = Mail(
        from_email=from_email,
        to_emails=to_emails,
        subject=subject,
        plain_text_content=text_content,
        html_content=html_content)
    try:
        sg = SendGridAPIClient(get_secret('sendgrid-api-key'))
        response = sg.send(message)
        logging.info(response.status_code)
        return response
    except Exception as e:
        logging.info(e.message)
        return None


def share_draft_email(data):
    """
    Send an email to brand's contact person for invitation on draft review, feedbacks, and approval.
    :param data: has to include --- email, url to the review page (with authentication)
    :param context:
    :return:
    """
    if 'to_email' not in data or not data['to_email']:
        logging.error('Share_draft_email has to be called with valid to_email field')
        return Flask.make_response(app, f'Share_draft_email API error: Share_draft_email '
                                        f'has to be called with valid to_email field', code=400)

    if 'email' not in data or not data['email']:
        logging.error('Share_draft_email has to be called with valid email field')
        return Flask.make_response(app, f'Share_draft_email API error: Share_draft_email '
                                        f'has to be called with valid email field', code=400)

    if 'url' not in data or not data['url']:
        logging.error('Share_draft_email has to be called with valid url field')
        return Flask.make_response(app, f'Share_draft_email API error: Share_draft_email '
                                        f'has to be called with valid url field', code=400)

    logging.info('Sending email to: %s' % data["to_email"])
    email = data['email']
    url = data['url']
    display_name = data.get('display_name')
    if data.get('subject'):
        subject = data.get('subject')
    else:
        subject = 'Please help review the following draft'

    if data.get('main_body'):
        main_body = data.get('main_body')
    else:
        main_body = f"Hi!\n I am sharing my content draft with you for review. You can find it here: {url}. \n {display_name}"
    res = _send_sendgrid_email(from_email=email,
                               to_emails=data['to_email'],
                               subject=subject,
                               text_content=main_body)
    return res
