const admin = require('firebase-admin');

class FirebaseService {
    admin;
    /**
     *
     * @type {FirebaseFirestore.Firestore}
     */
    firebaseDb;

    constructor() {
        this.admin = admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            databaseURL: 'https://influencer-272204.firebaseio.com',
        });
        this.firebaseDb = this.admin.firestore();
    }

    /**
     *
     * @return {{BRAND_CAMPAIGNS_INFLUENCER_SUBCOLLECTION: string, INFLUENCERS: string, BRAND_CAMPAIGNS: string}}
     * @constructor
     */
    get COLLECTION_NAMES() {
        return {
            INFLUENCERS: 'influencers',
            BRAND_CAMPAIGNS: 'brand_campaigns',
            BRAND_CAMPAIGNS_INFLUENCER_SUBCOLLECTION: 'influencers',
        };
    }
}

module.exports = FirebaseService;
