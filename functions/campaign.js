const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore();

// Get campaign meta information when been called. 
// When the "data" includes a campaign's id, then return one camapign's information
// When the "data" does not include camapign's id, then return list of campaigns that current influencer are related to.
exports.getCampaign = functions.https.onCall((data, context) => {

    // Authentication / user information is automatically added to the request.
    const uid = context.auth.uid;
    
    // Checking that the user is authenticated.
    if (!context.auth) {
      // Throwing an HttpsError so that the client gets the error details.
      throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
          'while authenticated.');
    }
    const markers = [];
    if(!data.campaignId){
      console.log('No campaign id was provided, get all campaign meta data that belong to current user.')
      return db.collection('influencers').doc(uid).collection('campaigns').get()
      .then(querySnapshot => {
        querySnapshot.docs.forEach(doc => {
          let doc_snap = doc.data()
          markers.push(doc_snap);
        });
        console.log('Found', markers.length, 'results');
        return markers;   
      })
      .catch(err => {
        console.log('failed to get campaign data!', err);
        return err;
      })
    }else{
      const campaignId = data.campaignId;
      console.log('Querying campaign', campaignId)
      return db.collection('campaigns').doc(campaignId).collection('campaignHistory').orderBy('time_stamp', 'desc').get()
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
      })
    }
  });
  
function createCamapignData(campaign_id, data, uid, time_stamp, history_id){
    if (!campaign_id){
      throw new functions.https.HttpsError("CampaignId must not be empty!")
    }
    if(!uid) {
      throw new functions.https.HttpsError("New campaign must have a valid uid!")
    }

    try{
        var milestones = [];
        if(data.milestones){
            data.milestones.forEach(function(item){
                milestones.push(item);
            })
        }else{
            console.log('incoming milestone needs to be an array.');
        }
        let campaignData  = {
            campaign_id: campaign_id,
            brand: String(data.brand),
            campaign_name: String(data.campaign_name),
            commision_dollar: Number(data.commision_dollar),
            contacts: String(data.contacts),
            content_concept: String(data.content_concept),
            end_time: Number(data.end_time),
            feed_back: String(data.feed_back),
            image: String(data.image),
            video: String(data.video),
            milestones: milestones,
            influencer_id: uid,
            time_stamp: time_stamp,
            history_id: String(history_id)
        };
        return campaignData
    }
    catch(err){
      console.log("Error creating campaign data", err)
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
    let campaignRef = db.collection("campaigns").doc();
    const campaign_id = campaignRef.id;
    const time_stamp = Date.now()
  
    let historyRef = db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc();
    const history_id = historyRef.id;
    let campaignData  = createCamapignData(campaign_id, data, uid, time_stamp, history_id);
    
    // Remove when done!!!
    // Remove when done!!!
    // Remove when done!!!
    console.log('creating a new campaign:', campaignRef.id, campaignData);
    db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc(history_id).set(campaignData);
    let docref =  db.collection('campaigns').doc(campaign_id);
    return db.collection('influencers')
            .doc(uid).collection('campaigns')
            .doc(campaign_id)
            .set({
              camapign_ref: docref.path,
              campaign_id: campaign_id,
              campaign_name: String(data.campaign_name),
              camapgn_data: campaignData
            })
            .then(res => {
              console.log('the update influencer results is', res.toString())
              return res;
            })
            .catch(err => {
              console.error('updating influencer profile failed', err.toString())
              return err;
            });
});


// called by brand side to submit feed back. This is a special case of updateCampaign, and is provided to 
// simplify API layer.
// it requires three fields: campaignId, historyId, and feed_back
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
    let batch = db.batch();
    let campaignHistoryRef = db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc(history_id)
    batch.update(campaignHistoryRef, {feed_back: data.feed_back});
    
    let influencerCamRef = db.collection('influencers')
                            .doc(uid).collection('campaigns')
                            .doc(campaign_id);
    batch.update(influencerCamRef, {"campaign_data.feed_back": data.feed_back});
    return batch.commit()
                .then(res => {
                  console.log('Transaction completed.')
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
          'with a specific campaignId.');
    }
  
    // Authentication / user information is automatically added to the request.
    const uid = context.auth.uid;
    console.log('input data is', data);
    const campaign_id = data.campaign_id;
    const time_stamp = Date.now();
    data.time_stamp = time_stamp;
  
    // Get a new write batch
    let batch = db.batch();
  
    let campaignHistoryRef = db.collection('campaigns').doc(campaign_id).collection('campaignHistory').doc();
    const history_id = campaignHistoryRef.id;
    let newCamp = createCamapignData(campaign_id, data, uid, time_stamp, history_id);
    console.log('Created new campaign data:', newCamp);
    batch.set(campaignHistoryRef, newCamp);
  
    // get the updated campaign information, and add it to influencer's profile.
    let influencerCamRef = db.collection('influencers')
                             .doc(uid).collection('campaigns')
                             .doc(campaign_id);
    batch.update(influencerCamRef, {campaign_data: newCamp});
    return batch.commit()
          .then(res => {
            console.log('Transaction completed.')
            return res;
          })
          .catch(err => {
            console.log('Transaction failed', err);
            throw err;
          });
  });
  