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
        
        // Remove when done!!!
        // Remove when done!!!
        // Remove when done!!!
        console.log('current results are', markers)
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
  
        // Remove when done!!!
        // Remove when done!!!
        // Remove when done!!!
        console.log('current results are', markers)
        return markers;                 
      })
      .catch(err => {
        console.log('failed to get campaign data!', err);
        return err;
      })
    }
  });
  
function createCamapignData(campaignId, data, uid, time_stamp){
    if (!campaignId){
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
            campaign_id: campaignId,
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
            time_stamp:time_stamp
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
    const campaignId = campaignRef.id;
    console.log('creating a new campaign:', campaignRef.id, data);
    const time_stamp = Date.now()
  
    let campaignData  = createCamapignData(campaignId, data, uid, time_stamp);
    let historyRef = db.collection('campaigns').doc(campaignId).collection('campaignHistory').doc();
    db.collection('campaigns').doc(campaignId).collection('campaignHistory').add(campaignData);
    let docref =  db.collection('campaigns').doc(campaignId);
    return db.collection('influencers')
    .doc(uid).collection('campaigns')
    .doc(campaignId)
    .set({
      camapign_ref: docref.path,
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
  
  
// called when an existing campaign gets updated, this include anything that campaign data touches on.
// the data is expected to have the same schema (subset) of campaign data.
exports.updateCampaign = functions.https.onCall((data, context) => {
    // Checking that the user is authenticated.
    if (!context.auth) {
      // Throwing an HttpsError so that the client gets the error details.
      return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
          'while authenticated.');
    }
  
    if (!data.campaignId) {
      return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
          'with a specific campaignId.');
    }
  
    // Authentication / user information is automatically added to the request.
    const uid = context.auth.uid;
    console.log('input data is', data);
    const campaignId = data.campaignId;
    const time_stamp = Date.now();
  
    data.time_stamp = time_stamp;
    let newCamp = createCamapignData(campaignId, data, uid, time_stamp);
    console.log('Created new campaign data:', newCamp);
  
    // Get a new write batch
    let batch = db.batch();
  
    let campaignHistoryRef = db.collection('campaigns').doc(campaignId).collection('campaignHistory').doc();
    batch.set(campaignHistoryRef, newCamp);
  
    // get the updated campaign information, and add it to influencer's profile.
    let influencerCamRef = db.collection('influencers')
                             .doc(uid).collection('campaigns')
                             .doc(campaignId);
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
  