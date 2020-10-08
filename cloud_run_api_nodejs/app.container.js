const InfluencerService = require('./services/inflluencer.service');
const SqlDbService = require('./services/sqldb.service');
const FirebaseService = require('./services/firebase.service');

const Container = require('./middlewares/container.middleware');

/**
 *
 * @typedef {{
 *  influencerService: InfluencerService,
 *  sqlDbService: SQLDbService
 *  firebaseService: FirebaseService
 * }} CONTAINER
 */
const services = {
    influencerService: InfluencerService,
    sqlDbService: SqlDbService,
    firebaseService: FirebaseService,
};

/**
 *
 * @type {CONTAINER}
 */
module.exports = Container({
    services,
});
