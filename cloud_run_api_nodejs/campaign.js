const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore();

const path = require('path');

const PERCENTAGE_RATE = 'commission_per_sales_campaign';
const FIXED_RATE = 'one_time_commission_campaign';
const GENERIC_INF_CREATED_CAMPAIGN = 'generic_campaign';

const BRAND_CAMPAIGN_COLLECTIONS = 'brand_campaigns';
const INFLUENCER_CAMPAIGN_COLLECTIONS = 'campaigns';
const INFLUENCER_COLLECTIONS = 'influencers';

const INFLUENCER_RECOMMENDED = 'Recommended';
const BRAND_CHOSEN = 'Brand chosen';
const NO_RESPONSE = 'No response';
const OFFER_MADE = 'Offer made';
const EMAIL_SENT = 'Email sent. Waiting for response.';
const INFLUENCER_ACCEPT = 'Influencer accepted offer';
const INFLUENCER_DECLINE = 'Influencer declined offer';
const INFLUENCER_SIGNEDUP = 'Influencer signed up';
const SKIP_OFFER = 'Skip Offer';
const OFFER_CANCELLED = 'Offer Cancelled';
const IN_CONTENT_REVIEW = 'In Content Review';
const CONTENT_APPROVED = 'Content Approved';

const NEWLY_DISCOVERED = 'New influencers discovered';
const NEED_MORE_INFLUENCERS = 'Need more influencers';
const RESULTS_VIEWED = 'Results viewed';



const CAMPAIGN_RECRUIT_RT = 'campaign_recruit';
const INVITATIONS_RT = 'invitations';
const RECRUIT_OPEN = 'Open';
const RECRUIT_CLOSED = 'Closed';
const INV_OPEN = 'Open';
const INV_EXPIRED = 'Expired';
const INV_ACCEPTED = 'Accepted';
const INV_DECLINED = 'Declined';


function uriParse(media_name){
    const tokens = media_name.split('/');
    const results = {
        uid: tokens[1],
        campaign_id: tokens[2],
        // history_id: tokens[3],
        file_name: tokens[3],
    };
    console.debug('Parsed tokens are', results);
    if(!results.file_name){
        console.error('invalid media path provided, causing file_name to be undefined', filePath);
        throw new functions.https.HttpsError('invalid-argument', 'invalid media path provided');
    }
    return results;
}

// this is copy-pasted from cloud_run_video_transcoding, make sure update both when change the following.
// this is copy-pasted from cloud_run_video_transcoding, make sure update both when change the following.
// this is copy-pasted from cloud_run_video_transcoding, make sure update both when change the following.
function retrieveVideoMetaRef(filePath){
    // The following is to handle the auth, campaign id, and history id parsing.
    return retrieveMediaMetaRef(filePath, 'videos');
}

function retrieveSingleImageMetaRef(filePath) {
    const image_ref = retrieveImageMetaRef(filePath);
    const tokens = uriParse(filePath);
    const file_name = tokens.file_name;
    return image_ref.collection('single_image').doc(file_name);
}

// this is copy-pasted from cloud_run_video_transcoding, make sure update both when change the following.
// this is copy-pasted from cloud_run_video_transcoding, make sure update both when change the following.
// this is copy-pasted from cloud_run_video_transcoding, make sure update both when change the following.
function retrieveImageMetaRef(filePath){
    // The following is to handle the auth, campaign id, and history id parsing.
    return retrieveMediaMetaRef(filePath, 'images');
}

// this is copy-pasted from cloud_run_video_transcoding, make sure update both when change the following.
// this is copy-pasted from cloud_run_video_transcoding, make sure update both when change the following.
// this is copy-pasted from cloud_run_video_transcoding, make sure update both when change the following.
function retrieveMediaMetaRef(filePath, mediaType){
    // mediaType has to be one of "videos", "images"
    // The following is to handle the auth, campaign id, and history id parsing.
    if(mediaType !== 'videos' && mediaType !== 'images'){
        throw new Error('Currently only support videos or images as mediaType');
    }
    let parsedTokens = [];
    try {
        parsedTokens = uriParse(filePath);
    }catch (e) {
        console.error(('Parsing error', filePath));
        throw new Error('Parsing error for uri:'.concat(filePath));
    }
    const campaign_id = parsedTokens.campaign_id;
    const media_id = parsedTokens.file_name;
    return db.collection('campaigns').doc(campaign_id)
        .collection(mediaType).doc(media_id);
}


function getAllCampaign(uid) {
    console.info('Get all campaign meta data that belong to current user.');
    return db.collection(INFLUENCER_COLLECTIONS).doc(uid).collection('campaigns').get()
        .then(querySnapshot => {
            const markers = [];
            querySnapshot.docs.forEach(doc => {
                const doc_snap = doc.data();
                if(!doc_snap.deleted){
                    markers.push(doc_snap);
                }
            });
            console.debug('Found', markers.length, 'campaigns in /campaign GET');
            return markers;
        });
}


function amGetAllBrandCampaign() {
    console.info('Get all brand campaign meta data for Account manager.');
    return db.collection(BRAND_CAMPAIGN_COLLECTIONS).get()
        .then(querySnapshot => {
            const campaigns = [];
            querySnapshot.docs.forEach(doc => {
                const doc_snap = doc.data();
                if(!doc_snap.deleted){
                    campaigns.push(doc_snap);
                }
            });
            console.debug('Found', campaigns.length, 'campaigns in /campaign GET');
            return campaigns;
        });
}


function amGetInfCampaigns(brand_campaign_id) {
    console.info('Get all active influencer campaigns.');
    return db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id).get()
        .then(snapshot => {
            const brand_campaign_data = snapshot.data();
            console.info('Obtained collaborating influencer information', brand_campaign_data.inf_campaign_dict);
            return brand_campaign_data.inf_campaign_dict;
        });
}


function getLatestCampaignPath(uid, campaign_id){
    return db.collection('campaigns').doc(campaign_id)
        .collection('campaignHistory').orderBy('time_stamp', 'desc').limit(1).get()
        .then(querySnapshot => {
            const campaigns = [];
            querySnapshot.docs.forEach(doc => {
                campaigns.push(doc.data());
            });
            return campaigns;
        })
        .then(campaigns => {
            const campaign_data = campaigns[0];
            return `${uid}/${campaign_id}/${campaign_data.history_id}`;
        });
}


// Get campaign meta information when been called.
function getCampaignHistories(campaign_id) {
    console.info('Querying campaign', campaign_id);
    return db.collection('campaigns').doc(campaign_id)
        .collection('campaignHistory').orderBy('time_stamp', 'desc').get()
        .then(querySnapshot => {
            const histories = [];
            querySnapshot.docs.forEach(doc => {
                histories.push(doc.data());
            });
            return histories;
        });
}


// Get campaign meta information when been called.
function getCampaign(data, uid, res) {
    const markers = [];
    const campaign_id = data.campaign_id;
    console.info('Querying campaign', campaign_id);
    const latest_history_ref = db.collection('campaigns').doc(campaign_id)
        .collection('campaignHistory').orderBy('time_stamp', 'desc').get()
        .then(querySnapshot => {
            querySnapshot.docs.forEach(doc => {
                markers.push(doc.data());
            });
            return markers;
        });
    let final_history_id = '';
    let final_campaign = {};
    let final_video_draft_history_id = '';
    let final_video_draft = {};
    const final_campaign_ref = db.collection('campaigns').doc(campaign_id).get()
        .then(camSnapShot => {
            if (!camSnapShot.exists){
                return {};
            }else{
                final_history_id = camSnapShot.get('final_history_id');
                final_campaign = camSnapShot.get('final_campaign');
                final_video_draft_history_id = camSnapShot.get('final_video_draft_history_id');
                final_video_draft = camSnapShot.get('final_video_draft');
                return {
                    final_history_id,
                    final_campaign,
                    final_video_draft_history_id,
                    final_video_draft,
                };
            }
        });

    return Promise.all([latest_history_ref, final_campaign_ref]);
}

function updateCampaignData(campaign_id, data, history_id){
    const FieldValue = admin.firestore.FieldValue;
    data.time_stamp = FieldValue.serverTimestamp();
    data.campaign_id = campaign_id;
    data.history_id = history_id;
    data.share_url = `https://login.lifo.ai/app/image-review/${campaign_id}`;
    return data;
}

// called when influencers decide to create a new campaign with related information. u
function createCampaign(data, uid, is_new_campaign=true){
    const campaignRef = db.collection('campaigns').doc();
    const campaign_id = campaignRef.id;
    if(is_new_campaign){
        if(data.brand_campaign_id){
            console.error('Receiving a brand initiated campaign for influencer to sign up!');
            return {};
        }
        console.info('Creating a new campaign with id', campaign_id);
    }else{
        console.info('Signing up to a brand campaign with data', data);
    }
    const batch = db.batch();
    const historyRef = db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc();
    const history_id = historyRef.id;
    data.uid = uid;
    data = updateCampaignData(campaign_id, data, history_id);

    const campaignDocRef = db.collection('campaigns').doc(campaign_id)
        .collection('campaignHistory').doc(history_id);
    batch.set(campaignDocRef, data);
    batch.set(campaignRef, {
        uid,
        campaign_id,
        brand_campaign_id: data.brand_campaign_id || '',
        brand: data.brand || '',
    }, {merge: true});
    console.info('creating campaign with id', campaign_id);
    return {
        campaign_id,
        history_id,
        campaign_data: data,
        batch_promise: batch,
    };
}

// called when an existing campaign gets updated, this include anything that campaign data touches on.
// the data is expected to have the same schema (subset) of campaign data.
function completeCampaign(campaign_id, uid){
    // Get a new write batch
    const batch = db.batch();

    const campaignRef = db.collection('campaigns').doc(campaign_id);
    batch.set(campaignRef, {completed: true}, {merge: true});
    return batch.commit();
}

// called when an existing campaign gets updated, this include anything that campaign data touches on.
// the data is expected to have the same schema (subset) of campaign data.
function updateCampaign(campaign_id, data){
    console.debug('input data is', data, 'updating campaign', campaign_id);
    // Get a new write batch
    const batch = db.batch();
    const campaignHistoryRef = db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc();
    const history_id = campaignHistoryRef.id;
    const newCamp = updateCampaignData(campaign_id, data, history_id);
    console.debug('Created new campaign data:', newCamp);
    batch.set(campaignHistoryRef, newCamp);
    return {
        history_id,
        batch_promise: batch,
    };
}

function deleteCampaign(data, uid){
    if (!data.campaign_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
          'with a specific campaign_id.');
    }

    const campaign_id = data.campaign_id;
    console.info('Deleting campaign', campaign_id, 'from influencer', uid);
    const campaignRef = db.collection('campaigns').doc(campaign_id);

    const batch = db.batch();
    batch.delete(campaignRef);
    const influencerCamRef = db.collection(INFLUENCER_COLLECTIONS).doc(uid)
        .collection('campaigns').doc(campaign_id);
    batch.delete(influencerCamRef);
    return batch.commit();
}


// this is to define a single feed back object.
// This object will have a structure with the following assumptions:
// each media object can have multiple threads of feedbacks
// each thread can have a list of feedbacks
// each feedback is an object defined by the function below.
function createFeedbackObject(feedback_str, media_object_path, displayName='', like= [], dislike= [],
                              video_offset=0, image_bounding_box={}, extra_data={}){
    const FieldValue = admin.firestore.FieldValue;
    return {
        displayName,
        feedback_str,
        like,
        dislike,
        video_offset,
        image_bounding_box,
        media_object_path,
        extra_data,
        timestamp: FieldValue.serverTimestamp(),
    };
}


// for creating a new thread of feedbacks
function createFeedbackThread(data, uid, name){
    if (!data.feedback_str) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a none-empty feedback_str.');
    }
    if (!data.media_object_path) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a none-empty media_object_path.');
    }
    const feedback_str = data.feedback_str;
    const media_object_path = data.media_object_path;
    const FieldValue = admin.firestore.FieldValue;
    const feedback_obj = createFeedbackObject(feedback_str, media_object_path, name);
    const new_thread = {
        media_object_path,
        resolved: false,
        deleted: false,
        timestamp: FieldValue.serverTimestamp(),
    };

    const media_object_ref = retrieveMediaObjRef(media_object_path);
    const thread_ref = media_object_ref.collection('feedback_threads').doc();
    const batch = db.batch();
    batch.set(thread_ref, new_thread);
    const feedback_ref = thread_ref.collection('feedback_list').doc();
    batch.set(feedback_ref, feedback_obj);
    const thread_path = path.join(media_object_path, 'feedback_threads', thread_ref.id);
    const feedback_path = path.join(thread_path, 'feedback_list', feedback_ref.id);
    return {
        batch_promise: batch.commit(),
        thread_id: thread_ref.id,
        feedback_id: feedback_ref.id,
    };
}

async function getAllThreads(data, uid) {
    if (!data.media_object_path) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a none-empty media_object_path.');
    }
    const media_object_ref = retrieveMediaObjRef(data.media_object_path);
    const thread_ref = media_object_ref.collection('feedback_threads');
    const snapshot = await thread_ref.orderBy('timestamp', 'desc').get();
    return await snapshot.docs.map(async thread_doc => {
        const feedback_collection = await thread_doc.ref.collection('feedback_list').get();
        const feedback_list = await feedback_collection.docs.map(doc => doc.data());
        const thread_data = thread_doc.data();
        return {
            thread_id: thread_doc.id,
            thread: thread_data,
            feedback_list,
        };
    });
}

function likeFeedback(data, like_id){
    if (!data.feedback_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a none-empty feedback_str.');
    }
    if (!data.media_object_path) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a none-empty media_object_path.');
    }
    if (!data.thread_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a legal thread_id.');
    }
    const media_object_ref = retrieveMediaObjRef(data.media_object_path);
    return media_object_ref
        .collection('feedback_threads').doc(data.thread_id)
        .collection('feedback_list').doc(data.feedback_id).get()
        .then(snapshot => {
            let feedback_data = snapshot.data();
            console.debug('Got feedback data', feedback_data);
            let like_list = feedback_data.like;
            if(!like_list || like_list===0){
                like_list = [];
            }
            like_list.push(like_id);
            like_list = [...new Set(like_list)];
            return {
                like: like_list,
                like_count: like_list.length,
            };
        });

}

function replyToFeedbackThread(data, uid, name){
    if (!data.feedback_str) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a none-empty feedback_str.');
    }
    if (!data.media_object_path) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a none-empty media_object_path.');
    }
    if (!data.thread_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a legal thread_id.');
    }
    const feedback_str = data.feedback_str;
    const media_object_path = data.media_object_path;
    const thread_id = data.thread_id;
    const feedback_obj = createFeedbackObject(feedback_str, media_object_path, name);
    const media_object_ref = retrieveMediaObjRef(media_object_path);
    return media_object_ref
        .collection('feedback_threads').doc(thread_id)
        .collection('feedback_list').add(feedback_obj);
}

function deleteThread(data, uid){
    if (!data.media_object_path) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a specific media_object_path.');
    }
    if (!data.thread_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a specific thread_id.');
    }
    const media_object_path = data.media_object_path;
    const thread_id = data.thread_id;
    const media_object_ref = retrieveMediaObjRef(media_object_path);
    return media_object_ref.collection('feedback_threads').doc(thread_id)
        .update({deleted : true});
}


function resolveThread(media_object_path, thread_id){
    const media_object_ref = retrieveMediaObjRef(media_object_path);
    return media_object_ref.collection('feedback_threads').doc(thread_id)
        .update({resolved :  true});
}


function retrieveMediaObjRef(media_object_path){
    let media_object_ref = null;
    if(media_object_path.startsWith('video/')){
        media_object_ref = retrieveVideoMetaRef(media_object_path);
    }else if(media_object_path.startsWith('image/')){
        media_object_ref = retrieveImageMetaRef(media_object_path);
    }else{
        throw new Error('Not supported object type');
    }
    return media_object_ref;
}


// called by brand side to submit feed back. This is a special case of updateCampaign, and is provided to
// simplify API layer.
// it requires three fields: campaign_id, historyId, and feed_back
function feedback(data, uid, campaign_id, history_id){
    console.log('input data is', data);

    // Get a new write batch
    const batch = db.batch();
    const campaignHistoryRef = db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc(history_id);
    batch.set(campaignHistoryRef, {feed_back: data.feed_back}, {merge: true});
    return batch.commit();
}

async function finalizeAndWriteCampaignData(campaign_id, history_id, callback, uid){
    let campaignData = null;
    const campaignRef = db.collection('campaigns').doc(campaign_id);
    await campaignRef
        .collection('campaignHistory').doc(history_id).get()
        .then((snapshot) => {
            campaignData = snapshot.data();
            console.log('Found final campaign data',campaignData);
            return campaignData;
        })
        .catch(err => {
            console.log('Getting campaign history err', err);
            throw err;
        });
    return callback(campaignData, uid, campaign_id, history_id);
}

function writeFinalCampaign_callback(campaignData, uid, campaign_id, history_id){
    // Get a new write batch
    const campaignRef = db.collection('campaigns').doc(campaign_id);
    const batch = db.batch();
    batch.set(campaignRef, {final_campaign: campaignData,
        final_history_id: history_id}, {merge: true});
    return batch.commit();
}


function writeFinalVideoDrfat_callback(campaignData, uid, campaign_id, history_id){
    // Get a new write batch
    const campaignRef = db.collection('campaigns').doc(campaign_id);
    const batch = db.batch();
    batch.set(campaignRef, {
        final_video_draft: campaignData,
        final_video_draft_history_id: history_id,
    }, {merge: true});
    const influencerCamRef = db.collection(INFLUENCER_COLLECTIONS)
        .doc(uid).collection('campaigns')
        .doc(campaign_id);
    batch.set(influencerCamRef, {
        video_draft_data: campaignData,
        final_video_draft_history_id: history_id,
    }, {merge: true});
    return batch.commit()
        .then(res => {
            console.log('Transaction completed.');
            return res;
        })
        .catch(err => {
            console.log('Transaction failed', err);
            throw err;
        });
}


// called when the existing campaign information is approved or settled (skipped negotiation phase)
// it requires two fields: campaign_id, historyId
function finalizeCampaign(uid, campaign_id, history_id){
    return finalizeAndWriteCampaignData(campaign_id, history_id, writeFinalCampaign_callback, uid);
}

// called when the current uploaded video is finalized or approved.
// similar to finalizeCampaign, it requires two fields: campaign_id, history_id
function finalizeVideoDraft(uid, campaign_id, history_id){
    return finalizeAndWriteCampaignData(campaign_id, history_id, writeFinalVideoDrfat_callback, uid);
}


async function get_entitled_shops(idToken, next){
    let response_data;
    await fetch('https://api.lifo.ai/influencer/entitlement', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Authorization: idToken,
        },
    })
        .then(response => {
            if (response.statusCode > 299){
                console.error('failed to retrieve entitlement information with code', response.statusCode, response.statusText);
                throw new functions.https.HttpsError('not-found','failed to get matched shops');
            }
            response_data = response.json();
            return response_data;
        })
        .catch(next);
    return response_data;
}

function updateCampaignCommissionWithEntitlement(campaign_data, entitled_shops){
    const shop_detail = entitled_shops[campaign_data.brand_id];
    if (shop_detail){
        if(shop_detail.commission && shop_detail.commission > 0){
            console.debug(`Updating commission with ${shop_detail.commission} for \
            shop ${campaign_data.brand_id} with campaign id`, campaign_data.brand_campaign_id);
            campaign_data.commission_dollar = shop_detail.commission;
        }
        if(shop_detail.commission_percentage && shop_detail.commission_percentage > 0){
            campaign_data.commission_percentage = shop_detail.commission_percentage;
        }
    }
    return campaign_data;
}


// List all available brand initiated campaigns for current influencer, currently there's no filtering
// of eligibility yet.
async function listBrandCampaignsInf(uid, idToken, next){
    const entitled_shops = await get_entitled_shops(idToken, next);
    console.log('Obtained entitled shops', entitled_shops);
    const shop_list = Object.keys(entitled_shops);
    if (shop_list.length === 0){

        // this is a hack to avoid empty list error by the .where() clause below.
        shop_list.push('TestStoreLifoDefault');
    }
    return db.collection(BRAND_CAMPAIGN_COLLECTIONS).where('brand_id', 'in', shop_list).get()
        .then(querySnapshot => {
            const brand_campaigns = [];
            querySnapshot.docs.forEach(doc => {
                let doc_snap = doc.data();
                if(!doc_snap.deleted){
                    doc_snap = updateCampaignCommissionWithEntitlement(doc_snap, entitled_shops);
                    brand_campaigns.push(doc_snap);
                }
            });
            console.debug('Found', brand_campaigns.length, 'results for uid', uid);
            return brand_campaigns;
        });
}


async function get_referral_url(idToken, campaign_data, next){
    let response_data = {};
    await fetch('https://api.lifo.ai/influencer/lifo_tracking', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: idToken,
        },
        body: JSON.stringify(campaign_data),
    })
        .then(response => {
            if (response.statusCode > 299){
                console.error('failed to retrieve referral url with statusCode', response.statusCode, response.statusText);
                return new functions.https.HttpsError('not-found','failed to get matched shops');
            }
            response_data = response.json();
            return response_data;
        })
        .catch(next);
    return response_data;
}


// This is recommended to be used instead of get_referral_url to allow better workflow.
async function assign_referral_url(idToken, contract_data, next){
    let response_data = {};
    await fetch('https://api.lifo.ai/am/lifo_tracking', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: idToken,
        },
        body: JSON.stringify(contract_data),
    })
        .then(response => {
            if (response.statusCode > 299){
                console.error('failed to retrieve referral url with statusCode', response.statusCode, response.statusText);
                return new functions.https.HttpsError('not-found','failed to get matched shops');
            }
            response_data = response.json();
            return response_data;
        })
        .catch(next);
    return response_data;
}

async function register_tracking_url(idToken, account_id, brand_campaign_id){
    let brand_id = null;
    await db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id).get()
        .then(snapshot => {
            const data = snapshot.data();
            brand_id = data.brand_id;
            return brand_id;
        });
    return access_influencer_subcollection(brand_campaign_id).doc(account_id).get()
        .then(async snapshot => {
            const contract_data = snapshot.data();
            const data = {
                fixed_commission: contract_data.fixed_commission,
                percentage_commission: contract_data.percentage_commission,
                brand_campaign_id: contract_data.brand_campaign_id,
                account_id,
                brand_id,
            };
            const tracking_url = await assign_referral_url(idToken, data, next);
            return tracking_url;
        });
}


// this is gonna allow influencer to sign up for brand's campaign, and add campaign data into
// influencer profile, and update the promotional campaign with affiliate information.
function signupToBrandCampaign(brand_campaign_id, uid, idToken, next) {
    if (!brand_campaign_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a specific campaign_id.');
    }
    const brand_campaigns_ref = db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id);
    let brand_campaign_data = null;
    return brand_campaigns_ref.get()
        .then(async (snapshot) => {
            brand_campaign_data = snapshot.data();

            let collaborating_influencers = brand_campaign_data.collaborating_influencers;
            if (!collaborating_influencers){
                collaborating_influencers = [];
            }else if(collaborating_influencers.includes(uid)){
                console.debug('Influencer has already signed up');
                return {};
            }
            collaborating_influencers.push(uid);
            const uniq_inf = [...new Set(collaborating_influencers)];
            // brand_campaign_data.collaborating_influencers = uniq;

            const entitled_shops = await get_entitled_shops(idToken, next);
            console.log('Obtained entitled shops', entitled_shops);
            brand_campaign_data = updateCampaignCommissionWithEntitlement(brand_campaign_data, entitled_shops);
            const results = createCampaign(brand_campaign_data, uid,  false);

            const tracking_url = await get_referral_url(idToken, results.campaign_data, next);
            console.log('Obtained tracking url', tracking_url);

            const batch = results.batch_promise;

            // unique influencers are only updated to brand side campaign and not influencer side.
            batch.set(brand_campaigns_ref, {collaborating_influencers: uniq_inf}, {merge: true});

            // when influencers sign up to a campaign, save the influencer campaign id pairs.
            let inf_campaign_dict = brand_campaign_data.inf_campaign;
            if (!inf_campaign_dict) {
                inf_campaign_dict = {};
            }
            inf_campaign_dict[uid] = results.campaign_id;
            batch.set(brand_campaigns_ref, {inf_campaign_dict}, {merge: true});

            const new_inf_campaign_ref = db.collection('campaigns').doc(results.campaign_id)
                .collection('campaignHistory').doc(results.history_id);

            // TODO: check "status" existence
            if (tracking_url){
                console.log('Updating tracking url with data', tracking_url);
                batch.set(new_inf_campaign_ref, tracking_url, {merge: true});
            }else{
                console.warn('Failed to update tracking url for campaign', brand_campaign_data);
            }
            return {
                campaign_id: results.campaign_id,
                history_id: results.history_id,
                campaign_data: results.campaign_data,
                batch_promise: batch,
            };
        });
}


function createBrandCampaignData(brand_campaign_id, uid, data, is_new_camp=false){
    if(!brand_campaign_id){
        throw new functions.https.HttpsError('invalid-argument','campaign_id must not be empty!');
    }
    if(!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'New campaign must have a valid uid!');
    }
    const FieldValue = admin.firestore.FieldValue;

    // This is actually very important field to link brand initiated campaign with influencer "signed-up" campaigns
    data.brand_campaign_id = brand_campaign_id;

    // only when set brand_id when creating a new campaign
    // this field is crucial as brand_id will be used to filter campaigns that belong to current brand.
    if (is_new_camp) {
        data.brand_id = uid;
    }
    data.time_stamp = FieldValue.serverTimestamp();
    return data;
}


function createBrandCampaign(data, uid){
    const brandCampaignRef = db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc()
    const brand_campaign_id = brandCampaignRef.id;
    const brand_campaign_data = createBrandCampaignData(brand_campaign_id, uid, data, true);
    const promise = brandCampaignRef.set(brand_campaign_data);
    return {
        campaign_id: brandCampaignRef.id,
        promise,
    };
}


// this is for brand to see their promotions
function listBrandCampaignForBrand(uid){
    console.log('Get all brand campaign meta data that belong to current brand.');
    return db.collection(BRAND_CAMPAIGN_COLLECTIONS)
        .where('brand_id', '==', uid)
        .get()
        .then(querySnapshot => {
            const brand_campaigns = [];
            querySnapshot.docs.forEach(doc => {
                const doc_snap = doc.data();
                if (!doc_snap.deleted ){
                    brand_campaigns.push(doc_snap);
                }
            });
            console.log(`Found ${brand_campaigns.length} brand campaigns for ${uid}`);
            return brand_campaigns;
        });
}


function totalInfCount(uid){
    return listBrandCampaignForBrand(uid)
        .then(brand_campaigns => {
            let inf_ids = [];
            brand_campaigns.forEach(campaign => {
                if(campaign.collaborating_influencers && campaign.collaborating_influencers.length >0){
                    inf_ids = inf_ids.concat(campaign.collaborating_influencers);
                }
            });
            const results = [... new Set(inf_ids)];
            return results;
        });
}

// this is for brand to see their promotions
function getBrandCampaignForBrand(campaign_id){
    const campaign_ref =  db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc(campaign_id).get()
        .then(querySnapshot => {
            const brand_campaign = querySnapshot.data();
            console.log('Found', brand_campaign);
            return brand_campaign;
        });
    const discovered_inf_ref = access_influencer_subcollection(campaign_id).get()
        .then(querySnapshot => {
            const discovered_influencers = [];
            querySnapshot.docs.forEach(doc => {
                discovered_influencers.push(doc.data());
            });
            console.debug('Found', discovered_influencers.length, 'recommended influencers');
            return discovered_influencers;
        });
    return Promise.all([campaign_ref, discovered_inf_ref]);
}


function saveTargetingInfo(brand_campaign_id, data){
    return db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id)
        .update({
            targeting_info: data,
        });
}

function getTargetingInfo(brand_campaign_id){
    return db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id).get()
        .then(snapshot => {
            const campaign_data = snapshot.data();
            return campaign_data.targeting_info;
        });
}


function updateBrandCampaign(data, uid, brand_campaign_id){
    if(!brand_campaign_id){
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a specific campaign_id.');
    }

    return db.collection('brands')
        .doc(uid).collection(BRAND_CAMPAIGN_COLLECTIONS)
        .doc(brand_campaign_id)
        .update(data);
}


function deleteBrandCampaign(brand_campaign_id){
    const camapign_ref = db.collection(BRAND_CAMPAIGN_COLLECTIONS)
        .doc(brand_campaign_id);
    return camapign_ref.update({deleted: true});
}

function endBrandCampaign(data, uid){
    if(!data.brand_campaign_id){
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a specific campaign_id.');
    }
    const batch = db.batch();

    const brand_campaign_ref = db.collection('brands')
        .doc(uid).collection(BRAND_CAMPAIGN_COLLECTIONS)
        .doc(data.brand_campaign_id);
    batch.update(brand_campaign_ref, {ended: true});
    const camapign_ref = db.collection(BRAND_CAMPAIGN_COLLECTIONS)
        .doc(data.brand_campaign_id);
    batch.update(camapign_ref, {ended: true});
    return batch.commit();

}

// takes in a new data object, update the influencer profile with it.
function updateInfluencerProfile(uid, data){
    const influencerRef = db.collection(INFLUENCER_COLLECTIONS).doc(uid);
    return influencerRef.set(data, {merge: true});
}

function getInfluencerProfile(uid){
    const influencerRef = db.collection(INFLUENCER_COLLECTIONS).doc(uid);
    return influencerRef.get();
}

function getAllMedia(campaign_id, campaign_type){
    let media_type;
    if(campaign_type === 'video'){
        media_type = 'videos';
    }else{
        media_type = 'images';
    }
    const media_ref = db.collection('campaigns').doc(campaign_id).collection(media_type).get();
    return media_ref.then(snapshot => {
        const results = [];
        snapshot.docs.forEach(doc => {
            results.push(doc.data());
        });
        return results;
    });
}

function access_influencer_subcollection(brand_campaign_id) {
    return db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id)
        .collection(INFLUENCER_COLLECTIONS);
}


function gen_influencer_doc_id(platform, account_id){
    return `${platform}_${account_id}`;
}


function add_recommended_influencers(brand_campaign_id, data){
    const batch = db.batch();
    const skip_brand_selected = data.skip_brand;
    let signing_status = INFLUENCER_RECOMMENDED;
    if(skip_brand_selected){
        signing_status = BRAND_CHOSEN;
    }
    if(data.influencers){
        let i = 0;
        for (i = 0; i < data.influencers.length; i ++){
            const influencer = data.influencers[i];
            const cur_inf_email = influencer.email;
            const platform = influencer.platform;
            const account_id = influencer.account_id;
            const influencer_ref = access_influencer_subcollection(brand_campaign_id)
                .doc(account_id);
            batch.set(influencer_ref, {
                email: cur_inf_email,
                account_id,
                platform,
                profile: influencer,
                inf_signing_status: signing_status,
            }, {merge: true});
        };
        const campaign_ref = db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id);

        // Note: for each recommendation, we update discovery_status to NEWLY_DISCOVERED.
        // The discovery_status changes when user views the results, or click the "discover more" button.
        batch.update(campaign_ref, {discovery_status: NEWLY_DISCOVERED});
    }else{
        console.warn('Incoming data does not have influencer profiles');
    };
    return batch.commit();
};


function discover_more_influencers(brand_campaign_id){
    const campaign_ref = db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id);
    return campaign_ref.update({discovery_status: NEED_MORE_INFLUENCERS});
}


function view_influencer_discovery_results(brand_campaign_id) {
    const campaign_ref = db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id);
    campaign_ref.update({discovery_status: RESULTS_VIEWED});
    const influencer_ref = access_influencer_subcollection(brand_campaign_id);
    return influencer_ref.get()
        .then(snapshots => {
            const influencers = [];
            snapshots.docs.forEach(doc => {
                const doc_snap = doc.data();
                if (doc_snap) {
                    influencers.push(doc_snap);
                }
            });
            return influencers;
        });
}


function getBrandCampaignStatus(brand_campaign_id){
    return db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id).get()
        .then(snapshot => {
            const campaign_data = snapshot.data();
            const inf_campaign_dict = campaign_data.inf_campaign_dict;

            // this field is generated during campaign performance posting
            const inf_posted = campaign_data.inf_posted;
            if(!inf_campaign_dict && !inf_posted){
                return 'In negotiation';
            }else if(inf_campaign_dict && !inf_posted){
                return 'Content production';
            }else{
                return 'Campaign completed';
            }
        });
};


function getBrandContactInfo(brand_campaign_id){
    return db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id).get()
        .then(snapshot => {
            const campaign_data = snapshot.data();
            const brand = campaign_data.brand_id || campaign_data.brand;
            const contact_name = campaign_data.contact_name;
            const contact_email = campaign_data.contact_email;
            return {
                brand,
                brand_contact_name: contact_name,
                brand_email: contact_email,
                brand_campaign_name: campaign_data.campaign_name,
            };
        });
};

// Util for email notifications for both brand and AM side.
function sendSystemNotifications(endpoint, jsonBody, idToken){
    return fetch(`https://auth.lifo.ai/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: idToken,
        },
        body: JSON.stringify(jsonBody),
    });
};

// wrapper for influencer discovery notifications
function discoveredInfNotificaitons(brand_campaign_id, idToken){
    return infDisocverNotificaitons(brand_campaign_id, idToken, '/am/discovered_notifications');
};

// wrapper for influencer discovery notifications
function discoveredMoreNotificaitons(brand_campaign_id, idToken){
    return infDisocverNotificaitons(brand_campaign_id, idToken, '/discover_more_notifications');
};

// Util for influencer discovery notifications
function infDisocverNotificaitons(brand_campaign_id, idToken, endpoint){
    return getBrandContactInfo(brand_campaign_id)
        .then(results =>{
            const payload = {
                brand: results.brand,
                brand_contact_name: results.brand_contact_name,
                brand_email: results.brand_email,
                brand_campaign_name: results.brand_campaign_name,
            };
            console.log('Found brand contact info', payload);
            return sendSystemNotifications(endpoint, payload, idToken);
        });
};


function getBrandCampaignDataFromInfCampaign(inf_campaign_id){
    return db.collection(INFLUENCER_CAMPAIGN_COLLECTIONS).doc(inf_campaign_id).get()
        .then(snapshot => {
            const campaign_data = snapshot.data();
            const brand_campaign_id = campaign_data.brand_campaign_id;
            const uid = campaign_data.uid;
            return {
                brand_campaign_id,
                uid,
            };
        })
};


function approveContent(inf_campaign_id, history_id){
    return getBrandCampaignDataFromInfCampaign(inf_campaign_id)
        .then(data => {
            if(!data.brand_campaign_id || !data.uid){
                return null;
            }
            return access_influencer_subcollection(data.brand_campaign_id).doc(data.uid)
                .update({
                    content_approval_version: history_id
                })
        })
}

function addNote(brand_campaign_id, influencer_id, note) {
    return access_influencer_subcollection(brand_campaign_id).doc(influencer_id)
        .update(note);
}

function addShippingInfo(brand_campaign_id, influencer_id, shipping_info) {
    // Get more Shipping Info here
    return access_influencer_subcollection(brand_campaign_id).doc(influencer_id)
        .update({
            shipping_info,
            product_ship_time: moment.utc().unix()
        });
}

function receiveShipping(brand_campaign_id, influencer_id) {
    // Need to get information here.
    return access_influencer_subcollection(brand_campaign_id).doc(influencer_id)
        .update({
            product_received_time: moment.utc().unix()
        });
}


// For each campaign, create a recruit object for managing/updating the recruit lifecycle
function createCampaignRecruit(data){
    const brand_campaign_id = data.brand_campaign_id;
    const quota = data.quota;
    const influencer_commissions = data.influencer_commissions;
    const influencer_emails = data.inf_emails;
    const bonus_percentage = data.bonus_percentage;
    const bonus_time = data.bonus_time;
    const max_time = data.max_time;
    const inv_deadline = data.inv_deadline;

    const invited_ins_influencers = [];
    const inf_commissions = [];
    const inf_emails = [];
    for (const [inf, commission] of Object.entries(influencer_commissions)) {
        invited_ins_influencers.push(inf);
        inf_commissions.push(commission);
        inf_emails.push(influencer_emails[inf]);
    }
   return db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id).get()
        .then(snapshot => {
            const FieldValue = admin.firestore.FieldValue;
            const brand_campaign_data = snapshot.data();
            const campaign_recruit_ref = admin.database().ref(`${CAMPAIGN_RECRUIT_RT}/` + brand_campaign_id);
            const product_name = brand_campaign_data.product_name;
            const brand = brand_campaign_data.brand;
            const status = RECRUIT_OPEN;
            const recruited_influencers = [];
            return campaign_recruit_ref.set({
                    product_name,
                    brand,
                    status,
                    quota,
                    invited_ins_influencers,
                    inf_commissions,
                    inf_emails,
                    recruited_influencers,
                    timestamp: FieldValue.serverTimestamp(),
                });
        })
       .then(results => {
           return createInvitations(brand_campaign_id, influencer_commissions, bonus_percentage, bonus_time, max_time, inv_deadline, influencer_emails);
       });
}


// For each influencer ID (ins or not), create an invitation with meta data under RT firebase: invitations/
function createInvitations(brand_campaign_id, influencer_commissions_map, bonus, bonus_time, max_time, inv_deadline, influencer_emails){
    return Object.entries(influencer_commissions_map).forEach((inf_id_tuple, index) => {
        const commission = inf_id_tuple[1];
        const inf_id = inf_id_tuple[0];
        const inf_email = influencer_emails[inf_id];
        const invitation_ref = admin.database().ref(`${INVITATIONS_RT}/` + inf_id + `/${brand_campaign_id}`);
        return invitation_ref.set({
            brand_campaign_id,
            commission,
            bonus,
            bonus_time,
            max_time,
            inv_deadline,
            inf_email,
            status: INV_OPEN,
        });
    })
}

/**
 *
 * @param brand_campaign_id {string}
 * @param inf_id {string} : this is the social media ID as opposed to internal uid
 */
async function getInvitation(inf_id, brand_campaign_id){
    const invitation_ref = admin.database().ref(`${INVITATIONS_RT}/` + inf_id + `/${brand_campaign_id}`);
    return await invitation_ref.once('value', function(snapshot) {
        return snapshot.val();
    });
}


async function recruitStatus(brand_campaign_id){
    const campaign_recruit_ref = admin.database().ref(`${CAMPAIGN_RECRUIT_RT}/${brand_campaign_id}` );
    const snapdata = await campaign_recruit_ref.once('value',  function(snapshot) {
        const data = snapshot.val();
        return data;
    });
    const data = snapdata.val();
    const status = data.status;
    console.info('recruit data is', data);
    console.info('recruit data is', Object.keys(data.recruited_influencers).length);


    // when recruit is open, check the quota vs recruited influencers, update status if needed
    if(status === RECRUIT_OPEN){
        if(!data.recruited_influencers){
            return RECRUIT_OPEN;
        }
        if(data.quota <= Object.keys(data.recruited_influencers).length){
            await campaign_recruit_ref.update({status: RECRUIT_CLOSED});
            return RECRUIT_CLOSED;
        }
        return RECRUIT_OPEN;
    }else{

        if(!data.recruited_influencers){
            return data.status;
        }
        // if for some reason the quota is larger than the recruit size, open the recruit.
        if(data.quota > Object.keys(data.recruited_influencers).length){
            await campaign_recruit_ref.update({status: RECRUIT_OPEN});
            return RECRUIT_OPEN;
        }
    }
}


function closeRecruit(brand_campaign_id){
    const campaign_recruit_ref = admin.database().ref(`${CAMPAIGN_RECRUIT_RT}/${brand_campaign_id}` );
    return campaign_recruit_ref.update({status: RECRUIT_CLOSED});
}


/**
 *
 * @param brand_campaign_id {string}
 * @param inf_id {string} : this is the social media ID as opposed to internal uid
 */
async function checkInvStatus(brand_campaign_id, inf_id){
    const FieldValue = admin.firestore.FieldValue;
    const inv_ref = admin.database().ref(`${INVITATIONS_RT}/` + inf_id + `/${brand_campaign_id}`);
    const data = await inv_ref.once('value',  snapshot => {
        const data = snapshot.val();
        return data;
    });
    if(data.status === INV_OPEN){
        if(data.deadline <= FieldValue.serverTimestamp()){
            console.info('Invitation expired for', brand_campaign_id, inf_id);
            await inv_ref.update({
                status: INV_EXPIRED,
            });
            return INV_EXPIRED;
        }
    }
    console.log('invitation data is', data.val());
    return data.val().status;
}


/**
 *
 * @param brand_campaign_id {string}
 * @param inf_id {string} : this is the social media ID as opposed to internal uid
 */
function isInvOpen(brand_campaign_id, inf_id){
    return checkInvStatus(brand_campaign_id, inf_id)
        .then(status => {
            console.log('current status is', status);
            if (status === INV_OPEN){
                return true;
            }
            return false;
        })
}


/**
 *
 * @param brand_campaign_id {string}
 * @param inf_id {string} : this is the social media ID as opposed to internal uid
 * @param uid {string}: this is the internal account for each influencer
 */
function createInfCampaignCommissionStructured(brand_campaign_id, inf_id, uid){
    const brand_campaigns_ref = db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id);
    return getInvitation(inf_id, brand_campaign_id)
        .then(snapshot =>{
            const invitation_details = snapshot.val();
            // return createCampaign(brand_campaign_data, uid,  false);
            return brand_campaigns_ref.collection('influencers').doc(inf_id)
                .set({
                invitation_details: invitation_details
            }, {
                merge: true
            });
        });
}


/**
 *
 * @param brand_campaign_id {string}
 * @param inf_id {string} : this is the social media ID as opposed to internal uid
 * @param uid {string}: this is the internal account for each influencer
 */
function acceptInvitation(brand_campaign_id, inf_id, uid) {
    return isInvOpen(brand_campaign_id, inf_id)
        .then(is_open => {
            if (is_open) {
                return createInfCampaignCommissionStructured(brand_campaign_id, inf_id, uid)
            }
            console.info('Invitation not open for sign up');
            return null;
        })
        .then(results => {
            if (!results) {
                return null;
            }
            const inv_ref = admin.database().ref(`${INVITATIONS_RT}/` + inf_id + `/${brand_campaign_id}`);
            const campaign_recruit_ref = admin.database().ref(`${CAMPAIGN_RECRUIT_RT}/${brand_campaign_id}`);
            return Promise.all([
                inv_ref.update( {status: INV_ACCEPTED}),
                campaign_recruit_ref.child('recruited_influencers').push(inf_id)
            ]);
        });
}


/**
 *
 * @param brand_campaign_id {string}
 * @param inf_id {string} : this is the social media ID as opposed to internal uid
 * @param uid {string}: this is the internal account for each influencer
 */
function declineInvitation(brand_campaign_id, inf_id, uid) {
    const inv_ref = admin.database().ref(`${INVITATIONS_RT}/` + inf_id + `/${brand_campaign_id}`);
    return inv_ref.update({status: INV_DECLINED});
}


// Currently this pricing rul is hardcoded. But should be relatively easy to change to configurations.
function commissisonRule(follower_cnts, product_cost, cpm, bonus_rate, max_commission){
    if(typeof follower_cnts != 'number'){
        // by default, commission is $80
        return 80;
    }

    let cpm_tier;
    const follower_5k_mod = Math.floor(follower_cnts / 5000);

    if(follower_cnts <= 30000){
        cpm_tier = cpm;
    }else if(follower_cnts > 30000 && follower_cnts <= 50000){
        cpm_tier = cpm - 1;
    }else if(follower_cnts > 50000 && follower_cnts <= 100000){
        cpm_tier = cpm - 2;
    }else if(follower_cnts > 100000 && follower_cnts <= 200000){
        cpm_tier = cpm - 3;
    }else{
        cpm_tier = cpm - 4;
    }
    let commission_dollar = Math.min(Math.max(cpm_tier * 5 * follower_5k_mod - product_cost, 0), max_commission);

    let bonus_dollar = Math.floor(commission_dollar * bonus_rate);
    commission_dollar = Math.floor(commission_dollar / 10) * 10;
    return {
        commission_dollar,
        bonus_dollar
    }
}


/**
 *
 * @param influencer_list {Array}: list of influencers, each item is an object with: influencer id, follower counts,
 * @param max_commission {number} : this is the max base commission for each influencer
 * @param bonus_percentage {number} : percentage of the bonus. Used to calculate the bonus dollar amount.
 * @param product_cost {number} : this is the expected cost of the product. Will affect the commission each influencer receives.
 * @param cpm {number} : this is the base cpm for each 1k followers.
 * Note: here we hardcode the pricing rules and bonus rounding rules in the server side.
 */
function calculateCommission(influencer_list, max_commission, bonus_percentage, product_cost, cpm  ){
    let results = [];
    influencer_list.forEach(influencer => {
        const inf_id = influencer.inf_id;
        const follower_cnts = influencer.follower_cnts;
        if(bonus_percentage > 1){
            bonus_percentage = bonus_percentage / 100;
        }
        const influencer_commission = commissisonRule(follower_cnts, product_cost, cpm, bonus_percentage, max_commission);
        results.push({
            inf_id,
            commission_dollar: influencer_commission.commission_dollar,
            bonus_dollar: influencer_commission.bonus_dollar
        })
    })
    return results;
}

module.exports = {
    getCampaign,
    getAllCampaign,
    getLatestCampaignPath,
    getCampaignHistories,
    getAllMedia,
    createCampaign,
    deleteCampaign,
    feedback,
    updateCampaign,
    completeCampaign,
    finalizeCampaign,
    finalizeVideoDraft,
    createFeedbackThread,
    replyToFeedbackThread,
    likeFeedback,
    resolveThread,
    deleteThread,
    getAllThreads,
    listBrandCampaignsInf,
    signupToBrandCampaign,
    updateInfluencerProfile,
    getInfluencerProfile,
    createBrandCampaign,
    listBrandCampaignForBrand,
    getBrandCampaignForBrand,
    amGetAllBrandCampaign,
    amGetInfCampaigns,
    updateBrandCampaign,
    deleteBrandCampaign,
    endBrandCampaign,
    totalInfCount,
    add_recommended_influencers,
    discover_more_influencers,
    view_influencer_discovery_results,
    access_influencer_subcollection,
    register_tracking_url,
    saveTargetingInfo,
    getTargetingInfo,
    getBrandCampaignStatus,
    getBrandContactInfo,
    discoveredInfNotificaitons,
    discoveredMoreNotificaitons,
    approveContent,
    addNote,
    addShippingInfo,
    receiveShipping,
    createCampaignRecruit,
    getInvitation,
    recruitStatus,
    closeRecruit,
    createInfCampaignCommissionStructured,
    checkInvStatus,
    isInvOpen,
    acceptInvitation,
    declineInvitation,
    calculateCommission,
    GENERIC_INF_CREATED_CAMPAIGN,
    BRAND_CAMPAIGN_COLLECTIONS,
    FIXED_RATE,
    PERCENTAGE_RATE,
    BRAND_CHOSEN,
    NO_RESPONSE,
    OFFER_MADE,
    INFLUENCER_ACCEPT,
    INFLUENCER_DECLINE,
    INFLUENCER_SIGNEDUP,
    EMAIL_SENT,
    SKIP_OFFER,
    OFFER_CANCELLED,
    IN_CONTENT_REVIEW,
    CONTENT_APPROVED,
};
