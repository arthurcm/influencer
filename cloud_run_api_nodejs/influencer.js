const INFLUENCERS = 'influencers';
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

module.exports = {
    getInfluencerUserByUid,
    updateInfluencerUserById,
    getInstagramProfileFromModash
}