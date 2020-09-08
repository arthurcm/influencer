const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://influencer-272204.firebaseio.com',
});
const db = admin.firestore();
db.settings({timestampsInSnapshots: true});

/**
 *
 * @type {{deals: string, affiliates: string, recommended_deals: string}}
 */
const AVAILABLE_COLLECTIONS = {
    deals: 'deals',
    affiliates: 'affiliates',
    recommended_deals: 'recommended_deals'
}

module.exports = {
    db,
    AVAILABLE_COLLECTIONS
};
