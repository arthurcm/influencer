from flask import Blueprint

index_blue = Blueprint('index_blue',__name__)

#把使用蓝图对象的文件，导入到创建蓝图的下面
from . import view

