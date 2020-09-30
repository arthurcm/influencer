const INFLUENCERS = 'influencers';
const BRAND_CAMPAIGNS = 'brand_campaigns';
const admin = require('firebase-admin');
const db = admin.firestore();
const https = require('https');
const DISCOVER_SERVICE_URL = 'https://discover.lifo.ai';

function sendGetRequest(url, options) {
    return new Promise((resolve, reject) => {
        console.debug(`Sending get request to the URL ${url}`);
        https.get(url, options, (res) => {
            const { statusCode } = res;
            if (statusCode !== 200) {
                reject(new Error(`Get request failed \n Status Code: ${statusCode}`));
                return;
            }

            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
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
        })
    })
}

/**
 *
 * @param uid {string}
 */
function getInfluencerUserByUid(uid) {
    return db.collection(INFLUENCERS).doc(uid)
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
async function updateInfluencerUserById (uid, dataToUpdate) {
    const userRef = db.collection(INFLUENCERS).doc(uid);
    const batch = db.batch();
    batch.set(userRef, dataToUpdate, {merge: true});
    await batch.commit();

    return (await db.collection(INFLUENCERS).doc(uid).get()).data();
}


/**
 *
 * @param userUid {string}
 * @param authToken {string}
 */
async function getInstagramProfileFromModash(userUid, authToken) {
    const userData = await getInfluencerUserByUid(userUid);
    const options = {
        headers : {
            'Content-Type':  'application/json',
            'Authorization': authToken
        }
    }
    return sendGetRequest(`${DISCOVER_SERVICE_URL}/influencer/instagram/profile?userId=${userData.instagram_id}`, options)
}

/**
 *
 * @param userUid {string}
 *
 */
async function getInstagramIDByUID(userUid){
    const userData = await getInfluencerUserByUid(userUid);
    return userData.instagram_id;
}


/**
 *
 * @param uid {string}
 */
async function getCampaignsByUid(uid) {
    const currentUser = await getInfluencerUserByUid(uid);
    const ref = await db.collection(BRAND_CAMPAIGNS).get();

    const campaignsWithInfluencer = await Promise.all(ref.docs.map(async docRef => {
        const subCollectionName = 'influencers'
        const subDoc = (await docRef.ref.collection(subCollectionName).doc(currentUser.instagram_id).get()).data();
        const campaign = docRef.data();
        campaign.influencer_info = subDoc
        return campaign;
    }));

    return campaignsWithInfluencer.filter(campaign => !!campaign.influencer_info);
}

module.exports = {
    getInfluencerUserByUid,
    updateInfluencerUserById,
    getInstagramIDByUID,
    getInstagramProfileFromModash,
    getCampaignsByUid
}
