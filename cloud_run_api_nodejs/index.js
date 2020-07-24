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

const campaign = require('./campaign');
const contract_sign = require('./contract_sign');


// middleware for token verification
app.use((req, res, next) => {

    // // all /share/* endpoints require no authorization
    // if (req.path.startsWith('/share')){
    //     return next();
    // }

    // idToken comes from the client
    if (!req.headers.authorization) {
        console.warn(`request to ${req.path} did not provide authorization header`);
        return res.status(401).json({ error: 'No credentials sent!' });
    }
    const idToken = req.headers.authorization;
    return admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            const uid = decodedToken.uid;
            console.info('received decoded token', decodedToken);
            // the following "additional claim" field "store_account" is set in shopify/sever.js to
            // sign up store accounts
            // /brand/* end points can only be accessed by store accounts
            // /common/* endpoints require auth, can be accessed by both store and inf
            // /am/* endpoints require account manager accounts, and can ONLY be accessed by account managers.
            if (req.path.startsWith('/am/') && !decodedToken.account_manager){
                console.warn(`request to ${req.path} was rejected`);
                return res.status(403).json({ error: 'Not authorized'});
            }
            else if (req.path.startsWith('/common') || req.path.startsWith('/share')){
                console.info('Received /common or /share endpoint request');
            }
            else if(req.path.startsWith('/brand') && !decodedToken.store_account && !decodedToken.account_manager){
                console.warn(`request to ${req.path} was rejected`);
                return res.status(403).json({ error: 'Not authorized'});

                // other campaign related end points (except for /share) are not accessible to store accounts.
            }else if (!req.path.startsWith('/brand') && decodedToken.store_account){
                console.warn(`request to ${req.path} was rejected`);
                return res.status(403).json({ error: 'Not authorized'});
            }
            res.locals.uid = uid;
            res.locals.from_shopify = decodedToken.from_shopify;
            res.locals.store_account = decodedToken.store_account;
            res.locals.account_manager = decodedToken.account_manager;
            res.locals.name = decodedToken.name;
            res.locals.email = decodedToken.email;
            next();
            return decodedToken;
        })
        .catch(error => {
            console.error(error);
            res.status(401).send({status: 'auth failure'});
            next(error);
        });
});


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
    console.debug('Receiving campaign id for get_campaign', campaign_id);
    if(!campaign_id){
        console.warn(`request to ${req.path} did not provide campaign_id`);
        res.status(422).send('Have to have a valid campaign_id');
    }
    return campaign.getCampaign(req.params, uid, res)
        .then(result => {
            console.debug('get campaign results', result);
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

app.get('/common/campaign/campaign_id/:campaign_id', (req, res, next) => {
    const uid = res.locals.uid;
    const campaign_id = req.params.campaign_id;
    console.debug('Receiving campaign id for /common/campaign/', campaign_id);
    if(!campaign_id){
        console.warn(`request to ${req.path} did not provide campaign_id`);
        res.status(422).send('Have to have a valid campaign_id');
    }
    return campaign.getCampaignHistories(campaign_id)
        .then(history_list => {
            console.debug('get campaign histories', history_list);
            res.status(200).send({
                history_list,
            });
            return history_list;
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

app.get('/media/campaign_type/:campaign_type/campaign_id/:campaign_id', (req, res, next) => {
    // const uid = res.locals.uid;
    const campaign_id = req.params.campaign_id;
    const campaign_type = req.params.campaign_type;
    if(!campaign_type || !campaign_id || (campaign_type !== 'video' && campaign_type !== 'image')){
        console.warn(`request to ${req.path} did not provide campaign_id or campaign_type`);
        res.status(422).send('Have to have a valid campaign_id and campaign_type');
    }
    return campaign.getAllMedia(campaign_id, campaign_type)
        .then(results => {
            res.status(200).send(results);
            return results;
        })
        .catch(next);
});

app.get('/common/media/campaign_type/:campaign_type/campaign_id/:campaign_id', (req, res, next) => {
    // const uid = res.locals.uid;
    const campaign_id = req.params.campaign_id;
    const campaign_type = req.params.campaign_type;
    if(!campaign_type || !campaign_id || (campaign_type !== 'video' && campaign_type !== 'image')){
        console.warn(`request to ${req.path} did not provide inf_id or campaign_id or campaign_type`);
        res.status(422).send('Have to have a valid inf_id or campaign_id and campaign_type');
    }
    return campaign.getAllMedia(campaign_id, campaign_type)
        .then(results => {
            res.status(200).send(results);
            return results;
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
    console.debug('/update_campaign received a request', req.body);
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
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});

app.put('/feedback/campaign_id/:campaign_id/history_id/:history_id', (req, res, next) => {
    const campaign_id = req.params.campaign_id;
    const history_id = req.params.history_id;
    const uid = res.locals.uid;
    console.debug(`${req.path} received  ${campaign_id} and ${history_id}`);
    if(!campaign_id){
        console.warn(`request to ${req.path} did not provide campaign_id`);
        res.status(422).send('Require a valid campaign_id');
    }
    if(!history_id){
        console.warn(`request to ${req.path} did not provide history_id`);
        res.status(422).send('Require a valid history_id');
    }
    if(!req.body || !req.body.feed_back){
        console.warn(`request to ${req.path} did not provide none empty feedback`);
        res.status(422).send('Require a none empty feedback');
    }
    if (res.headersSent){
        return next();
    }
    return campaign.feedback(req.body, uid, campaign_id, history_id)
        .then(result => {
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});

app.put('/share/feedback/campaign_id/:campaign_id/history_id/:history_id', (req, res, next) => {
    const campaign_id = req.params.campaign_id;
    const history_id = req.params.history_id;
    console.debug(`${req.path} received  ${campaign_id} and ${history_id}`);
    if(!campaign_id){
        console.warn(`request to ${req.path} did not provide campaign_id`);
        res.status(422).send('Require a valid campaign_id');
    }
    if(!history_id){
        console.warn(`request to ${req.path} did not provide history_id`);
        res.status(422).send('Require a valid history_id');
    }
    if (res.headersSent){
        return next();
    }
    return campaign.feedback(req.body, 'no_uid', campaign_id, history_id)
        .then(result => {
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.put('/share/finalize_campaign/campaign_id/:campaign_id/history_id/:history_id', (req, res, next) => {
    const campaign_id = req.params.campaign_id;
    const history_id = req.params.history_id;
    console.debug(`${req.path} received  ${campaign_id} and ${history_id}`);
    if(!campaign_id){
        res.status(422).send('Require a valid campaign_id');
    }
    if(!history_id){
        res.status(422).send('Require a valid history_id');
    }
    if (res.headersSent){
        return next();
    }
    return campaign.finalizeCampaign('no_uid', campaign_id, history_id)
        .then(result => {
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.post('/create_feedback_thread', (req, res, next)=>{
    console.debug(`${req.path} received  ${req.body}`);
    const data = req.body;
    const uid = res.locals.uid;
    let name = res.locals.name;
    if(!name){
        name = 'Anonymous';
    }
    const results = campaign.createFeedbackThread(data, uid, name);
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
            feedback_path,
        });
        return result;
    })
        .catch(next);
});


app.post('/share/create_feedback_thread', (req, res, next)=>{
    console.debug(`${req.path} received  ${req.body}`);
    const data = req.body;
    const uid = res.locals.uid;
    let name = res.locals.name;
    if(!name){
        name = 'Anonymous';
    }
    const results = campaign.createFeedbackThread(data, uid, name);
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
            feedback_path,
        });
        return result;
    }).catch(next);
});

app.get('/get_threads/media_object_path/:media_object_path', async (req, res, next) => {
    const uid = res.locals.uid;
    console.debug(`${req.path} received  ${req.params.media_object_path}`);
    return campaign.getAllThreads(req.params, uid)
        .then(result => {
            return Promise.all(result).then(values => {
                res.status(200).send(values);
                return result;
            });
        })
        .catch(err => {
            res.status(500).send({status:'get_threads failure'});
            next(err);
        });
});


app.get('/share/get_threads/media_object_path/:media_object_path', async (req, res, next) => {
    console.debug(`${req.path} received  ${req.params.media_object_path}`);
    return campaign.getAllThreads(req.params, 'no_uid')
        .then(result => {
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
    console.debug(`${req.path} received  ${req.body}`);
    const data = req.body;
    const uid = res.locals.uid;
    let name = res.locals.name;
    if(!name){
        name = 'Anonymous';
    }
    return campaign.replyToFeedbackThread(data, uid, name)
        .then(result => {
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.post('/share/reply_feedback_thread', (req, res, next)=>{
    console.debug(`${req.path} received  ${req.body}`);
    const data = req.body;
    const uid = res.locals.uid;
    let name = res.locals.name;
    if(!name){
        name = 'Anonymous';
    }
    return campaign.replyToFeedbackThread(data, uid, name)
        .then(result => {
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});

app.put('/like_feedback', (req, res, next)=>{
    console.debug(`${req.path} received  ${req.body}`);
    const data = req.body;
    let uid = res.locals.uid;
    let name = res.locals.name;
    if(!name){
        name = 'Anonymous';
    }
    if (!uid){
        uid = 'no_uid';
    }
    const like_id = `${name}/${uid}`
    return campaign.likeFeedback(data, like_id)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});

app.delete('/delete_thread/media_object_path/:media_object_path/thread_id/:thread_id', (req, res, next) => {
    const uid = res.locals.uid;
    console.debug(`${req.path} received  ${req.params.media_object_path} and ${req.params.thread_id}`);
    return campaign.deleteThread(req.params, uid)
        .then(result => {
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.delete('/share/delete_thread/media_object_path/:media_object_path/thread_id/:thread_id', (req, res, next) => {
    console.debug(`${req.path} received  ${req.params.media_object_path} and ${req.params.thread_id}`);
    return campaign.deleteThread(req.params, 'no_uid')
        .then(result => {
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.put('/resolve_thread/media_object_path/:media_object_path/thread_id/:thread_id', (req, res, next) => {
    const media_object_path = req.params.media_object_path;
    const thread_id = req.params.thread_id;
    const uid = res.locals.uid;
    console.debug(`${req.path} received  ${req.params.media_object_path} and ${req.params.thread_id}`);
    if(!thread_id){
        console.warn(`${req.path} invalid thread_id received for uid ${uid}`);
        res.status(422).send('Require a valid thread_id');
    }
    if(!media_object_path){
        console.warn(`${req.path} invalid media_object_path received for uid ${uid}`);
        res.status(422).send('Require a valid media_object_path');
    }
    return campaign.resolveThread(media_object_path, thread_id)
        .then(result => {
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.put('/share/resolve_thread/media_object_path/:media_object_path/thread_id/:thread_id', (req, res, next) => {
    const media_object_path = req.params.media_object_path;
    const thread_id = req.params.thread_id;
    const uid = res.locals.uid;
    console.debug(`${req.path} received  ${req.params.media_object_path} and ${req.params.thread_id}`);
    if(!thread_id){
        console.warn(`${req.path} invalid thread_id received for uid ${uid}`);
        res.status(422).send('Require a valid thread_id');
    }
    if(!media_object_path){
        console.warn(`${req.path} invalid media_object_path received for uid ${uid}`);
        res.status(422).send('Require a valid media_object_path');
    }
    return campaign.resolveThread(media_object_path, thread_id)
        .then(result => {
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
    console.debug(`${req.path} received brand_campaign_id ${brand_campaign_id} and uid ${req.params.thread_id}`);
    if(!brand_campaign_id){
        console.warn(`${req.path} invalid brand_campaign_id received for uid ${uid}`);
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
                res.status(500).send({status: 'sign up failure'});
            }
            next(error);
        });
});


app.post('/brand/campaign', (req, res, next) => {
    console.debug(`${req.path} received  ${req.body}`);
    const data = req.body;
    const uid = res.locals.uid;
    const from_shopify = res.locals.from_shopify;
    if (from_shopify){
        data.website = uid;
    }
    if (!isValidDomain(data.website) && !validUrl.isUri(data.website)){
        console.warn(`${req.path} Illegal website format received ${data.website} for Shopify? ${from_shopify}, with request ${data}`);
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


app.get('/brand/influencers', (req, res, next) => {
    const uid = res.locals.uid;
    return campaign.totalInfCount(uid)
        .then(inf_ids => {
            console.debug(`Found collaborating influencers ${inf_ids}`);
            res.status(200).send({
                influencer_ids : inf_ids,
                influencer_counts : inf_ids.length,
            });
            return inf_ids;
        })
        .catch(next);
});


app.delete('/brand/campaign/brand_campaign_id/:brand_campaign_id', (req, res, next) => {
    const uid = res.locals.uid;
    console.debug('/brand/campaign received campaign id', req.params.brand_campaign_id);
    return campaign.deleteBrandCampaign(req.params, uid)
        .then(result => {
            res.status(200).send({status : 'OK'});
            return result;
        })
        .catch(next);
});


app.put('/brand/end_campaign/brand_campaign_id/:brand_campaign_id', (req, res, next) => {
    const uid = res.locals.uid;
    console.debug('/brand/end_campaign received campaign id', req.params.brand_campaign_id);
    return campaign.endBrandCampaign(req.params, uid)
        .then(result => {
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
            console.debug('get brand campaign results', result);
            const brand_campaigns = result[0];
            const discovered_infs = result[1];
            res.status(200).send({
                brand_campaigns,
                discovered_infs,
            });
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
            console.debug('getting profile', results.data())
            res.status(200).send(results.data());
            return results;
        })
        .catch(next);
});


// This is to create signature resquest, which returns signature related information.
app.post('/signature_request/create_embedded_with_template', (req, res, next) => {
    console.debug('/signature_request/create_embedded_with_template received a request', req.body);
    const data = req.body;
    const uid = res.locals.uid;
    return contract_sign.signatureRequest(data)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});


// // Currently the json body only requires a valid brand_campaign_id
// // Note: don't use this one for now. (July 7th, 2020)
// app.post('/unclaimed_draft/create_embedded_with_template', (req, res, next) => {
//     console.debug('/unclaimed_draft/create_embedded_with_template received a request', req.body);
//     const data = req.body;
//     const uid = res.locals.uid;
//     return contract_sign.previewRequest(data)
//         .then(result => {
//             res.status(200).send(result);
//             return result;
//         })
//         .catch(next);
// });


// return the respective sign_url based on the current user
app.get('/embedded/sign_url/brand_campaign_id/:brand_campaign_id', (req, res, next)=>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const email = res.locals.email;
    console.debug(`/embedded/sign_url/brand_campaign_id received a brand_campaign_id ${brand_campaign_id}`);
    return contract_sign.getEmbeddedSignUrl(email, brand_campaign_id, null)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});

// return the respective sign_url based on the current user
app.get('/brand/embedded/sign_url/brand_campaign_id/:brand_campaign_id/inf_email/:inf_email', async (req, res, next)=>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const inf_email = req.params.inf_email;
    let email = res.locals.email;
    if(!email){
        await campaign.getBrandCampaignForBrand(brand_campaign_id)
            .then(res => {
                const brand_campaign_data = res[0];
                email  = brand_campaign_data.contact_email;
            })
            .catch(next);
    }
    console.debug(`/embedded/sign_url/ received a brand_campaign_id ${brand_campaign_id} with inf_email ${inf_email}`);
    return contract_sign.getEmbeddedSignUrl(email, brand_campaign_id, inf_email)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});

app.get('/brand/contracts/brand_campaign_id/:brand_campaign_id', (req, res, next)=>{
    const brand_campaign_id = req.params.brand_campaign_id;
    console.debug(`/brand/contracts/brand_campaign_id/:brand_campaign_id received brand_campaign_id ${brand_campaign_id}`);
    return contract_sign.getAllContractsBrand(brand_campaign_id)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});

app.post('/am/recommend_influencers/brand_campaign_id/:brand_campaign_id', (req, res, next) =>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const data = req.body;
    console.debug(`/am/recommend_influencers received brand_campaign_id ${brand_campaign_id} with json body ${data}`);
    return campaign.add_recommended_influencers(brand_campaign_id, data)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});


app.get('/signature_request/files/signature_request_id/:signature_request_id', (req, res, next) => {
    const signature_request_id = req.params.signature_request_id;
    contract_sign.getSignedContract(signature_request_id);
    res.status(200).send({status: 'OK'});
});


app.put('/signature_complete/brand_campaign_id/:brand_campaign_id/signature_id/:signature_id', (req, res, next)=>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const signature_id = req.params.signature_id;
    console.debug(`Received ${brand_campaign_id} and ${signature_id}`);
    return contract_sign.signature_complete(brand_campaign_id, signature_id, false)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});

app.put('/brand/signature_complete/brand_campaign_id/:brand_campaign_id/signature_id/:signature_id', (req, res, next)=>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const signature_id = req.params.signature_id;
    return contract_sign.signature_complete(brand_campaign_id, signature_id, true)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});


app.put('/brand/choose_influencer/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next)=>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    return contract_sign.update_status(brand_campaign_id, account_id, campaign.BRAND_CHOSEN)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});

app.put('/am/deactivate_inf/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next)=>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    return contract_sign.update_status(brand_campaign_id, account_id, campaign.NO_RESPONSE)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});

app.put('/am/make_offer/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next) => {
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    const data = req.body;
    return contract_sign.make_offer(brand_campaign_id, account_id, data)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});

app.post('/am/email_template', (req, res, next) => {
    const data = req.body;
    return contract_sign.create_email_template(data)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});


app.put('/am/email_template/template_name/:template_name', (req, res, next) => {
    const data = req.body;
    const template_name = req.params.template_name;
    return contract_sign.update_email_template(template_name, data)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});


app.get('/am/email_template', (req, res, next) => {
    const template_name = req.params.template_name;
    return contract_sign.get_email_template(template_name)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});


app.delete('/am/email_template/template_name/:template_name', (req, res, next) => {
    const template_name = req.params.template_name;
    return contract_sign.delete_email_template(template_name)
        .then(result => {
            res.status(200).send(result);
            return result;
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
    console.info('Nodejs API server listening on port', port);
});

