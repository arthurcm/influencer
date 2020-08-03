const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore();

const path = require('path');

const PERCENTAGE_RATE = 'commission_per_sales_campaign';
const FIXED_RATE = 'one_time_commission_campaign';
const GENERIC_INF_CREATED_CAMPAIGN = 'generic_campaign';
const BRAND_CAMPAIGN_COLLECTIONS = 'brand_campaigns';
const INFLUENCER_COLLECTIONS = 'influencers';

const INFLUENCER_RECOMMENDED = 'Recommended';
const BRAND_CHOSEN = 'Brand chosen';
const NO_RESPONSE = 'No response';
const OFFER_MADE = 'Offer made';
const EMAIL_SENT = 'Email sent. Waiting for response.';
const INFLUENCER_ACCEPT = 'Influencer accepted offer';
const INFLUENCER_DECLINE = 'Influencer declined offer';
const INFLUENCER_SIGNEDUP = 'Influencer signed up';

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

function updateCampaignData(uid, campaign_id, data, history_id){
    const FieldValue = admin.firestore.FieldValue;
    data.influencer_id = uid;
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
    data = updateCampaignData(uid, campaign_id, data, history_id);

    const campaignDocRef = db.collection('campaigns').doc(campaign_id)
        .collection('campaignHistory').doc(history_id);
    batch.set(campaignDocRef, data);
    const docref = db.collection('campaigns').doc(campaign_id);
    const infCampaignRef = db.collection(INFLUENCER_COLLECTIONS)
        .doc(uid).collection('campaigns')
        .doc(campaign_id);
    batch.set(infCampaignRef, {
        campaign_ref: docref.path,
        campaign_id,
        campaign_name: String(data.campaign_name),
        campaign_data: data,
    });
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

    // get the updated campaign information, and add it to influencer's profile.
    const influencerCamRef = db.collection(INFLUENCER_COLLECTIONS)
        .doc(uid).collection('campaigns')
        .doc(campaign_id);
    batch.set(influencerCamRef, {completed: true}, {merge: true});
    return batch.commit();
}

// called when an existing campaign gets updated, this include anything that campaign data touches on.
// the data is expected to have the same schema (subset) of campaign data.
function updateCampaign(campaign_id, data, uid){
    console.debug('input data is', data, 'updating campaign', campaign_id);
    // Get a new write batch
    const batch = db.batch();

    const campaignHistoryRef = db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc();
    const history_id = campaignHistoryRef.id;
    const newCamp = updateCampaignData(uid, campaign_id, data, history_id);
    console.debug('Created new campaign data:', newCamp);
    batch.set(campaignHistoryRef, newCamp);

    // get the updated campaign information, and add it to influencer's profile.
    const influencerCamRef = db.collection()
        .doc(uid).collection('campaigns')
        .doc(campaign_id);
    batch.update(influencerCamRef, {campaign_data: newCamp});
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

    const influencerCamRef = db.collection(INFLUENCER_COLLECTIONS)
        .doc(uid).collection('campaigns')
        .doc(campaign_id);
    if (uid === 'no_uid'){
        batch.set(influencerCamRef, {'campaign_data.brand_feed_back': data.feed_back}, {merge: true});
    }else {
        batch.set(influencerCamRef, {'campaign_data.feed_back': data.feed_back}, {merge: true});
    }
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
        shop_list.push('TestStoreLfioDefault');
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
    await fetch('https://api.lifo.ai/influencer/lifo_tracker_id', {
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
    const batch = db.batch();
    const brandCampaignRef = db.collection('brands')
        .doc(uid).collection(BRAND_CAMPAIGN_COLLECTIONS)
        .doc();
    const brand_campaign_data = createBrandCampaignData(brandCampaignRef.id, uid, data, true);
    batch.set(brandCampaignRef, brand_campaign_data);
    const allBrandCampaignRef = db.collection(BRAND_CAMPAIGN_COLLECTIONS).doc(brandCampaignRef.id);
    batch.set(allBrandCampaignRef, brand_campaign_data);
    return {
        campaign_id: brandCampaignRef.id,
        batch_promise: batch,
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


function deleteBrandCampaign(data, uid){
    if(!data.brand_campaign_id){
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a specific campaign_id.');
    }
    const batch = db.batch();

    const brand_campaign_ref = db.collection('brands')
        .doc(uid).collection(BRAND_CAMPAIGN_COLLECTIONS)
        .doc(data.brand_campaign_id);
    batch.update(brand_campaign_ref, {deleted: true});
    const camapign_ref = db.collection(BRAND_CAMPAIGN_COLLECTIONS)
        .doc(data.brand_campaign_id);
    batch.update(camapign_ref, {deleted: true});
    return batch.commit();
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


// TODO: Add more details including commission, Modash profile etc.
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
    }else{
        console.warn('Incoming data does not have influencer profiles');
    };
    return batch.commit();
};

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
    updateBrandCampaign,
    deleteBrandCampaign,
    endBrandCampaign,
    totalInfCount,
    add_recommended_influencers,
    access_influencer_subcollection,
    GENERIC_INF_CREATED_CAMPAIGN,
    FIXED_RATE,
    PERCENTAGE_RATE,
    BRAND_CHOSEN,
    NO_RESPONSE,
    OFFER_MADE,
    INFLUENCER_ACCEPT,
    INFLUENCER_DECLINE,
    INFLUENCER_SIGNEDUP,
    EMAIL_SENT,
};
