const test = require('firebase-functions-test')({
    databaseURL: 'https://influencer-272204.firebaseio.com',
    storageBucket: 'influencer-272204.appspot.com',
    projectId: 'influencer-272204',
}, '/Users/acm/code/influencer/functions/test/influencer-272204-19bf514dff6c.json');

// Mock functions config values
test.mockConfig({ stripe: { key: '23wr42ewr34' }});

const functions = require('firebase-functions');
const key = functions.config().stripe.key;

// after firebase-functions-test has been initialized
const myfunctions = require('../index.js'); // relative path to functions code

const create_campaign_wrapped = test.wrap(myfunctions.createCampaign);
const snap = test.firestore.makeDocumentSnapshot(
    {
        brand: 'awesome',
        campaign_name: "my campaign",
        commision_dollar: 1222,
        contacts: 'shuo@influencer.com',
        content_concept: 'final fantasy',
        end_time: 12312321321,
        feed_back: "great",
        image: '',
        video: ''
    }, 'campaigns_test/');

// Invoke the function, and specify auth and auth Type (for real time database functions only)
create_campaign_wrapped(snap, {
    auth: {
      uid: '123',
      'token': '12312312'
    }
  });
  
const snap_get = test.firestore.makeDocumentSnapshot({'campaignId':""});

const get_campaign_wrapped = test.wrap(myfunctions.getCampaign);
get_campaign_wrapped(snap_get, {
    auth: {
      uid: '123',
      'token': '12312312'
    }
  });
get_campaign_wrapped({'campaignId':"95BFQrxAAap5pREDapsc"}, 
    {
        auth: {
            uid: '123',
            'token': '12312312'
        }
    });

const snap_update = test.firestore.makeDocumentSnapshot(
    {
        "campaignId":"sCUqflxSY8dnAJBmb8pk",
        "brand": "crapy"
    }
   );

const update_campaign_wrapped = test.wrap(myfunctions.updateCampaign);
update_campaign_wrapped( 
    {
        "campaignId":"5Lx527Kl3fEO7vr7WXnd",
        "brand": "crapy"
    }, {
    auth: {
      uid: '123'
    }
});
test.cleanup();