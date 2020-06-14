const express = require('express');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());
require('isomorphic-fetch');

const isValidDomain = require('is-valid-domain');
const validUrl = require('valid-url');


const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://influencer-272204.firebaseio.com',
});

// middleware for token verification
app.use((req, res, next) => {

    // all /share/* endpoints require no authorization
    if (req.path.startsWith('/share')){
        return next();
    }

    // idToken comes from the client
    if (!req.headers.authorization) {
        return res.status(401).json({ error: 'No credentials sent!' });
    }
    const idToken = req.headers.authorization;
    return admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            const uid = decodedToken.uid;
            console.debug('received idToken', idToken);
            console.debug('received decoded token', decodedToken);
            // the following "additional claim" field "store_account" is set in shopify/sever.js to
            // sign up store accounts
            // /brand/* end points can only be accessed by store accounts
            // /common/* endpoints require auth, can be accessed by both store and inf
            if (req.path.startsWith('/common')){
                res.locals.uid = uid;
                next();
                return decodedToken;
            }
            else if(req.path.startsWith('/brand') && !decodedToken.store_account){
                return res.status(403).json({ error: 'Not authorized'});

                // other campaign related end points (except for /share) are not accessible to store accounts.
            }else if (!req.path.startsWith('/brand') && decodedToken.store_account){
                return res.status(403).json({ error: 'Not authorized'});
            }
            res.locals.uid = uid;
            res.locals.from_shopify = decodedToken.from_shopify;
            res.locals.store_account = decodedToken.store_account;
            next();
            return decodedToken;
        })
        .catch(error => {
            console.error(error);
            res.status(401).send({status: 'auth failure'});
            next(error);
        });
});

const campaign = require('./campaign');

app.post('/create_campaign', (req, res, next) => {
    console.debug('/create_campaign received a request', req.body);
    const data = req.body;
    const uid = res.locals.uid;
    const results = campaign.createCampaign(data, uid, campaign.GENERIC_INF_CREATED_CAMPAIGN);
    const campaign_id = results.campaign_id;
    const history_id = results.history_id;
    const batch = results.batch_promise;
    return batch.commit()
        .then(result => {
            res.status(200).send({campaign_id, history_id});
            return result;
        })
        .catch(next);
});


app.get('/get_campaign/campaign_id/:campaign_id', (req, res, next) => {
    const uid = res.locals.uid;
    const campaign_id = req.params.campaign_id;
    console.debug('Receiving campaign id', campaign_id);
    if(!campaign_id){
        res.status(400).send('Have to have a valid campaign_id');
    }
    return campaign.getCampaign(req.params, uid, res)
        .then(result => {
            const history_list = result[0];
            const finalized_campaign_data = result[1];
            res.status(200).send({
                history_list,
                finalized_campaign_data,
            });
            return result;
        })
        .catch(next);
});

app.get('/get_campaign', (req, res, next) => {
    const uid = res.locals.uid;
    return campaign.getAllCampaign(uid)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});

app.put('/complete_campaign/campaign_id/:campaign_id', (req, res, next) => {
    const uid = res.locals.uid;
    const campaign_id = req.params.campaign_id;
    return campaign.completeCampaign(campaign_id, uid)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});

// update influencer profiles with payment information.
app.post('/payment_info', (req, res, next) => {
    const uid = res.locals.uid;
    const data = req.body;
    return campaign.updateInfluencerProfile(uid, data)
        .then(results => {
            res.status(200).send({status : 'OK'});
            return results;
        })
        .catch(next);
});


app.put('/update_campaign/campaign_id/:campaign_id', (req, res, next) => {
    console.log('/update_campaign received a request', req.body);
    const data = req.body;
    const uid = res.locals.uid;
    const campaign_id = req.params.campaign_id;
    const results = campaign.updateCampaign(campaign_id, data, uid);
    const history_id = results.history_id;
    const batch = results.batch_promise;
    return batch.commit()
        .then(result => {
            res.status(200).send({campaign_id, history_id});
            return result;
        })
        .catch(next);
});

app.delete('/delete_campaign/campaign_id/:campaign_id', (req, res, next) => {
    const uid = res.locals.uid;
    console.debug('Receiving campaign id', req.params.campaign_id);
    return campaign.deleteCampaign(req.params, uid)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});

app.put('/feedback/campaign_id/:campaign_id/history_id/:history_id', (req, res, next) => {
    const campaign_id = req.params.campaign_id;
    const history_id = req.params.history_id;
    const uid = res.locals.uid;
    console.log('Receiving campaign id', campaign_id, 'and history id', history_id);
    if(!campaign_id){
        res.status(400).send('Require a valid campaign_id');
    }
    if(!history_id){
        res.status(400).send('Require a valid history_id');
    }
    if(!req.body || !req.body.feed_back){
        res.status(400).send('Require a none empty feed back');
    }
    return campaign.feedback(req.body, uid, campaign_id, history_id)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});

app.put('/share/feedback/campaign_id/:campaign_id/history_id/:history_id', (req, res, next) => {
    const campaign_id = req.params.campaign_id;
    const history_id = req.params.history_id;
    console.log('Receiving campaign id', campaign_id, 'and history id', history_id);
    if(!campaign_id){
        res.status(400).send('Require a valid campaign_id');
    }
    if(!history_id){
        res.status(400).send('Require a valid history_id');
    }
    return campaign.feedback(req.body, 'no_uid', campaign_id, history_id)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.put('/finalize_campaign/campaign_id/:campaign_id/history_id/:history_id', (req, res, next) => {
    const campaign_id = req.params.campaign_id;
    const history_id = req.params.history_id;
    const uid = res.locals.uid;
    console.log('Receiving campaign id', campaign_id, 'and history id', history_id);
    if(!campaign_id){
        res.status(400).send('Require a valid campaign_id');
    }
    if(!history_id){
        res.status(400).send('Require a valid history_id');
    }
    return campaign.finalizeCampaign(uid, campaign_id, history_id)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.put('/share/finalize_campaign/campaign_id/:campaign_id/history_id/:history_id', (req, res, next) => {
    const campaign_id = req.params.campaign_id;
    const history_id = req.params.history_id;
    console.log('Receiving campaign id', campaign_id, 'and history id', history_id);
    if(!campaign_id){
        res.status(400).send('Require a valid campaign_id');
    }
    if(!history_id){
        res.status(400).send('Require a valid history_id');
    }
    return campaign.finalizeCampaign('no_uid', campaign_id, history_id)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.put('/finalize_media_draft/campaign_id/:campaign_id/history_id/:history_id', (req, res, next) => {
    const campaign_id = req.params.campaign_id;
    const history_id = req.params.history_id;
    const uid = res.locals.uid;
    console.log('Receiving campaign id', campaign_id, 'and history id', history_id);
    if(!campaign_id){
        res.status(400).send('Require a valid campaign_id');
    }
    if(!history_id){
        res.status(400).send('Require a valid history_id');
    }
    return campaign.finalizeVideoDraft(uid, campaign_id, history_id)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.put('/share/finalize_media_draft/campaign_id/:campaign_id/history_id/:history_id', (req, res, next) => {
    const campaign_id = req.params.campaign_id;
    const history_id = req.params.history_id;
    console.log('Receiving campaign id', campaign_id, 'and history id', history_id);
    if(!campaign_id){
        res.status(400).send('Require a valid campaign_id');
    }
    if(!history_id){
        res.status(400).send('Require a valid history_id');
    }
    return campaign.finalizeVideoDraft('no_uid', campaign_id, history_id)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.post('/create_feedback_thread', (req, res, next)=>{
    console.log('/create_feedback_thread received a request', req.body);
    const data = req.body;
    const uid = res.locals.uid;
    console.log('incoming uid is ', res.locals.uid);
    const results = campaign.createFeedbackThread(data, uid);
    const thread_id = results.thread_id;
    const feedback_id = results.feedback_id;
    const batch_promise = results.batch_promise;
    const thread_path = results.thread_path;
    const feedback_path = results.feedback_path;
    return batch_promise.then(result => {
        res.status(200).send({
            thread_id,
            feedback_id,
            thread_path,
            feedback_path
        });
        return result;
    })
        .catch(next);
});


app.post('/share/create_feedback_thread', (req, res, next)=>{
    console.log('/share/create_feedback_thread received a request', req.body);
    const data = req.body;
    const uid = res.locals.uid;
    console.log('incoming uid is ', res.locals.uid);
    const results = campaign.createFeedbackThread(data, uid);
    const thread_id = results.thread_id;
    const feedback_id = results.feedback_id;
    const batch_promise = results.batch_promise;
    const thread_path = results.thread_path;
    const feedback_path = results.feedback_path;
    return batch_promise.then(result => {
        res.status(200).send({
            thread_id,
            feedback_id,
            thread_path,
            feedback_path
        });
        return result;
    })
        .catch(next);
});


app.get('/get_threads/media_object_path/:media_object_path', async (req, res, next) => {
    const uid = res.locals.uid;
    console.log('receiving', req.params.media_object_path);
    return campaign.getAllThreads(req.params, uid)
        .then(result => {
            console.log('Transaction completed.');
            return Promise.all(result).then(values => {
                res.status(200).send(values);
                return result;
            });
        })
        .catch(err => {
            res.status(500).send({status:'get get_threads failure'});
            next(err);
        });
});


app.get('/share/get_threads/media_object_path/:media_object_path', async (req, res, next) => {
    console.log('receiving', req.params.media_object_path);
    return campaign.getAllThreads(req.params, 'no_uid')
        .then(result => {
            console.log('Transaction completed.');
            return Promise.all(result).then(values => {
                res.status(200).send(values);
                return result;
            });
        })
        .catch(err => {
            res.status(500).send({status:'get get_threads failure'});
            next(err);
        });
});


app.post('/reply_feedback_thread', (req, res, next)=>{
    console.log('/reply_feedback_thread received a request', req.body);
    const data = req.body;
    const uid = res.locals.uid;
    console.log('incoming uid is ', res.locals.uid);
    return campaign.replyToFeedbackThread(data, uid)
        .then(result => {
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});

app.post('/share/reply_feedback_thread', (req, res, next)=>{
    console.log('/reply_feedback_thread received a request', req.body);
    const data = req.body;
    return campaign.replyToFeedbackThread(data, 'no_uid')
        .then(result => {
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});

app.delete('/delete_thread/media_object_path/:media_object_path/thread_id/:thread_id', (req, res, next) => {
    const uid = res.locals.uid;
    console.log('Receiving thread_id', req.params.thread_id);
    return campaign.deleteThread(req.params, uid)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.delete('/share/delete_thread/media_object_path/:media_object_path/thread_id/:thread_id', (req, res, next) => {
    console.log('Receiving thread_id', req.params.thread_id);
    return campaign.deleteThread(req.params, 'no_uid')
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.put('/resolve_thread/media_object_path/:media_object_path/thread_id/:thread_id', (req, res, next) => {
    const media_object_path = req.params.media_object_path;
    const thread_id = req.params.thread_id;
    const uid = res.locals.uid;
    console.log('Receiving media_object_path', media_object_path, 'and thread_id', thread_id);
    if(!thread_id){
        res.status(400).send('Require a valid thread_id');
    }
    if(!media_object_path){
        res.status(400).send('Require a valid media_object_path');
    }
    return campaign.resolveThread(media_object_path, thread_id)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.put('/share/resolve_thread/media_object_path/:media_object_path/thread_id/:thread_id', (req, res, next) => {
    const media_object_path = req.params.media_object_path;
    const thread_id = req.params.thread_id;
    const uid = res.locals.uid;
    console.log('Receiving media_object_path', media_object_path, 'and thread_id', thread_id);
    if(!thread_id){
        res.status(400).send('Require a valid thread_id');
    }
    if(!media_object_path){
        res.status(400).send('Require a valid media_object_path');
    }
    return campaign.resolveThread(media_object_path, thread_id)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.get('/list_brand_campaigns_inf', (req, res, next) => {
    const uid = res.locals.uid;
    const idToken = req.headers.authorization;
    return campaign.listBrandCampaignsInf(uid, idToken, next)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(error => {
            res.status(500).send({status:'get campaign failure'});
            next(error);
        });
});


// Main entry point for influencers to sign up to brand initiated campaigns.
app.put('/sign_up_campaign/brand_campaign_id/:brand_campaign_id', (req, res, next)=>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const uid = res.locals.uid;
    const idToken = req.headers.authorization;
    console.log('Receiving brand_campaign_id', brand_campaign_id, 'and uid', uid);
    if(!brand_campaign_id){
        res.status(422).send({status: 'Require a valid brand_campaign_id'});
    }
    return campaign.signupToBrandCampaign(brand_campaign_id, uid, idToken, next)
        .then(async (result) => {
            if (!result || Object.keys(result).length === 0){
                res.status(201).send({status: 'already signed up'});
                return {};
            }else {
                const campaign_id = result.campaign_id;
                const history_id = result.history_id;
                const batch = result.batch_promise;
                const campaign_data = result.campaign_data;
                campaign_data.campaign_id = campaign_id;
                batch.commit();
                return {campaign_id, history_id};
            }
        })
        .then(result=>{
            if(result && Object.keys(result).length > 0){
                res.status(200).send(result);
            }
            return result;
        })
        .catch(error => {
            if (!res.headersSent) {
                res.status(500).send({status:'sign up failure'});
            }
            next(error);
        });
});


app.post('/brand/campaign', (req, res, next) => {
    console.log('/create_brand_campaign received a request', req.body);
    const data = req.body;
    const uid = res.locals.uid;
    console.log('incoming uid is ', res.locals.uid);
    const from_shopify = res.locals.from_shopify;
    console.log('incoming uid is ', res.locals.uid);
    if (from_shopify){
        data.website = uid;
    }
    if (!isValidDomain(data.website) && !validUrl.isUri(data.website)){
        res.status(422).send({status: 'Illegal website format'});
    }
    const results = campaign.createBrandCampaign(data, uid);
    const campaign_id = results.campaign_id;
    const batch = results.batch_promise;
    return batch.commit()
        .then(result => {
            res.status(200).send({campaign_id});
            return result;
        })
        .catch(next);
});


app.get('/brand/campaign', (req, res, next) => {
    const uid = res.locals.uid;
    return campaign.listBrandCampaignForBrand(uid)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});


app.delete('/brand/campaign/brand_campaign_id/:brand_campaign_id', (req, res, next) => {
    const uid = res.locals.uid;
    console.log('Receiving campaign id', req.params.brand_campaign_id);
    return campaign.deleteBrandCampaign(req.params, uid)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.put('/brand/end_campaign/brand_campaign_id/:brand_campaign_id', (req, res, next) => {
    const uid = res.locals.uid;
    console.log('Receiving campaign id', req.params.brand_campaign_id);
    return campaign.endBrandCampaign(req.params, uid)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


// Note: This API did not enforce extra access control which is used in  /common/influencer_profile/uid/:uid'
// this is due to the following assumptions:
// 1. Influencers will not likely obtain not "entitled" campaign ids
// 2. future versions will very likely loosen or create "tiers" of entitlement access to allow influencers view campaigns
// The tiers may include: a. brand/TAM nominated; b. lifo algorithm matched; c. broader interest campaigns, where brand
// decides to not enforce access limits on the campaign so that more influencer are able to participate.
app.get('/common/campaign/brand_campaign_id/:brand_campaign_id', (req, res, next) => {
    const brand_campaign_id = req.params.brand_campaign_id;
    return campaign.getBrandCampaignForBrand(brand_campaign_id)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});


// get influencer profiles with payment information.
// Note: this API is enforced with access control.
// For example: brand can view influencer profiles freely (identified by "store_account" flag)
// but influencer can NOT view other influencer's profile.
app.get('/common/influencer_profile/uid/:uid', (req, res, next) => {
    const uid = res.locals.uid;
    const store_account = res.locals.store_account;
    const requested_uid = req.params.uid;
    if(!store_account && uid !== requested_uid){
        console.error('Unauthorized access to influencer profile', requested_uid, ' by another influencer', uid);
        return res.status(403).json({ error: 'Not authorized'});
    }
    return campaign.getInfluencerProfile(requested_uid)
        .then(results => {
            res.status(200).send(results.data());
            return results;
        })
        .catch(next);
});


app.use((err, req, res, next) => {
    console.error(err.stack);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).send({ error: err });
    return res;
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log('Nodejs API server listening on port', port);
});

