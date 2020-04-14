import os
os.path.join('../python_functions')

from unittest.mock import Mock
from flask import Request

# from python_functions import video_intel

import main


def test_oauth_handler_gcf():
    request = Request()
    request.url = "http://us-central1-influencer-272204.cloudfunctions.net/?state=e14ca75fdb6a41efd34b5646625c27128716574c3fe2c14316d7728ab382d825&code=4%2FygHYEjNNWhMQ610KHgrMfnfP9xmz9dC4VHL5YQomW_EyM7TnCsikh1Kr7PAT7Fv-sjIefj0tPTt9_Hl96H935ks&scope=email+profile+openid+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube.upload+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&authuser=0&prompt=none' [GET]> with uri being http://us-central1-influencer-272204.cloudfunctions.net/?state=e14ca75fdb6a41efd34b5646625c27128716574c3fe2c14316d7728ab382d825&code=4%2FygHYEjNNWhMQ610KHgrMfnfP9xmz9dC4VHL5YQomW_EyM7TnCsikh1Kr7PAT7Fv-sjIefj0tPTt9_Hl96H935ks&scope=email+profile+openid+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube.upload+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&authuser=0&prompt=none"
    # name = 'test'
    # data = {'name': name}
    req = Mock(get_json=Mock(return_value=request), args=request)

    # Call tested function
    main.oauth_handler_gcf(req)

