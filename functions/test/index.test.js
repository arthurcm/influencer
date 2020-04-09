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
        milestones:["1", "2"],
        video: ''
    }, 'campaigns_test/');

// Invoke the function, and specify auth and auth Type (for real time database functions only)
create_campaign_wrapped(
{
       "brand":"awesome",
       "campaign_name":"my campaign",
       "commision_dollar":"1222",
       "contacts":"shuo@influencer.com",
       "content_concept":"final fantasy",
       "end_time":"12312321321",
       "feed_back":"great",
       "milestones":["test", "test"],
       "image":"",
       "video":""
}, {
    auth: {
      uid: '123',
      'token': '12312312'
    }
  });
  
const snap_get = test.firestore.makeDocumentSnapshot({'campaign_id':""});

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
        "campaign_id":"sCUqflxSY8dnAJBmb8pk",
        "brand": "crapy"
    }
   );

console.log('Testing updateCampaign')
const update_campaign_wrapped = test.wrap(myfunctions.updateCampaign);
update_campaign_wrapped( 
    {
        "campaign_id":"fYOafsUZXjHYNqOJKdSG",
        "brand": "crapy"
    }, {
    auth: {
      uid: 'HK0fpmQI7WOGUDwdmVpPffis7hY2'
    }
});

console.log('Testing provideFeedback')
const feedback_campaign_wrapped = test.wrap(myfunctions.provideFeedback);
feedback_campaign_wrapped( 
    {
        "campaign_id":"fYOafsUZXjHYNqOJKdSG",
        "history_id": "KEZf5E2jYQnohWlCUpmO",
        "feed_back": {
            1: "change this",
            2: "do that"
        }
    }, {
    auth: {
      uid: 'HK0fpmQI7WOGUDwdmVpPffis7hY2'
    }
});

console.log('Testing finalizeCampaign')
const finalize_campaign_wrapped = test.wrap(myfunctions.finalizeCampaign);
finalize_campaign_wrapped( 
    {
        "campaign_id":"dzXZ7bZe7Km55R7Aoqzf",
        "history_id": "qxLkbGSsY6jsKJeX6O1A"
    }, {
    auth: {
      uid: '123'
    }
});

console.log('Testing finalizeVideoDraft')
const finalize_video_draft_wrapped = test.wrap(myfunctions.finalizeVideoDraft);
finalize_video_draft_wrapped( 
    {
        "campaign_id":"dzXZ7bZe7Km55R7Aoqzf",
        "history_id": "qxLkbGSsY6jsKJeX6O1A"
    }, {
    auth: {
      uid: '123'
    }
});
test.cleanup();