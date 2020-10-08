const https = require('https');
const DISCOVER_SERVICE_URL = 'https://discover.lifo.ai';

class InfluencerService {
    /**
     *
     * @param service{SQLDbService}
     */
    injectSqlDbService(service) {
        this.dbService = service;
    }

    /**
     *
     * @param service{FirebaseService}
     */
    injectFirebaseService(service) {
        this.firebaseService = service;
    }

    sendGetRequest(url, options) {
        return new Promise((resolve, reject) => {
            console.debug(`Sending get request to the URL ${url}`);
            https.get(url, options, (res) => {
                const {statusCode} = res;
                if (statusCode !== 200) {
                    reject(new Error(`Get request failed \n Status Code: ${statusCode}`));
                    return;
                }

                res.setEncoding('utf8');
                let rawData = '';
                res.on('data', (chunk) => {
                    rawData += chunk;
                });
                res.on('end', () => {
                    try {
                        const parsedData = JSON.parse(rawData);
                        if (parsedData.error) {
                            reject(new Error(`Get request failed ${parsedData.error} \n Status Code: ${statusCode}`));
                        }
                    } catch (e) {
                        reject(e.message);
                    }
                });
            });
        });
    }

    /**
     *
     * @param uid {string}
     */
    getInfluencerUserByUid(uid) {
        return this.firebaseService.firebaseDb.collection(this.firebaseService.COLLECTION_NAMES.INFLUENCERS).doc(uid)
            .get()
            .then(querySnapshot => {
                if (querySnapshot) {
                    return querySnapshot.data();
                }
                return null;
            });

    }

    /**
     *
     * @param uid {string}
     * @param dataToUpdate
     */
    async updateInfluencerUserById(uid, dataToUpdate) {
        const userRef = this.firebaseService.firebaseDb.collection(this.firebaseService.COLLECTION_NAMES.INFLUENCERS).doc(uid);
        const batch = this.firebaseService.firebaseDb.batch();
        batch.set(userRef, dataToUpdate, {merge: true});
        await batch.commit();

        return (await this.firebaseService.firebaseDb.collection(this.firebaseService.COLLECTION_NAMES.INFLUENCERS).doc(uid).get()).data();
    }


    /**
     *
     * @param userUid {string}
     * @param authToken {string}
     */
    async getInstagramProfileFromModash(userUid, authToken) {
        const userData = await this.getInfluencerUserByUid(userUid);
        const options = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken,
            },
        };
        return this.sendGetRequest(`${DISCOVER_SERVICE_URL}/influencer/instagram/profile?userId=${userData.instagram_id}`, options);
    }

    /**
     *
     * @param userUid {string}
     *
     */
    async getInstagramIDByUID(userUid) {
        const userData = await this.getInfluencerUserByUid(userUid);
        return userData.instagram_id;
    }


    /**
     *
     * @param uid {string}
     */
    async getCampaignsByUid(uid) {
        const currentUser = await this.getInfluencerUserByUid(uid);
        const ref = await this.firebaseService.firebaseDb.collection(this.firebaseService.COLLECTION_NAMES.BRAND_CAMPAIGNS).get();

        const campaignsWithInfluencer = await Promise.all(ref.docs.map(async docRef => {
            const subDoc = (
                await docRef
                    .ref
                    .collection(this.firebaseService.COLLECTION_NAMES.BRAND_CAMPAIGNS_INFLUENCER_SUBCOLLECTION)
                    .doc(currentUser.instagram_id)
                    .get()
            )
                .data();
            const campaign = docRef.data();
            if (subDoc && !subDoc.offer_decline_time) {
                campaign.influencer_info = subDoc;
            }
            return campaign;
        }));

        return campaignsWithInfluencer.filter(campaign => !!campaign.influencer_info);
    }


    /**
     *
     * @param uid {string}
     * @param campaignId {string}
     * @returns {Promise<*>}
     */
    async getCampaignById(uid, campaignId) {
        const currentUser = await this.getInfluencerUserByUid(uid);
        const docRef = await this.firebaseService.firebaseDb.collection(this.firebaseService.COLLECTION_NAMES.BRAND_CAMPAIGNS).doc(campaignId).get();
        const subDoc = (await docRef.ref.collection(this.firebaseService.COLLECTION_NAMES.BRAND_CAMPAIGNS_INFLUENCER_SUBCOLLECTION).doc(currentUser.instagram_id).get()).data();
        const campaign = docRef.data();
        campaign.influencer_info = subDoc;

        return campaign;
    }
}

module.exports = InfluencerService;
