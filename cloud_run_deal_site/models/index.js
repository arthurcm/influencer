const {db, AVAILABLE_COLLECTIONS} = require('./db');
const GenericModel = require('./generic.model');
const DealModel = require('./deal.model');
const AffiliateModel = require('./affiliate.model');

module.exports = {
    db,
    AVAILABLE_COLLECTIONS,
    GenericModel,
    DealModel,
    AffiliateModel
};
