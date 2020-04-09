'use strict';
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const campaign = require('./campaign');
const email = require('./email');
// exports.content = require('./content');

exports.createCampaign = campaign.createCampaign;
exports.getCampaign = campaign.getCampaign;
exports.updateCampaign = campaign.updateCampaign;
exports.provideFeedback = campaign.provideFeedback;
exports.finalizeCampaign = campaign.finalizeCampaign;
exports.finalizeVideoDraft = campaign.finalizeVideoDraft;

exports.sendWelcomeEmail = email.sendWelcomeEmail;


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
