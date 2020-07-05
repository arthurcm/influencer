/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

goog.exportSymbol('proto.data.Brand', null, global);
goog.exportSymbol('proto.data.Contract', null, global);
goog.exportSymbol('proto.data.ContractType', null, global);
goog.exportSymbol('proto.data.Influencer', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.data.Contract = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.data.Contract, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.data.Contract.displayName = 'proto.data.Contract';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.data.Contract.prototype.toObject = function(opt_includeInstance) {
  return proto.data.Contract.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.data.Contract} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.data.Contract.toObject = function(includeInstance, msg) {
  var f, obj = {
    contractType: jspb.Message.getFieldWithDefault(msg, 1, 0),
    brand: (f = msg.getBrand()) && proto.data.Brand.toObject(includeInstance, f),
    influencer: (f = msg.getInfluencer()) && proto.data.Influencer.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.data.Contract}
 */
proto.data.Contract.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.data.Contract;
  return proto.data.Contract.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.data.Contract} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.data.Contract}
 */
proto.data.Contract.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {!proto.data.ContractType} */ (reader.readEnum());
      msg.setContractType(value);
      break;
    case 2:
      var value = new proto.data.Brand;
      reader.readMessage(value,proto.data.Brand.deserializeBinaryFromReader);
      msg.setBrand(value);
      break;
    case 3:
      var value = new proto.data.Influencer;
      reader.readMessage(value,proto.data.Influencer.deserializeBinaryFromReader);
      msg.setInfluencer(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.data.Contract.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.data.Contract.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.data.Contract} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.data.Contract.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getContractType();
  if (f !== 0.0) {
    writer.writeEnum(
      1,
      f
    );
  }
  f = message.getBrand();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      proto.data.Brand.serializeBinaryToWriter
    );
  }
  f = message.getInfluencer();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      proto.data.Influencer.serializeBinaryToWriter
    );
  }
};


/**
 * optional ContractType contract_type = 1;
 * @return {!proto.data.ContractType}
 */
proto.data.Contract.prototype.getContractType = function() {
  return /** @type {!proto.data.ContractType} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {!proto.data.ContractType} value */
proto.data.Contract.prototype.setContractType = function(value) {
  jspb.Message.setProto3EnumField(this, 1, value);
};


/**
 * optional Brand brand = 2;
 * @return {?proto.data.Brand}
 */
proto.data.Contract.prototype.getBrand = function() {
  return /** @type{?proto.data.Brand} */ (
    jspb.Message.getWrapperField(this, proto.data.Brand, 2));
};


/** @param {?proto.data.Brand|undefined} value */
proto.data.Contract.prototype.setBrand = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.data.Contract.prototype.clearBrand = function() {
  this.setBrand(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.data.Contract.prototype.hasBrand = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional Influencer influencer = 3;
 * @return {?proto.data.Influencer}
 */
proto.data.Contract.prototype.getInfluencer = function() {
  return /** @type{?proto.data.Influencer} */ (
    jspb.Message.getWrapperField(this, proto.data.Influencer, 3));
};


/** @param {?proto.data.Influencer|undefined} value */
proto.data.Contract.prototype.setInfluencer = function(value) {
  jspb.Message.setWrapperField(this, 3, value);
};


proto.data.Contract.prototype.clearInfluencer = function() {
  this.setInfluencer(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.data.Contract.prototype.hasInfluencer = function() {
  return jspb.Message.getField(this, 3) != null;
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.data.Brand = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.data.Brand, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.data.Brand.displayName = 'proto.data.Brand';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.data.Brand.prototype.toObject = function(opt_includeInstance) {
  return proto.data.Brand.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.data.Brand} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.data.Brand.toObject = function(includeInstance, msg) {
  var f, obj = {
    shopName: jspb.Message.getFieldWithDefault(msg, 1, ""),
    shopAddress: jspb.Message.getFieldWithDefault(msg, 2, ""),
    shopEmail: jspb.Message.getFieldWithDefault(msg, 3, ""),
    productNameToPromote: jspb.Message.getFieldWithDefault(msg, 4, ""),
    postingDetails: jspb.Message.getFieldWithDefault(msg, 5, ""),
    campaignStartDate: jspb.Message.getFieldWithDefault(msg, 6, ""),
    campaignEndDate: jspb.Message.getFieldWithDefault(msg, 7, ""),
    commission: +jspb.Message.getFieldWithDefault(msg, 8, 0.0),
    paymentDate: jspb.Message.getFieldWithDefault(msg, 9, ""),
    productForEvaluation: jspb.Message.getFieldWithDefault(msg, 10, ""),
    jurisdictionState: jspb.Message.getFieldWithDefault(msg, 11, ""),
    jurisdictionCounty: jspb.Message.getFieldWithDefault(msg, 12, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.data.Brand}
 */
proto.data.Brand.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.data.Brand;
  return proto.data.Brand.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.data.Brand} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.data.Brand}
 */
proto.data.Brand.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setShopName(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setShopAddress(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setShopEmail(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.setProductNameToPromote(value);
      break;
    case 5:
      var value = /** @type {string} */ (reader.readString());
      msg.setPostingDetails(value);
      break;
    case 6:
      var value = /** @type {string} */ (reader.readString());
      msg.setCampaignStartDate(value);
      break;
    case 7:
      var value = /** @type {string} */ (reader.readString());
      msg.setCampaignEndDate(value);
      break;
    case 8:
      var value = /** @type {number} */ (reader.readFloat());
      msg.setCommission(value);
      break;
    case 9:
      var value = /** @type {string} */ (reader.readString());
      msg.setPaymentDate(value);
      break;
    case 10:
      var value = /** @type {string} */ (reader.readString());
      msg.setProductForEvaluation(value);
      break;
    case 11:
      var value = /** @type {string} */ (reader.readString());
      msg.setJurisdictionState(value);
      break;
    case 12:
      var value = /** @type {string} */ (reader.readString());
      msg.setJurisdictionCounty(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.data.Brand.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.data.Brand.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.data.Brand} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.data.Brand.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getShopName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getShopAddress();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getShopEmail();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getProductNameToPromote();
  if (f.length > 0) {
    writer.writeString(
      4,
      f
    );
  }
  f = message.getPostingDetails();
  if (f.length > 0) {
    writer.writeString(
      5,
      f
    );
  }
  f = message.getCampaignStartDate();
  if (f.length > 0) {
    writer.writeString(
      6,
      f
    );
  }
  f = message.getCampaignEndDate();
  if (f.length > 0) {
    writer.writeString(
      7,
      f
    );
  }
  f = message.getCommission();
  if (f !== 0.0) {
    writer.writeFloat(
      8,
      f
    );
  }
  f = message.getPaymentDate();
  if (f.length > 0) {
    writer.writeString(
      9,
      f
    );
  }
  f = message.getProductForEvaluation();
  if (f.length > 0) {
    writer.writeString(
      10,
      f
    );
  }
  f = message.getJurisdictionState();
  if (f.length > 0) {
    writer.writeString(
      11,
      f
    );
  }
  f = message.getJurisdictionCounty();
  if (f.length > 0) {
    writer.writeString(
      12,
      f
    );
  }
};


/**
 * optional string shop_name = 1;
 * @return {string}
 */
proto.data.Brand.prototype.getShopName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.data.Brand.prototype.setShopName = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string shop_address = 2;
 * @return {string}
 */
proto.data.Brand.prototype.getShopAddress = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.data.Brand.prototype.setShopAddress = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string shop_email = 3;
 * @return {string}
 */
proto.data.Brand.prototype.getShopEmail = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.data.Brand.prototype.setShopEmail = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * optional string product_name_to_promote = 4;
 * @return {string}
 */
proto.data.Brand.prototype.getProductNameToPromote = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 4, ""));
};


/** @param {string} value */
proto.data.Brand.prototype.setProductNameToPromote = function(value) {
  jspb.Message.setProto3StringField(this, 4, value);
};


/**
 * optional string posting_details = 5;
 * @return {string}
 */
proto.data.Brand.prototype.getPostingDetails = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 5, ""));
};


/** @param {string} value */
proto.data.Brand.prototype.setPostingDetails = function(value) {
  jspb.Message.setProto3StringField(this, 5, value);
};


/**
 * optional string campaign_start_date = 6;
 * @return {string}
 */
proto.data.Brand.prototype.getCampaignStartDate = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 6, ""));
};


/** @param {string} value */
proto.data.Brand.prototype.setCampaignStartDate = function(value) {
  jspb.Message.setProto3StringField(this, 6, value);
};


/**
 * optional string campaign_end_date = 7;
 * @return {string}
 */
proto.data.Brand.prototype.getCampaignEndDate = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 7, ""));
};


/** @param {string} value */
proto.data.Brand.prototype.setCampaignEndDate = function(value) {
  jspb.Message.setProto3StringField(this, 7, value);
};


/**
 * optional float commission = 8;
 * @return {number}
 */
proto.data.Brand.prototype.getCommission = function() {
  return /** @type {number} */ (+jspb.Message.getFieldWithDefault(this, 8, 0.0));
};


/** @param {number} value */
proto.data.Brand.prototype.setCommission = function(value) {
  jspb.Message.setProto3FloatField(this, 8, value);
};


/**
 * optional string payment_date = 9;
 * @return {string}
 */
proto.data.Brand.prototype.getPaymentDate = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 9, ""));
};


/** @param {string} value */
proto.data.Brand.prototype.setPaymentDate = function(value) {
  jspb.Message.setProto3StringField(this, 9, value);
};


/**
 * optional string product_for_evaluation = 10;
 * @return {string}
 */
proto.data.Brand.prototype.getProductForEvaluation = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 10, ""));
};


/** @param {string} value */
proto.data.Brand.prototype.setProductForEvaluation = function(value) {
  jspb.Message.setProto3StringField(this, 10, value);
};


/**
 * optional string jurisdiction_state = 11;
 * @return {string}
 */
proto.data.Brand.prototype.getJurisdictionState = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 11, ""));
};


/** @param {string} value */
proto.data.Brand.prototype.setJurisdictionState = function(value) {
  jspb.Message.setProto3StringField(this, 11, value);
};


/**
 * optional string jurisdiction_county = 12;
 * @return {string}
 */
proto.data.Brand.prototype.getJurisdictionCounty = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 12, ""));
};


/** @param {string} value */
proto.data.Brand.prototype.setJurisdictionCounty = function(value) {
  jspb.Message.setProto3StringField(this, 12, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.data.Influencer = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.data.Influencer, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.data.Influencer.displayName = 'proto.data.Influencer';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.data.Influencer.prototype.toObject = function(opt_includeInstance) {
  return proto.data.Influencer.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.data.Influencer} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.data.Influencer.toObject = function(includeInstance, msg) {
  var f, obj = {
    influencerName: jspb.Message.getFieldWithDefault(msg, 1, ""),
    influencerAddress: jspb.Message.getFieldWithDefault(msg, 2, ""),
    influencerEmail: jspb.Message.getFieldWithDefault(msg, 3, ""),
    socialMediaPlatform: jspb.Message.getFieldWithDefault(msg, 4, ""),
    accountId: jspb.Message.getFieldWithDefault(msg, 5, ""),
    postingDetails: jspb.Message.getFieldWithDefault(msg, 6, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.data.Influencer}
 */
proto.data.Influencer.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.data.Influencer;
  return proto.data.Influencer.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.data.Influencer} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.data.Influencer}
 */
proto.data.Influencer.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setInfluencerName(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.setInfluencerAddress(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setInfluencerEmail(value);
      break;
    case 4:
      var value = /** @type {string} */ (reader.readString());
      msg.setSocialMediaPlatform(value);
      break;
    case 5:
      var value = /** @type {string} */ (reader.readString());
      msg.setAccountId(value);
      break;
    case 6:
      var value = /** @type {string} */ (reader.readString());
      msg.setPostingDetails(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.data.Influencer.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.data.Influencer.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.data.Influencer} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.data.Influencer.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getInfluencerName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getInfluencerAddress();
  if (f.length > 0) {
    writer.writeString(
      2,
      f
    );
  }
  f = message.getInfluencerEmail();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
  f = message.getSocialMediaPlatform();
  if (f.length > 0) {
    writer.writeString(
      4,
      f
    );
  }
  f = message.getAccountId();
  if (f.length > 0) {
    writer.writeString(
      5,
      f
    );
  }
  f = message.getPostingDetails();
  if (f.length > 0) {
    writer.writeString(
      6,
      f
    );
  }
};


/**
 * optional string influencer_name = 1;
 * @return {string}
 */
proto.data.Influencer.prototype.getInfluencerName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.data.Influencer.prototype.setInfluencerName = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional string influencer_address = 2;
 * @return {string}
 */
proto.data.Influencer.prototype.getInfluencerAddress = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/** @param {string} value */
proto.data.Influencer.prototype.setInfluencerAddress = function(value) {
  jspb.Message.setProto3StringField(this, 2, value);
};


/**
 * optional string influencer_email = 3;
 * @return {string}
 */
proto.data.Influencer.prototype.getInfluencerEmail = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/** @param {string} value */
proto.data.Influencer.prototype.setInfluencerEmail = function(value) {
  jspb.Message.setProto3StringField(this, 3, value);
};


/**
 * optional string social_media_platform = 4;
 * @return {string}
 */
proto.data.Influencer.prototype.getSocialMediaPlatform = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 4, ""));
};


/** @param {string} value */
proto.data.Influencer.prototype.setSocialMediaPlatform = function(value) {
  jspb.Message.setProto3StringField(this, 4, value);
};


/**
 * optional string account_id = 5;
 * @return {string}
 */
proto.data.Influencer.prototype.getAccountId = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 5, ""));
};


/** @param {string} value */
proto.data.Influencer.prototype.setAccountId = function(value) {
  jspb.Message.setProto3StringField(this, 5, value);
};


/**
 * optional string posting_details = 6;
 * @return {string}
 */
proto.data.Influencer.prototype.getPostingDetails = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 6, ""));
};


/** @param {string} value */
proto.data.Influencer.prototype.setPostingDetails = function(value) {
  jspb.Message.setProto3StringField(this, 6, value);
};


/**
 * @enum {number}
 */
proto.data.ContractType = {
  CONTRACT_TYPE_DEFAULT: 0,
  US_FIXED_COMMISSION: 1
};

goog.object.extend(exports, proto.data);
