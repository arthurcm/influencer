const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore();

// Get campaign meta information when been called.
// When the "data" includes a campaign's id, then return one camapign's information
// When the "data" does not include camapign's id, then return list of campaigns that current influencer are related to.
exports.getCampaign = functions.https.onCall(async (data, context) => {

    // Authentication / user information is automatically added to the request.
    const uid = context.auth.uid;

    // Checking that the user is authenticated.
    if (!context.auth) {
        // Throwing an HttpsError so that the client gets the error details.
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
           'while authenticated.');
    }
    const markers = [];
    if(!data.campaign_id){
        console.log('No campaign id was provided, get all campaign meta data that belong to current user.');
        await db.collection('influencers').doc(uid).collection('campaigns').get()
            .then(querySnapshot => {
                querySnapshot.docs.forEach(doc => {
                    const doc_snap = doc.data();
                    markers.push(doc_snap);
                });
                console.log('Found', markers.length, 'results');
                return markers;
            })
            .catch(err => {
                console.log('failed to get campaign data!', err);
                return err;
            });
        const res = {campaigns: markers};
        console.log('Get campaign', res);
        return res;
    }else{
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

        await db.collection('campaigns').doc(campaign_id).get()
            .then(camSnapShot => {
                if (!camSnapShot.exists){
                    return {};
                }else{
                    const campaignData = camSnapShot.data();
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
            })
            .catch(err => {
                console.log('failed to get campaign data!', err);
                return err;
            });
        const res = {
            campaign_historys: markers,
            final_history_id,
            final_campaign,
            final_video_draft_history_id,
            final_video_draft,
        };
        return res;
    }
});

function createCamapignData(campaign_id, data, uid, time_stamp, history_id){
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
exports.createCampaign = functions.https.onCall((data, context) => {
    // Checking that the user is authenticated.
    if (!context.auth) {
        // Throwing an HttpsError so that the client gets the error details.
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
          'while authenticated.');
    }

    // Authentication / user information is automatically added to the request.
    const uid = context.auth.uid;
    const campaignRef = db.collection('campaigns').doc();
    const campaign_id = campaignRef.id;
    const time_stamp = Date.now();

    const historyRef = db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc();
    const history_id = historyRef.id;
    const campaignData  = createCamapignData(campaign_id, data, uid, time_stamp, history_id);

    // Remove when done!!!
    // Remove when done!!!
    // Remove when done!!!
    console.log('creating a new campaign:', campaignRef.id, campaignData);
    db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc(history_id).set(campaignData);
    const docref =  db.collection('campaigns').doc(campaign_id);
    return db.collection('influencers')
        .doc(uid).collection('campaigns')
        .doc(campaign_id)
        .set({
            camapign_ref: docref.path,
            campaign_id,
            campaign_name: String(data.campaign_name),
            campaign_data: campaignData,
        })
        .then(res => {
            console.log('the update influencer results is', res.toString());
            return res;
        })
        .catch(err => {
            console.error('updating influencer profile failed', err.toString());
            return err;
        });
});


exports.deleteCampaign = functions.https.onCall((data, context) => {
    // Checking that the user is authenticated.
    if (!context.auth) {
        // Throwing an HttpsError so that the client gets the error details.
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
          'while authenticated.');
    }

    if (!data.campaign_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
          'with a specific campaign_id.');
    }

    // Authentication / user information is automatically added to the request.
    const uid = context.auth.uid;
    const campaign_id = data.campaign_id;
    console.log('Deleting campaign', campaign_id, 'from influencer', uid);
    const campaignRef = db.collection('campaigns').doc(campaign_id);

    const batch = db.batch();
    batch.delete(campaignRef);
    const influencerCamRef = db.collection('influencers').doc(uid)
        .collection('campaigns').doc(campaign_id);
    batch.delete(influencerCamRef);
    return batch.commit()
        .then(res => {
            console.log('Transaction completed.');
            return res;
        })
        .catch(err => {
            console.log('Transaction failed', err);
            throw err;
        });
});


// called by brand side to submit feed back. This is a special case of updateCampaign, and is provided to
// simplify API layer.
// it requires three fields: campaign_id, historyId, and feed_back
exports.provideFeedback = functions.https.onCall((data, context) => {
    // Checking that the user is authenticated.
    if (!context.auth) {
        // Throwing an HttpsError so that the client gets the error details.
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }

    if (!data.campaign_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
          'with a specific campaign_id.');
    }

    if (!data.history_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
          'with a specific campaign_id along with a history version id.');
    }

    // Authentication / user information is automatically added to the request.
    const uid = context.auth.uid;
    console.log('input data is', data);
    const campaign_id = data.campaign_id;
    const history_id = data.history_id;

    // Get a new write batch
    const batch = db.batch();
    const campaignHistoryRef = db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc(history_id);
    batch.update(campaignHistoryRef, {feed_back: data.feed_back});

    const influencerCamRef = db.collection('influencers')
        .doc(uid).collection('campaigns')
        .doc(campaign_id);
    batch.update(influencerCamRef, {'campaign_data.feed_back': data.feed_back});
    return batch.commit()
        .then(res => {
            console.log('Transaction completed.');
            return res;
        })
        .catch(err => {
            console.log('Transaction failed', err);
            throw err;
        });
});


// called when an existing campaign gets updated, this include anything that campaign data touches on.
// the data is expected to have the same schema (subset) of campaign data.
exports.updateCampaign = functions.https.onCall((data, context) => {
    // Checking that the user is authenticated.
    if (!context.auth) {
        // Throwing an HttpsError so that the client gets the error details.
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
          'while authenticated.');
    }

    if (!data.campaign_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
          'with a specific campaign_id.');
    }

    // Authentication / user information is automatically added to the request.
    const uid = context.auth.uid;
    console.log('input data is', data);
    const campaign_id = data.campaign_id;
    const time_stamp = Date.now();
    data.time_stamp = time_stamp;

    // Get a new write batch
    const batch = db.batch();

    const campaignHistoryRef = db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc();
    const history_id = campaignHistoryRef.id;
    const newCamp = createCamapignData(campaign_id, data, uid, time_stamp, history_id);
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
});


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
    batch.set(influencerCamRef, {campaign_data: campaignData, final_history_id: history_id});
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
    batch.set(campaignRef, {final_video_draft: campaignData,
        final_video_draft_history_id: history_id}, {merge: true});
    const influencerCamRef = db.collection('influencers')
        .doc(uid).collection('campaigns')
        .doc(campaign_id);
    batch.set(influencerCamRef, {video_draft_data: campaignData, final_video_draft_history_id: history_id});
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
exports.finalizeCampaign = functions.https.onCall((data, context) => {
    // Checking that the user is authenticated.
    if (!context.auth) {
        // Throwing an HttpsError so that the client gets the error details.
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
              'while authenticated.');
    }

    if (!data.campaign_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a specific campaign_id.');
    }

    if (!data.history_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
              'with a specific campaign_id along with a history version id.');
    }

    // Authentication / user information is automatically added to the request.
    const uid = context.auth.uid;
    const campaign_id = data.campaign_id;
    const history_id = data.history_id;
    return finalizeAndWriteCampaignData(campaign_id, history_id, writeFinalCampaign_callback, uid);
});

// called when the current uploaded video is finalized or approved.
// similar to finalizeCampaign, it requires two fields: campaign_id, history_id
exports.finalizeVideoDraft = functions.https.onCall((data, context) => {
    // Checking that the user is authenticated.
    if (!context.auth) {
        // Throwing an HttpsError so that the client gets the error details.
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }

    if (!data.campaign_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
          'with a specific campaign_id.');
    }

    if (!data.history_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a specific campaign_id along with a history version id.');
    }

    // Authentication / user information is automatically added to the request.
    const uid = context.auth.uid;
    const campaign_id = data.campaign_id;
    const history_id = data.history_id;
    return finalizeAndWriteCampaignData(campaign_id, history_id, writeFinalVideoDrfat_callback, uid);
});
