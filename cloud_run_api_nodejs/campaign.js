const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore();


function uriParse(video_name){
    const tokens = video_name.split('/');
    return {
        uid: tokens[1],
        campaign_id: tokens[2],
        history_id: tokens[3],
        file_name: tokens[4],
    };
}

// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
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

// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
function retrieveImageMetaRef(filePath){
    // The following is to handle the auth, campaign id, and history id parsing.
    return retrieveMediaMetaRef(filePath, 'images');
}

// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
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

    // here we will use the campaign history_id to identify unique video versions.
    const video_id = parsedTokens.history_id;
    return db.collection('campaigns').doc(campaign_id)
        .collection(mediaType).doc(video_id);
}


function getAllCampaign(uid) {
    console.log('Get all campaign meta data that belong to current user.');
    return db.collection('influencers').doc(uid).collection('campaigns').get()
        .then(querySnapshot => {
            const markers = [];
            querySnapshot.docs.forEach(doc => {
                const doc_snap = doc.data();
                markers.push(doc_snap);
            });
            console.log('Found', markers.length, 'results');
            return markers;
        });
}

// Get campaign meta information when been called.
function getCampaign(data, uid, res) {
    const markers = [];
    const campaign_id = data.campaign_id;
    console.log('Querying campaign', campaign_id);
    let latest_history_ref = db.collection('campaigns').doc(campaign_id)
        .collection('campaignHistory').orderBy('timestamp', 'desc').get()
        .then(querySnapshot => {
            querySnapshot.docs.forEach(doc => {
                markers.push(doc.data());
            });
            console.log('Found', markers.length, 'results');
            return markers;
        });
    let final_history_id = '';
    let final_campaign = {};
    let final_video_draft_history_id = '';
    let final_video_draft = {};
    let final_campaign_ref = db.collection('campaigns').doc(campaign_id).get()
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

function createCampaignData(campaign_id, data, uid, history_id){
    if (!campaign_id){
        throw new functions.https.HttpsError('campaign_id must not be empty!');
    }
    if(!uid) {
        throw new functions.https.HttpsError('New campaign must have a valid uid!');
    }

    try{
        const milestones = [];
        if(data.milestones){
            data.milestones.forEach((item) => {
                milestones.push(item);
            });
        }else{
            console.log('incoming milestone needs to be an array.');
        }
        const image = [];
        if(data.image){
            data.image.forEach((item) => {
                image.push(item);
            });
        }else{
            console.log('incoming image field needs to be an array.');
        }
        const requirements = [];
        if(data.requirements){
            data.requirements.forEach((item) => {
                requirements.push(item);
            });
        }else{
            console.log('incoming requirements needs to be an array.');
        }
        let extra_info = {};
        try{
            if(data.extra_info) {
                extra_info = JSON.parse(data.extra_info);
            }
        }
        catch(err){
            console.log('incoming extra info needs to be json object', err);
            extra_info = {};
        }
        const FieldValue = admin.firestore.FieldValue;
        const campaignData  = {
            campaign_id,
            brand: String(data.brand),
            campaign_name: String(data.campaign_name),
            commision_dollar: Number(data.commision_dollar),
            contacts: String(data.contacts),
            content_concept: String(data.content_concept),
            end_time: Number(data.end_time),
            feed_back: String(data.feed_back),
            image,
            video: String(data.video),
            milestones,
            requirements,
            extra_info,
            shipping_address: String(data.shipping_address),
            tracking_number: String(data.tracking_number),
            influencer_id: uid,
            timestamp: FieldValue.serverTimestamp(),
            history_id: String(history_id),
        };
        return campaignData;
    }
    catch(err){
        console.log('Error creating campaign data', err);
        throw new functions.https.HttpsError('Failed to create campaign data');
    }
}

// called when influencers decide to create a new campaign with related information. u
function createCampaign(data, uid){
    const campaignRef = db.collection('campaigns').doc();
    const campaign_id = campaignRef.id;
    console.log('Creating a new campaign with id', campaign_id);

    const batch = db.batch();

    const historyRef = db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc();
    const history_id = historyRef.id;
    const campaignData  = createCampaignData(campaign_id, data, uid, history_id);
    const campaignDocRef = db.collection('campaigns').doc(campaign_id)
        .collection('campaignHistory').doc(history_id);
    batch.set(campaignDocRef, campaignData);
    const docref =  db.collection('campaigns').doc(campaign_id);
    const infCampaignRef = db.collection('influencers')
        .doc(uid).collection('campaigns')
        .doc(campaign_id);
    batch.set(infCampaignRef, {
        camapign_ref: docref.path,
        campaign_id,
        campaign_name: String(data.campaign_name),
        campaign_data: campaignData,
    });
    console.log('creating campaign with id', campaign_id);
    return {
        campaign_id,
        history_id,
        batch_promise: batch
    };
}

// called when an existing campaign gets updated, this include anything that campaign data touches on.
// the data is expected to have the same schema (subset) of campaign data.
function updateCampaign(campaign_id, data, uid){
    console.log('input data is', data, 'updating campaign', campaign_id);
    // Get a new write batch
    const batch = db.batch();

    const campaignHistoryRef = db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc();
    const history_id = campaignHistoryRef.id;
    const newCamp = createCampaignData(campaign_id, data, uid, history_id);
    console.log('Created new campaign data:', newCamp);
    batch.set(campaignHistoryRef, newCamp);

    // get the updated campaign information, and add it to influencer's profile.
    const influencerCamRef = db.collection('influencers')
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
    console.log('Deleting campaign', campaign_id, 'from influencer', uid);
    const campaignRef = db.collection('campaigns').doc(campaign_id);

    const batch = db.batch();
    batch.delete(campaignRef);
    const influencerCamRef = db.collection('influencers').doc(uid)
        .collection('campaigns').doc(campaign_id);
    batch.delete(influencerCamRef);
    return batch.commit();
}


// this is to define a single feed back object.
// This object will have a structure with the following assumptions:
// each media object can have multiple threads of feedbacks
// each thread can have a list of feedbacks
// each feedback is an object defined by the function below.
function createFeedbackObject(feedback_str, media_object_path, displayName='', like=0, dislike=0,
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
function createFeedbackThread(data, uid){
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
    const displayName = data.displayName;
    const FieldValue = admin.firestore.FieldValue;
    const feedback_obj = createFeedbackObject(feedback_str, media_object_path, displayName);
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
    return batch.commit();
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

function replyToFeedbackThread(data, uid){
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
    const displayName = data.displayName;
    const thread_id = data.thread_id;
    const feedback_obj = createFeedbackObject(feedback_str, media_object_path, displayName);
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
        media_object_ref = retrieveSingleImageMetaRef(media_object_path);
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

    const influencerCamRef = db.collection('influencers')
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
    const influencerCamRef = db.collection('influencers')
        .doc(uid).collection('campaigns')
        .doc(campaign_id);
    batch.set(influencerCamRef, {
        campaign_data: campaignData,
        final_history_id: history_id,
    }, {
        merge: true,
    });
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


function writeFinalVideoDrfat_callback(campaignData, uid, campaign_id, history_id){
    // Get a new write batch
    const campaignRef = db.collection('campaigns').doc(campaign_id);
    const batch = db.batch();
    batch.set(campaignRef, {
        final_video_draft: campaignData,
        final_video_draft_history_id: history_id,
    }, {merge: true});
    const influencerCamRef = db.collection('influencers')
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

module.exports = {
    getCampaign,
    getAllCampaign,
    createCampaign,
    deleteCampaign,
    feedback,
    updateCampaign,
    finalizeCampaign,
    finalizeVideoDraft,
    createFeedbackThread,
    replyToFeedbackThread,
    resolveThread,
    deleteThread,
    getAllThreads,
};
