# using SendGrid's Python Library
# https://github.com/sendgrid/sendgrid-python
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from flask import Flask
app = Flask(__name__)
app.secret_key = "super secret key"

from gcp_utils import get_secret

# Imports the Google Cloud client library
import google.cloud.logging
# Imports Python standard library logging
import logging

# Instantiates a client
client = google.cloud.logging.Client()

# Connects the logger to the root logging handler; by default this captures
# all logs at INFO level and higher
client.setup_logging()


DEFAULT_CONTACT_EMAIL = 'customer@lifo.ai'


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


def send_welcome_email(data, context):
    logging.info('Function triggered by creation/deletion of user: %s' % data["uid"])
    logging.info('Created at: %s' % data["metadata"]["createdAt"])

    if 'email' in data:
        logging.info('Email: %s' % data["email"])
        email = data['email']
        _send_sendgrid_email(from_email=DEFAULT_CONTACT_EMAIL,
                             to_emails=email,
                             subject='Welcome to sign up with us!',
                             text_content='Thanks you for signing up to our platform!')
    else:
        logging.error('User signed up without email, skip sending email')
