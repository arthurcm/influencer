'use strict';
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const campaign = require('./campaign');
const content = require('./content');

exports.createCampaign = campaign.createCampaign;
exports.deleteCampaign = campaign.deleteCampaign;
exports.getCampaign = campaign.getCampaign;
exports.updateCampaign = campaign.updateCampaign;
exports.provideFeedback = campaign.provideFeedback;
exports.finalizeCampaign = campaign.finalizeCampaign;
exports.finalizeVideoDraft = campaign.finalizeVideoDraft;


// On sign up.
exports.processSignUp = functions.auth.user().onCreate(async (user) => {
    // Check if user meets role criteria.
    // TODO: Add email verification for better security!!!
    let account_manager = false;
    if (user.email &&
        user.email.endsWith('@lifo.ai')) {
        account_manager = true;
        const customClaims = {
            account_manager,
            access_level: 9
        };
        console.log(`Updating custom claims to ${user.email}`, customClaims);
        // Set custom user claims on this newly created user.
        await admin.auth().setCustomUserClaims(user.uid, customClaims)
            .then(() => {
                // Update real-time database to notify client to force refresh.
                const metadataRef = admin.database().ref('metadata/' + user.uid);
                // Set the refresh time to the current UTC timestamp.
                // This will be captured on the client to force a token refresh.
                return metadataRef.set({refreshTime: new Date().getTime()});
            })
            .catch(error => {
                console.log(error);
            });
    }

    const email = user.email; // The email of the user.
    const uid = user.uid;
    const displayName = user.displayName; // The display name of the user.
    const from_shopify = user.customClaims.from_shopify || false;
    const store_account = user.customClaims.store_account || false;
    const data  = {
        contacts: email,
        name: displayName,
        uid,
        profile_picture: user.photoURL,
        from_shopify,
        store_account,
        account_manager,
    };
    console.log('Receiving data for signing up', data);
    return db.collection('influencers').doc(uid)
        .set(data)
        .then(() => {
            console.log('Document successfully written!');
            return null;
        })
        .catch((error) => {
            console.log('Document creation failed', docData);
        });
});


// Imports the Google Cloud client library
const {PubSub} = require('@google-cloud/pubsub');
exports.genScheduledYouTubePost = functions.pubsub.topic('per-minute').onPublish((message) => {
    // This is a cloud function that is tirggered when the pubsub topic has new message (in this case, per-minute topic).
    // The function grabs all the posting that are needed to post, and send the requests to pubsub ytpost topic, whose
    // message eventually gets processed by upload_video_youtube_pubsub_gcf function (in Python)

    // Creates a client; cache this for further use
    const pubSubClient = new PubSub();
    const topicName = 'ytpost';
    const scheduledpostRef = db.collection('scheduledposts');
    const d = new Date();
    const ts = d.getTime();
    scheduledpostRef.where('posted', '==', false).where('postTime', '<=', ts).get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log('no matching posting tasks, continue');
                return 0;
            }
            snapshot.forEach(doc => {
                const data = JSON.stringify(doc.data());
                console.log('current data is', data);
                const dataBuffer = Buffer.from(data);
                const messageId = pubSubClient.topic(topicName).publish(dataBuffer);
                console.log(`Message ${data} published.`);
                // update the posted status to true.
                db.collection('scheduledposts').doc(doc.id).update({posted:true});
            });
            return 0;
        })
        .catch(err => {
            console.log('Error getting document published', err);
            return 0;
        });
});
