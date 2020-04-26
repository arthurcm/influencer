const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore();


async function getAllCampaign(uid) {
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
async function getCampaign(data, uid, res) {
    const markers = [];
    const campaign_id = data.campaign_id;
    console.log('Querying campaign', campaign_id);
    await db.collection('campaigns').doc(campaign_id)
        .collection('campaignHistory').orderBy('time_stamp', 'desc').get()
        .then(querySnapshot => {
            querySnapshot.docs.forEach(doc => {
                markers.push(doc.data());
            });
            console.log('Found', markers.length, 'results');
            return markers;
        })
        .catch(err => {
            console.log('failed to get campaign data!', err);
            return err;
        });
    let final_history_id = '';
    let final_campaign = {};
    let final_video_draft_history_id = '';
    let final_video_draft = {};

    return db.collection('campaigns').doc(campaign_id).get()
        .then(camSnapShot => {
            if (!camSnapShot.exists){
                return {};
            }else{
                final_history_id = camSnapShot.get('final_history_id');
                final_campaign = camSnapShot.get('final_campaign');
                final_video_draft_history_id = camSnapShot.get('final_video_draft_history_id');
                final_video_draft = camSnapShot.get('final_video_draft');
                res.send( {
                    campaign_historys: markers,
                    final_history_id,
                    final_campaign,
                    final_video_draft_history_id,
                    final_video_draft,
                })
                return {
                    final_history_id,
                    final_campaign,
                    final_video_draft_history_id,
                    final_video_draft,
                };
            }
        })
        .catch(err => {
            console.log('failed to get campaign data!', err);
            return err;
        });
}

function createCampaignData(campaign_id, data, uid, time_stamp, history_id){
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
        const campaignData  = {
            campaign_id,
            brand: String(data.brand),
            campaign_name: String(data.campaign_name),
            commision_dollar: Number(data.commision_dollar),
            contacts: String(data.contacts),
            content_concept: String(data.content_concept),
            end_time: Number(data.end_time),
            feed_back: String(data.feed_back),
            image: String(data.image),
            video: String(data.video),
            milestones,
            requirements,
            extra_info,
            shipping_address: String(data.shipping_address),
            tracking_number: String(data.tracking_number),
            influencer_id: uid,
            time_stamp,
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
async function createCampaign(data, uid){

    const campaignRef = db.collection('campaigns').doc();
    const campaign_id = campaignRef.id;
    console.log('Creating a new campaign with id', campaign_id);
    const time_stamp = Date.now();

    const batch = db.batch();

    const historyRef = db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc();
    const history_id = historyRef.id;
    const campaignData  = createCampaignData(campaign_id, data, uid, time_stamp, history_id);
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
    return await batch.commit();
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


// called by brand side to submit feed back. This is a special case of updateCampaign, and is provided to
// simplify API layer.
// it requires three fields: campaign_id, historyId, and feed_back
function feedback(data, uid, campaign_id, history_id){
    console.log('input data is', data);

    // Get a new write batch
    const batch = db.batch();
    const campaignHistoryRef = db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc(history_id);
    batch.update(campaignHistoryRef, {feed_back: data.feed_back});

    const influencerCamRef = db.collection('influencers')
        .doc(uid).collection('campaigns')
        .doc(campaign_id);
    batch.update(influencerCamRef, {'campaign_data.feed_back': data.feed_back});
    return batch.commit();
}


// called when an existing campaign gets updated, this include anything that campaign data touches on.
// the data is expected to have the same schema (subset) of campaign data.
function updateCampaign(data, uid){
    if (!data.campaign_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
          'with a specific campaign_id.');
    }

    console.log('input data is', data);
    const campaign_id = data.campaign_id;
    const time_stamp = Date.now();
    data.time_stamp = time_stamp;

    // Get a new write batch
    const batch = db.batch();

    const campaignHistoryRef = db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc();
    const history_id = campaignHistoryRef.id;
    const newCamp = createCampaignData(campaign_id, data, uid, time_stamp, history_id);
    console.log('Created new campaign data:', newCamp);
    batch.set(campaignHistoryRef, newCamp);

    // get the updated campaign information, and add it to influencer's profile.
    const influencerCamRef = db.collection('influencers')
        .doc(uid).collection('campaigns')
        .doc(campaign_id);
    batch.update(influencerCamRef, {campaign_data: newCamp});
    batch.commit()
        .then(res => {
            console.log('Transaction completed.');
            return res;
        })
        .catch(err => {
            console.log('Transaction failed', err);
            throw err;
        });
    return {
        history_id,
        updated_campaign_data: newCamp,
    };
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
};
