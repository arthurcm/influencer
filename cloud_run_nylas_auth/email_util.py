import flask
from flask_dance.contrib.nylas import make_nylas_blueprint, nylas
from nylas import APIClient

access_token = '0ZHAruH0KDdJFU7Eugl2YeUrVFN8eS'
NYLAS_OAUTH_CLIENT_ID = 'eb2syukweshnr62eiovmkqsgb'
NYLAS_OAUTH_CLIENT_SECRET = '83ttw20jzg5vzo4jlk0086lav'

def clean_email_body(body):
    new_body = ''
    index = 0
    while index < len(body):
        if body[index:index+5] == '<head':
            for j in range(index, len(body)):
                if body[j:j+7] == '</head>':
                    index = j + 7
                    break
        if body[index:index+7] == '<script':
            for j in range(index, len(body)):
                if body[j:j+9] == '</script>':
                    index = j + 9
                    break
        elif body[index:index+6] == '<style':
            for j in range(index, len(body)):
                if body[j:j+8] == '</style>':
                    index = j + 8
                    break
        else: 
            new_body += body[index]
            index += 1
                    
    if not new_body.startswith('<div'):
        return new_body
    div = 0
    for i in range(len(new_body)):
        if new_body[i:i+4] == '<div':
            div += 1
        if new_body[i:i+5] == '</div':
            div -= 1
        
        if div == 0:
            return body[0:i+6]
    return body

def message_to_dict(message):
    return {    
        'id': message.id,
        # message.object
        'account_id': message.account_id,
        'thread_id': message.thread_id,
        'subject': message.subject,
        'from_': message.from_,
        'to': message.to,
        'cc': message.cc,
        'bcc': message.bcc,
        'date': message.date,
        'unread': message.unread,
        # message.starred
        # message.snippet
        'full_body': message.body,
        'body': clean_email_body(message.body),
        'files': message.files,
        'events': message.events,
        # message.folder
        # message.labels
        'received_at': message.received_at
    }

def test_nylas():
    nylas = APIClient(
        app_id=NYLAS_OAUTH_CLIENT_ID,
        app_secret=NYLAS_OAUTH_CLIENT_SECRET,
        access_token=access_token
    )

    sender_email = 'shuo.shan@lifo.ai'
    search_email = 'customer@lifo.ai'

    nylas.messages.all()

    full_message = []
    messages_to = nylas.messages.where(to=search_email)
    for m in messages_to:
        message = message_to_dict(m)
        print(message['from_'])
        if len(message['from_']) > 0 and message['from_'][0]['email'] == sender_email:
            full_message.append(message)

    messages_from = nylas.messages.where(from_=search_email)
    for m in messages_from:
        message = message_to_dict(m)
        print(message['to'])
        if len(message['to']) > 0 and message['to'][0]['email'] == sender_email:
            full_message.append(message)

    full_message.sort(key=lambda x: x['received_at'])

    for message in full_message:
        print(message['body'])
        print('====================')
    # response = flask.jsonify([message_to_dict(message) for message in messages])
    # print response


test_nylas()
