from flask_sqlalchemy import SQLAlchemy
import flask

app = flask.Flask(__name__)


app.config.from_object(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://gcf:967Shoreline@localhost:5432/auth'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

d_b = SQLAlchemy(app)

from influencer.index import index_blue
app.register_blueprint(index_blue)