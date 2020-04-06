'use strict';
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const campaign = require('./campaign');
// exports.email = require('./email');
// exports.content = require('./content');

exports.createCampaign = campaign.createCampaign;
exports.getCampaign = campaign.getCampaign;
exports.updateCampaign = campaign.updateCampaign;


exports.regiserUser = functions.auth.user().onCreate(async (user) => {
  // send welcome email to users when signed up using Auth
  const email = user.email; // The email of the user.
  const uid = user.uid
  const displayName = user.displayName; // The display name of the user.

  let data  = {
        contacts: email,
        name: displayName,
        uid: uid,
        profile_picture: user.photoURL
    };

  db.collection("influencers").doc(uid)
    .set(data)
    .then(function() {
        console.log("Document successfully written!");
        return null
    })
    .catch(function(error) {
        console.log('Document creation failed', docData);
    })
});

const mkdirp = require('mkdirp-promise');
const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');

// File extension for the created JPEG files.
const JPEG_EXTENSION = '.jpg';

/**
 * When an image is uploaded in the Storage bucket it is converted to JPEG automatically using
 * ImageMagick.
 */
exports.imageToJPG = functions.storage.object().onFinalize(async (object) => {
    const filePath = object.name;
    const baseFileName = path.basename(filePath, path.extname(filePath));
    const fileDir = path.dirname(filePath);
    const JPEGFilePath = path.normalize(path.format({dir: fileDir, name: baseFileName, ext: JPEG_EXTENSION}));
    const tempLocalFile = path.join(os.tmpdir(), filePath);
    const tempLocalDir = path.dirname(tempLocalFile);
    const tempLocalJPEGFile = path.join(os.tmpdir(), JPEGFilePath);

    console.log('received object', object.name)
    // Exit if this is triggered on a file that is not an image.
    if (!object.contentType.startsWith('image/')) {
        console.log('This is not an image.', object.contentType);
        return null;
    }

    // Exit if the image is already a JPEG.
    if (object.contentType.startsWith('image/jpeg')) {
        console.log('Already a JPEG.');
        return null;
    }

    const bucket = admin.storage().bucket(object.bucket);
    // Create the temp directory where the storage file will be downloaded.
    console.log('creating dir', tempLocalDir)
    await mkdirp(tempLocalDir);
    // Download file from bucket.
    await bucket.file(filePath).download({destination: tempLocalFile});
    console.log('The file has been downloaded to', tempLocalFile);
    // Convert the image to JPEG using ImageMagick.
    await spawn('convert', [tempLocalFile, tempLocalJPEGFile]);
    console.log('JPEG image created at', tempLocalJPEGFile);
    // Uploading the JPEG image.
    await bucket.upload(tempLocalJPEGFile, {destination: JPEGFilePath});
    console.log('JPEG image uploaded to Storage at', JPEGFilePath);
    // Once the image has been converted delete the local files to free up disk space.
    fs.unlinkSync(tempLocalJPEGFile);
    fs.unlinkSync(tempLocalFile);
    return null;
});

// // Get campaign meta information when been called. 
// // When the "data" includes a campaign's id, then return one camapign's information
// // When the "data" does not include camapign's id, then return list of campaigns that current influencer are related to.
// exports.getCampaign = functions.https.onCall((data, context) => {

//   // Authentication / user information is automatically added to the request.
//   const uid = context.auth.uid;
  
//   // Checking that the user is authenticated.
//   if (!context.auth) {
//     // Throwing an HttpsError so that the client gets the error details.
//     throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
//         'while authenticated.');
//   }
//   const markers = [];
//   if(!data.campaignId){
//     console.log('No campaign id was provided, get all campaign meta data that belong to current user.')
//     return db.collection('influencers').doc(uid).collection('campaigns').get()
//     .then(querySnapshot => {
//       querySnapshot.docs.forEach(doc => {
//         let doc_snap = doc.data()
//         markers.push(doc_snap);
//       });
      
//       // Remove when done!!!
//       // Remove when done!!!
//       // Remove when done!!!
//       console.log('current results are', markers)
//       return markers;   
//     })
//     .catch(err => {
//       console.log('failed to get campaign data!', err);
//       return err;
//     })
//   }else{
//     const campaignId = data.campaignId;
//     console.log('Querying campaign', campaignId)
//     return db.collection('campaigns').doc(campaignId).collection('campaignHistory').orderBy('time_stamp', 'desc').get()
//     .then(querySnapshot => {
//       querySnapshot.docs.forEach(doc => {
//         markers.push(doc.data());
//       });

//       // Remove when done!!!
//       // Remove when done!!!
//       // Remove when done!!!
//       console.log('current results are', markers)
//       return markers;                 
//     })
//     .catch(err => {
//       console.log('failed to get campaign data!', err);
//       return err;
//     })
//   }
// });

// function createCamapignData(campaignId, data, uid, time_stamp){
//   if (!campaignId){
//     throw new functions.https.HttpsError("CampaignId must not be empty!")
//   }
//   if(!uid) {
//     throw new functions.https.HttpsError("New campaign must have a valid uid!")
//   }
//   try{
//     let campaignData  = {
//       campaign_id: campaignId,
//       brand: String(data.brand),
//       campaign_name: String(data.campaign_name),
//       commision_dollar: Number(data.commision_dollar),
//       contacts: String(data.contacts),
//       content_concept: String(data.content_concept),
//       end_time: Number(data.end_time),
//       feed_back: String(data.feed_back),
//       image: String(data.image),
//       video: String(data.video),
//       influencer_id: uid,
//       time_stamp:time_stamp
//     };
//     return campaignData
//   }
//   catch(err){
//     console.log("Error creating campaign data", err)
//     throw new functions.https.HttpsError('Failed to create campaign data');
//   }
// }

// // called when influencers decide to create a new campaign with related information. u
// exports.createCampaign = functions.https.onCall((data, context) => {
//   // Checking that the user is authenticated.
//   if (!context.auth) {
//     // Throwing an HttpsError so that the client gets the error details.
//     throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
//         'while authenticated.');
//   }

//   // Authentication / user information is automatically added to the request.
//   const uid = context.auth.uid;
//   let campaignRef = db.collection("campaigns").doc();
//   const campaignId = campaignRef.id;
//   console.log('creating a new campaign:', campaignRef.id);
//   const time_stamp = Date.now()

//   let campaignData  = createCamapignData(campaignId, data, uid, time_stamp);
//   let historyRef = db.collection('campaigns').doc(campaignId).collection('campaignHistory').doc();
//   db.collection('campaigns').doc(campaignId).collection('campaignHistory').add(campaignData);
//   let docref =  db.collection('campaigns').doc(campaignId);
//   return db.collection('influencers')
//   .doc(uid).collection('campaigns')
//   .doc(campaignId)
//   .set({
//     camapign_ref: docref.path,
//     campaign_name: String(data.campaign_name),
//     camapgn_data: campaignData
//   })
//   .then(res => {
//     console.log('the update influencer results is', res.toString())
//     return res;
//   })
//   .catch(err => {
//     console.error('updating influencer profile failed', err.toString())
//     return err;
//   });
// });


// // called when an existing campaign gets updated, this include anything that campaign data touches on.
// // the data is expected to have the same schema (subset) of campaign data.
// exports.updateCampaign = functions.https.onCall((data, context) => {
//   // Checking that the user is authenticated.
//   if (!context.auth) {
//     // Throwing an HttpsError so that the client gets the error details.
//     return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
//         'while authenticated.');
//   }

//   if (!data.campaignId) {
//     return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
//         'with a specific campaignId.');
//   }

//   // Authentication / user information is automatically added to the request.
//   const uid = context.auth.uid;
//   console.log('input data is', data);
//   const campaignId = data.campaignId;
//   const time_stamp = Date.now();

//   data.time_stamp = time_stamp;
//   let newCamp = createCamapignData(campaignId, data, uid, time_stamp);
//   console.log('Created new campaign data:', newCamp);

//   // Get a new write batch
//   let batch = db.batch();

//   let campaignHistoryRef = db.collection('campaigns').doc(campaignId).collection('campaignHistory').doc();
//   batch.set(campaignHistoryRef, newCamp);

//   // get the updated campaign information, and add it to influencer's profile.
//   let influencerCamRef = db.collection('influencers')
//                            .doc(uid).collection('campaigns')
//                            .doc(campaignId);
//   batch.update(influencerCamRef, {campaign_data: newCamp});
//   return batch.commit()
//         .then(res => {
//           console.log('Transaction completed.')
//           return res;
//         })
//         .catch(err => {
//           console.log('Transaction failed', err);
//           throw err;
//         });
// });

// exports.saveDraft = functions.https.onCall((data, context) => {


// }

// Imports the Google Cloud client library
const {PubSub} = require('@google-cloud/pubsub');
exports.genScheduledYouTubePost = functions.pubsub.topic('per-minute').onPublish((message) => {
  // This is a cloud funciton that is tirggered when the pubsub topic has new message (in this case, per-minute topic). 
  // The function grabs all the posting that are needed to post, and send the requests to pubsub ytpost topic, whose 
  // message eventually gets processed by upload_video_youtube_pubsub_gcf function (in Python)

  // Creates a client; cache this for further use
  const pubSubClient = new PubSub();
  const topicName = 'ytpost';
  let scheduledpostRef = db.collection('scheduledposts');
  var d = new Date();
  var ts = d.getTime();
  scheduledpostRef.where('posted', '==', false).where('postTime', '<=', ts).get()
  .then(snapshot => {
    if (snapshot.empty) {
      console.log("no matching posting tasks, continue")
      return 0;
    }
    snapshot.forEach(doc => {
      let data = JSON.stringify(doc.data())
      console.log('current data is', data)
      const dataBuffer = Buffer.from(data);
      const messageId = pubSubClient.topic(topicName).publish(dataBuffer);
      console.log(`Message ${data} published.`);
      // update the posted status to true.
      db.collection('scheduledposts').doc(doc.id).update({posted:true})
    })
    return 0;
  })
  .catch(err => {
    console.log('Error getting document published', err)
    return 0;
  })
});
