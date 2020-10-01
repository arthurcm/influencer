const express = require('express');
const cors = require('cors');
const functions = require('firebase-functions');
const app = express();
app.use(express.json());
app.use(cors());
require('isomorphic-fetch');
const moment = require('moment');

const isValidDomain = require('is-valid-domain');
const validUrl = require('valid-url');

const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://influencer-272204.firebaseio.com',
});
const db = admin.firestore();

const campaign = require('./campaign');
const influencer = require('./influencer');
const contract_sign = require('./contract_sign');
const reporting = require('./reporting')

const CLIENT_ONBOARDING_EMAILS = ['arthur.meng@lifo.ai', 'alex.niu@lifo.ai', 'shuo.shan@lifo.ai', 'claire.zhou@lifo.ai', 'test@lifo.ai', 'alexander.tarasenko@lifo.ai'];
const SUPPORTED_BRAND_TEMPLATES = ['email_temp_library', 'offer_detail_temp'];


// middleware for token verification
app.use((req, res, next) => {

    // all /share/* endpoints require no authorization
    if (req.path.startsWith('/share')){
        return next();
    }

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
    const campaign_id = req.params.campaign_id;
    const results = campaign.updateCampaign(campaign_id, data);
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


app.put('/brand/approve/campaign_id/:campaign_id/history_id/:history_id', (req, res, next) => {
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
            return campaign.approveContent(campaign_id, history_id)
        })
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
    console.log('Request is sent by ', name);
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
    // if (!isValidDomain(data.website) && !validUrl.isUri(data.website)){
    //     console.warn(`${req.path} Illegal website format received ${data.website} for Shopify? ${from_shopify}, with request ${data}`);
    //     res.status(422).send({status: 'Illegal website format'});
    // }
    const results = campaign.createBrandCampaign(data, uid);
    const campaign_id = results.campaign_id;
    const promise = results.promise;
    return promise
        .then(result => {
            res.status(200).send({campaign_id});
            return result;
        })
        .catch(next);
});


app.post('/brand/targeting_info', (req, res, next) => {
    console.debug('/brand/targeting_info received a request', req.body);
    const data = req.body;
    if (!data.brand_campaign_id) {
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    return campaign.saveTargetingInfo(data.brand_campaign_id, data)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});


app.get('/brand/targeting_info/brand_campaign_id/:brand_campaign_id', (req, res, next) => {
    const brand_campaign_id = req.params.brand_campaign_id
    if (!brand_campaign_id) {
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    return campaign.getTargetingInfo(brand_campaign_id)
        .then(result => {
            res.status(200).send(result);
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

app.get('/am/campaign', (req, res, next) => {
    const uid = res.locals.uid;
    return campaign.amGetAllBrandCampaign()
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});


// This is to get all influencers who are at post-contract stage.
// Then we call '/common/campaign/campaign_id/:campaign_id to get specific campaign histories.
app.get('/am/inf_campaigns/brand_campaign_id/:brand_campaign_id', (req, res, next) => {
    const brand_campaign_id = req.params.brand_campaign_id;
    return campaign.amGetInfCampaigns(brand_campaign_id)
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
    const brand_campaign_id = req.params.brand_campaign_id;
    const uid = res.locals.uid;
    if(!brand_campaign_id){
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    return campaign.deleteBrandCampaign(brand_campaign_id, uid)
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
        .then(async result => {
            console.debug('get brand campaign results', result);
            const brand_campaigns = result[0];
            const discovered_infs = result[1];
            let shop_info = {};
            await db.collection('brands').doc(brand_campaigns.brand_id)
                .get()
                .then(snapShot => {
                    if(snapShot.data() && snapShot.data().shop){
                        shop_info = snapShot.data().shop;
                    }
                    console.log('Getting shop info:', shop_info);
                    return shop_info;
                });
            const shop_address = {
                address1 : shop_info.address1,
                address2 : shop_info.address2,
                city : shop_info.city,
                province : shop_info.province,
                country : shop_info.country,
            }
            brand_campaigns.shop_address = shop_address;
            console.log('After adding address:', brand_campaigns);
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
app.post('/brand/signature_request/create_embedded_with_template', (req, res, next) => {
    console.debug('/brand/signature_request/create_embedded_with_template received a request', req.body);
    const data = req.body;
    const uid = res.locals.uid;
    if (!data.brand_campaign_id) {
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    if (!data.inf_name && !data.account_id) {
        console.warn('inf_name or account_id can not be empty');
        res.status(412).send({status: 'inf_name and account_id both empty'});
    }
    return contract_sign.signatureRequest(data)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});


// TODO: remove the following once client side is updated.
// This is to create signature resquest, which returns signature related information.
app.post('/signature_request/create_embedded_with_template', (req, res, next) => {
    console.debug('/signature_request/create_embedded_with_template received a request', req.body);
    const data = req.body;
    const uid = res.locals.uid;
    if (!data.brand_campaign_id) {
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    if (!data.inf_name && !data.account_id) {
        console.warn('inf_name or account_id can not be empty');
        res.status(412).send({status: 'inf_name and account_id both empty'});
    }
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
app.get('/share/embedded/sign_url/brand_campaign_id/:brand_campaign_id/email/:email', (req, res, next)=>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const inf_mail = req.params.email;
    console.debug(`/embedded/sign_url/brand_campaign_id received a brand_campaign_id ${brand_campaign_id} with email ${inf_mail}`);
    return contract_sign.getEmbeddedSignUrl(brand_campaign_id, inf_mail, contract_sign.INFLUENCER_ROLE)
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
    return contract_sign.getEmbeddedSignUrl(brand_campaign_id, inf_email, contract_sign.BRAND_ROLE)
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


// Note: this will update the campaign's discovery_status to NEWLY_DISCOVERED
app.post('/am/recommend_influencers/brand_campaign_id/:brand_campaign_id', (req, res, next) =>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const data = req.body;
    const idToken = req.headers.authorization;
    console.debug(`/am/recommend_influencers received brand_campaign_id ${brand_campaign_id} with json body ${data}`);
    return campaign.add_recommended_influencers(brand_campaign_id, data)
        .then(result => {
            return campaign.discoveredInfNotificaitons(brand_campaign_id, idToken);
        })
        .then(result=> {
            console.log('email notification results are', result);
            res.status(200).send({status: 'OK'});
        })
        .catch(next);
});

// Note: this will update the campaign's discovery_status to NEED_MORE_INFLUENCERS
app.put('/brand/discover_more_influencers/brand_campaign_id/:brand_campaign_id', (req, res, next) =>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const idToken = req.headers.authorization;
    return campaign.discover_more_influencers(brand_campaign_id)
        .then(result => {
            return campaign.discoveredMoreNotificaitons(brand_campaign_id, idToken);
        })
        .then(result => {
            console.log('email notification results are', result);
            res.status(200).send({status: 'OK'});
        })
        .catch(next);
});

// Note: this will update the campaign's discovery_status to RESULTS_VIEWED
app.get('/brand/view_discovery_results/brand_campaign_id/:brand_campaign_id', (req, res, next) =>{
    const brand_campaign_id = req.params.brand_campaign_id;
    return campaign.view_influencer_discovery_results(brand_campaign_id)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});


// TODO: The files API works regardless of signing status. Add webhook to capture pdf status instead of letting
// client side handle the status.
app.get('/common/signature_request/files/signature_request_id/:signature_request_id', (req, res, next) => {
    const signature_request_id = req.params.signature_request_id;
    const fs = require('fs');
    const file_path = `${signature_request_id}.pdf`;
    return contract_sign.hellosign.signatureRequest.download(signature_request_id, { file_type: 'pdf' }, (err, result) => {
        console.log('error message is:', err);
        const file = fs.createWriteStream(file_path);
        result.pipe(file);
        return file.on('finish', () => {
            res.download(file_path);
            file.close();
        });
    });
});


app.put('/share/signature_complete/brand_campaign_id/:brand_campaign_id/signature_id/:signature_id', (req, res, next)=>{
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

app.put('/brand/skip_offer/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next)=>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    return contract_sign.update_status(brand_campaign_id, account_id, campaign.SKIP_OFFER)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});

app.put('/brand/cancel_offer/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next)=>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    return contract_sign.update_status(brand_campaign_id, account_id, campaign.CANCEL_OFFER)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});

app.put('/brand/add_note/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next)=>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    const data = req.body;
    return campaign.addNote(brand_campaign_id, account_id, data)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});

app.put('/brand/add_shipping_info/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next)=>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    const data = req.body;
    // Shipping Info Should Includes Tracking Number / Carrier and we can look for a delivery time
    if(!data.tracking_number || !data.carrier){
        console.warn('tracking number and carrier can not be empty');
        res.status(412).send({status: 'tracking information is empty'});
    }
    return campaign.addShippingInfo(brand_campaign_id, account_id, data)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});

app.put('/brand/receive_shipping/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next)=>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    const data = req.body;
    // TODO: This is still manual work, need to check how to automate this.
    return campaign.receiveShipping(brand_campaign_id, account_id, data)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});

// This is to tweak influencer status from "email sent" to "no response"
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
    if(!brand_campaign_id){
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    if(!account_id){
        console.warn('account_id can not be empty');
        res.status(412).send({status: 'account_id empty'});
    }
    if(!data.commission_type){
        console.warn('commission_type can not be empty');
        res.status(412).send({status: 'commission_type empty'});
    }
    return contract_sign.make_offer(brand_campaign_id, account_id, data)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});


app.post('/am/template', (req, res, next) => {
    const data = req.body;
    if(!data.template_type){
        console.warn('template_type can not be empty');
        res.status(412).send({status: 'template_type empty'});
    }
    if(!data.template_name){
        console.warn('template_name can not be empty');
        res.status(412).send({status: 'template_name empty'});
    }
    return contract_sign.create_message_template(data)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});


app.put('/am/template/template_type/:template_type/template_name/:template_name', (req, res, next) => {
    const data = req.body;
    const template_name = req.params.template_name;
    const template_type = req.params.template_type;
    if(!template_type){
        console.warn('template_type can not be empty');
        res.status(412).send({status: 'template_type empty'});
    }
    if(!template_name){
        console.warn('template_name can not be empty');
        res.status(412).send({status: 'template_name empty'});
    }
    return contract_sign.update_template(template_type, template_name, data)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});

app.get('/am/template/template_type/:template_type', (req, res, next) => {
    const template_type = req.params.template_type;
    if(!template_type){
        console.warn('template_type can not be empty');
        res.status(412).send({status: 'template_type empty'});
    }
    return contract_sign.get_all_templates(template_type)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});


// Note: this is used for brand to access read-only pre-defined types of templates as defined in the const below.
// The full CRUD operation should be supported on the AM side, not brand side.
// SUPPORTED_BRAND_TEMPLATES = ['email_temp_library', 'offer_detail_temp'];
// email_temp_library: hosts a few built-in email templates
// offer_detail_temp: hosts a few built-in offer details templates
app.get('/brand/template/template_type/:template_type', (req, res, next) => {
    const template_type = req.params.template_type;
    if(!template_type){
        console.warn('template_type can not be empty');
        res.status(412).send({status: 'template_type empty'});
    }
    if(!SUPPORTED_BRAND_TEMPLATES.includes(template_type)){
        console.warn('template_type not supported');
        res.status(412).send({status: 'template_type empty'});
    }
    return contract_sign.get_all_templates(template_type)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});


// Note: this is used for brand to access read-only pre-defined types of templates as defined in the const below.
// The full CRUD operation should be supported on the AM side, not brand side.
// SUPPORTED_BRAND_TEMPLATES = ['email_temp_library', 'offer_detail_temp'];
// email_temp_library: hosts a few built-in email templates
// offer_detail_temp: hosts a few built-in offer details templates
app.get('/brand/template/template_type/:template_type/template_name/:template_name', (req, res, next) => {
    const template_name = req.params.template_name;
    if(!template_name){
        console.warn('template_name can not be empty');
        res.status(412).send({status: 'template_name empty'});
    }
    const template_type = req.params.template_type;
    if(!template_type){
        console.warn('template_type can not be empty');
        res.status(412).send({status: 'template_type empty'});
    }
    if(!SUPPORTED_BRAND_TEMPLATES.includes(template_type)){
        console.warn('template_type not supported');
        res.status(412).send({status: 'template_type empty'});
    }
    return contract_sign.get_message_template(template_type, template_name)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});

app.get('/am/template/template_type/:template_type/template_name/:template_name', (req, res, next) => {
    const template_name = req.params.template_name;
    if(!template_name){
        console.warn('template_name can not be empty');
        res.status(412).send({status: 'template_name empty'});
    }
    const template_type = req.params.template_type;
    if(!template_type){
        console.warn('template_type can not be empty');
        res.status(412).send({status: 'template_type empty'});
    }
    return contract_sign.get_message_template(template_type, template_name)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});


app.delete('/am/template/template_type/:template_type/template_name/:template_name', (req, res, next) => {
    const template_name = req.params.template_name;
    if(!template_name){
        console.warn('template_name can not be empty');
        res.status(412).send({status: 'template_name empty'});
    }
    const template_type = req.params.template_type;
    if(!template_type){
        console.warn('template_type can not be empty');
        res.status(412).send({status: 'template_type empty'});
    }
    return contract_sign.delete_template(template_type, template_name)
        .then(result => {
            res.status(200).send({status: 'deleted'});
            return result;
        })
        .catch(next);
});


// This is to check the inf's current status, so that different view can be shown to influencers.
app.get('/share/inf_status/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next) => {
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    return contract_sign.get_inf_status(brand_campaign_id, account_id)
        .then(results => {
            console.debug('getting profile', results);
            res.status(200).send(results);
            return results;
        })
        .catch(next);
});

// This is to display the offer/campaign details to influencers, who does not have account with lifo yet.
app.get('/share/influencer/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next) => {
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    return contract_sign.get_influencer_view(brand_campaign_id, account_id)
        .then(results => {
            console.debug('getting profile', results)
            res.status(200).send(results);
            return results;
        })
        .catch(next);
});


// TODO: remove the following once client side is updated.
// Corresponds to a html editor results
// this is to allow AM to fill in detailed information for campaign for influencers to review.
app.post('/am/inf_product_message/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next) => {
    const data = req.body;
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    if(!brand_campaign_id){
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    if(!account_id){
        console.warn('account_id can not be empty');
        res.status(412).send({status: 'account_id empty'});
    }
    return contract_sign.update_product_message(brand_campaign_id, account_id, data.product_message, data.product_image_list)
        .then(results => {
            res.status(200).send({status: 'OK'});
            return results;
        })
        .catch(next);
});



// Corresponds to a html editor results
// this is to allow AM to fill in detailed information for campaign for influencers to review.
app.post('/brand/inf_product_message/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next) => {
    const data = req.body;
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    if(!brand_campaign_id){
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    if(!account_id){
        console.warn('account_id can not be empty');
        res.status(412).send({status: 'account_id empty'});
    }
    return contract_sign.update_product_message(brand_campaign_id, account_id, data.product_message, data.product_image_list)
        .then(results => {
            res.status(200).send({status: 'OK'});
            return results;
        })
        .catch(next);
});


// TODO: remove the following once client side is updated.
app.post('/am/inf_comp_message/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next) => {
    const data = req.body;
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    if(!brand_campaign_id){
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    if(!account_id){
        console.warn('account_id can not be empty');
        res.status(412).send({status: 'account_id empty'});
    }
    return contract_sign.update_comp_message(brand_campaign_id, account_id, data.compensation_message)
        .then(results => {
            res.status(200).send({status: 'OK'});
            return results;
        })
        .catch(next);
});


// Corresponds to a html editor results
// this is to allow AM to fill in detailed information for campaign for influencers to review.
app.post('/brand/inf_comp_message/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next) => {
    const data = req.body;
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    if(!brand_campaign_id){
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    if(!account_id){
        console.warn('account_id can not be empty');
        res.status(412).send({status: 'account_id empty'});
    }
    return contract_sign.update_comp_message(brand_campaign_id, account_id, data.compensation_message)
        .then(results => {
            res.status(200).send({status: 'OK'});
            return results;
        })
        .catch(next);
});


// this is to allow influencers to fill in detailed information for campaign after influencer accepts the offer.
app.put('/share/influencer', (req, res, next) => {
    const data = req.body;
    if(!data.brand_campaign_id){
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    if(!data.account_id){
        console.warn('account_id can not be empty');
        res.status(412).send({status: 'account_id empty'});
    }
    const influencer_profile = {
        inf_name : data.inf_name,
        inf_email : data.inf_email,
        inf_phone: data.inf_phone,
        influencer_address1: data.influencer_address1,
        inf_signing_status: campaign.INFLUENCER_SIGNEDUP,
    };
    if(data.influencer_address2){
        influencer_profile.influencer_address2 = data.influencer_address2;
    }
    return campaign.access_influencer_subcollection(data.brand_campaign_id).doc(data.account_id)
        .set(influencer_profile, {merge:true})
        .then(results => {
            res.status(200).send({status: 'OK'});
            return results;
        })
        .catch(next);
});


app.get('/share/offer_avail/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next) => {
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    return contract_sign.get_influencer_offer_status(brand_campaign_id, account_id)
        .then(results => {
            res.status(200).send({status: results});
            return results;
        })
        .catch(next);
});


// this is to allow influencers to accept/decline the campaign offer.
app.put('/share/influencer_offer', (req, res, next) => {
    const data = req.body;
    if(!data.brand_campaign_id){
        console.warn('brand_campaign_id can not be empty');
        return res.status(412).send({status: 'brand_campaign_id empty'});
    }
    if(!data.account_id){
        console.warn('account_id can not be empty');
        return res.status(412).send({status: 'account_id empty'});
    }
    if(data.accept == null){
        console.warn('have to either accept or decline can not be empty');
        return res.status(412).send({status: 'choose either accept or decline'});
    }

    let influencer_profile;
    if (data.accpet) {
        influencer_profile = {
            inf_signing_status: campaign.INFLUENCER_ACCEPT,
            offer_response : data,
            offer_accept_time: moment().utc().unix(),
        };
    } else {
        console.log('Influencer declined the offer');
        influencer_profile = {
            inf_signing_status: campaign.INFLUENCER_DECLINE,
            offer_response: data,
            offer_decline_time: moment().utc().unix(),
        };
    }

    // this is a hack to avoid unwanted bugs during test phase.
    let internal_test = false;
    if(data.account_id === 'lifo' || data.account_id === 'Lifo'){
        internal_test = true;
    }
    return contract_sign.check_contract_signing_status(data.brand_campaign_id, data.account_id)
        .then(in_contract_status => {
            if(!in_contract_status && !internal_test){
                return campaign.access_influencer_subcollection(data.brand_campaign_id).doc(data.account_id)
                    .set(influencer_profile, {merge:true});
            }
            console.error('Influencer in contract signing status, cannot modify campaign details.');
            return false;
        })
        .then(results => {
            if(!results){
                res.status(405).send({error: 'Influencer in contract signing status, cannot modify campaign details.'});
            }
            res.status(200).send({status: 'OK'});
            return results;
        })
        .catch(next);
});


app.post('/am/post_perf', (req, res, next)=>{
    const data = req.body;
    if(!data.brand_campaign_id){
        console.warn('brand_campaign_id can not be empty');
        return res.status(412).send({status: 'brand_campaign_id empty'});
    }
    if(!data.account_id){
        console.warn('account_id can not be empty');
        return res.status(412).send({status: 'account_id empty'});
    }

    if(!data.likes){
        console.warn('likes can not be empty');
        return res.status(412).send({status: 'likes empty'});
    }

    if(!data.comments){
        console.warn('comments can not be empty');
        return res.status(412).send({status: 'comments empty'});
    }

    return reporting.reportPostingPerformance(data)
        .then(results => {
            res.status(200).send({status: 'OK'});
            return results;
        })
        .catch(next);
});


app.get('/brand/post_perf/brand_campaign_id/:brand_campaign_id', (req, res, next)=>{
    const brand_campaign_id = req.params.brand_campaign_id;
    if(!brand_campaign_id){
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    return reporting.campaignPerformance(brand_campaign_id)
        .then(results => {
            res.status(200).send(results);
            return results;
        })
        .catch(next);
});


app.get('/brand/post_perf/brand_id/:brand_id', (req, res, next)=>{
    const brand_id = req.params.brand_id;
    return reporting.campaignDashboard(brand_id)
        .then(results => {
            res.status(200).send(results);
            return results;
        })
        .catch(next);
});


// Only works for Shopify stores.
app.get('/am/tracking_url/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next)=>{
    const idToken = req.headers.authorization;
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    if(!brand_campaign_id){
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    if(!account_id){
        console.warn('account_id can not be empty');
        res.status(412).send({status: 'account_id empty'});
    }
    return campaign.register_tracking_url(idToken, account_id, brand_campaign_id)
        .then(results => {
            res.status(200).send(results);
            return results;
        })
        .catch(next);
});


app.post('/am/register_brand', (req, res, next)=>{
    const am_email = res.locals.email;
    if(!CLIENT_ONBOARDING_EMAILS.includes(am_email)){
        console.warn(`request to ${req.path} was rejected`);
        return res.status(403).json({ error: 'Not authorized'});
    }
    const data = req.body;
    const email = data.email;
    const from_amazon = data.from_amazon;
    const brand_name = data.brand_name;
    const password = data.password;
    const first_name = data.first_name;
    const last_name = data.last_name;
    if(!email){
        console.warn('email can not be empty');
        res.status(412).send({status: 'email empty'});
    }
    if(!brand_name){
        console.warn('brand_name can not be empty');
        res.status(412).send({status: 'brand_name empty'});
    }
    if(!password){
        console.warn('password can not be empty');
        res.status(412).send({status: 'password empty'});
    }
    return reporting.registerBrandAccount(email, password, from_amazon, brand_name, first_name, last_name, data)
        .then(results => {
            res.status(200).send({status: 'OK'});

            return results;
        })
        .catch(next);
});


// This is for brand and AM side to assign affiliate link to each influencer
app.post('/brand/affiliate_link', (req, res, next) => {
    const data = req.body;
    if(!data.affiliate_link){
        console.warn('affiliate_link can not be empty');
        res.status(412).send({status: 'affiliate_link empty'});
    }
    if(!data.account_id){
        console.warn('account_id can not be empty');
        res.status(412).send({status: 'account_id empty'});
    }
    if(!data.brand_campaign_id){
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    return reporting.assign_affiliate_link(data)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});


// This is for all three sides to retrieve the affiliate link
app.get('/common/affiliate_link/brand_campaign_id/:brand_campaign_id/account_id/:account_id', (req, res, next) => {
    const brand_campaign_id = req.params.brand_campaign_id;
    const account_id = req.params.account_id;
    if(!account_id){
        console.warn('account_id can not be empty');
        res.status(412).send({status: 'account_id empty'});
    }
    if(!brand_campaign_id){
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    return reporting.get_affiliate_link(brand_campaign_id, account_id)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});


app.get('/brand/brand_campaign_status/brand_campaign_id/:brand_campaign_id', (req, res, next) => {
    const brand_campaign_id = req.params.brand_campaign_id;
    if(!brand_campaign_id){
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    return campaign.getBrandCampaignStatus(brand_campaign_id)
        .then(result => {
            res.status(200).send({status: result});
            return result;
        })
        .catch(next);
});

app.get('/am/campaign_configuration/brand_campaign_id/:brand_campaign_id', (req, res, next) => {
    const brand_campaign_id = req.params.brand_campaign_id;
    if (!brand_campaign_id){
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    return db.collection('configuration').doc(brand_campaign_id).get()
        .then(result => {
            res.status(200).send(result.data());
            return result;
        })
        .catch(next);
});

app.put('/am/campaign_configuration/brand_campaign_id/:brand_campaign_id', (req, res, next) => {
    const brand_campaign_id = req.params.brand_campaign_id;
    if (!brand_campaign_id){
        console.warn('brand_campaign_id can not be empty');
        res.status(412).send({status: 'brand_campaign_id empty'});
    }
    return db.collection('configuration').doc(brand_campaign_id).set(req.body, {merge: true})
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});

app.get('/brand/faq', (req, res, next) => {
    return db.collection('faq').get()
        .then(snapshot => {
            const result = [];
            snapshot.forEach(doc => {
                result.push({
                    id: doc.id,
                    ...doc.data(),
                })
            });
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});

app.get('/brand/faq/:id', (req, res, next) => {
    const faq_id = req.params.id;
    return db.collection('faq').doc(faq_id).get()
        .then(result => {
            res.status(200).send({
                id: result.id,
                ...result.data(),
            });
            return result;
        })
        .catch(next);
});

app.post('/am/faq', (req, res, next) => {
    return db.collection('faq').add(req.body)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});

app.put('/am/faq/:id', (req, res, next) => {
    const faq_id = req.params.id;
    return db.collection('faq').doc(faq_id).set(req.body)
        .then(result => {
            res.status(200).send({status: 'OK'});
            return result;
        })
        .catch(next);
});

app.delete('/am/faq/:id', (req, res, next) => {
    const faq_id = req.params.id;
    return db.collection('faq').doc(faq_id).delete()
        .then(result => {
            res.status(200).send({status: 'OK'});
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

// Influencer part
app.post('/influencer/sign-up/influencer', (req, res, next) => {
    console.debug(`${req.path} received  ${req.body}`);
    const data = req.body;
    return influencer.updateInfluencerUserById(res.locals.uid,data)
        .then(user => res.status(200).send(user))
        .catch(next);
})

app.get('/influencer/current-profile', (req, res, next) => {
    return influencer.getInfluencerUserByUid(res.locals.uid)
        .then(user => {
            if (!user) {
                const userData = {
                    email: res.locals.email,
                    user_id: res.locals.uid
                }
                return influencer.createInfluencerUser(userData)
                    .then(newUser => res.status(200).send(newUser))
            } else {
                res.status(200).send(user);
            }
        })
        .catch(next);

})

app.put('/influencer/current-profile', (req, res, next) => {
    const data = req.body;
    return influencer.updateInfluencerUserById(res.locals.uid,data)
        .then(user => res.status(200).send(user))
        .catch(next);
});

app.get('/influencer/check-instagram', (req, res, next) => {
    return influencer.getInstagramProfileFromModash(res.locals.uid, req.headers.authorization)
        .then(modashResults => {
            if (modashResults) {
                return influencer.updateInfluencerUserById(res.locals.uid, {is_instagram_checked: true});
            }
        })
        .catch(next);

})

app.put('/influencer/complete-sign-up', (req, res, next) => {
    console.debug(`${req.path} received  ${req.body}`);
    const data = req.body;
    const userUid = res.locals.uid;
    return influencer.updateInfluencerUserById(userUid, data)
        .then(user => res.status(200).send(user))
        .catch(next);

})


app.get('/influencer/campaign', (req, res, next) => {
    return influencer.getCampaignsByUid(res.locals.uid)
        .then(campaigns => {
            res.status(200).send(campaigns);
        })
        .catch(next);

});

// End of Influencer part

app.post('/am/campaign_recruit', (req, res, next) => {
    console.debug(`${req.path} received  ${req.body}`);
    const data = req.body;
    return campaign.createCampaignRecruit(data)
        .then(results => res.status(200).send({status: 'OK'}))
        .catch(next);
});


app.put('/am/stop_recruit/brand_campaign_id/:brand_campaign_id', (req, res, next) => {
    const brand_campaign_id = req.params.brand_campaign_id;
    return campaign.closeRecruit(brand_campaign_id)
        .then(results => res.status(200).send({status: results}))
        .catch(next);
});


// this is a pull API. Likely we need a client-side push API which listens to the status.
// When read, it will update the recruit status according to existing quota vs recruit numbers.
app.get('/share/recruit-status/brand_campaign_id/:brand_campaign_id', (req, res, next) => {
    const brand_campaign_id = req.params.brand_campaign_id;
    return campaign.recruitStatus(brand_campaign_id)
        .then(results => res.status(200).send({status: results}))
        .catch(next);
});


// Note(09/28/2020): This API is designed to handle commission based campaign type, which requires login in to actually
// being able to accept the invitation. If the account has not logged in, user will be redirected to the login page.
// Later on, once our commission based campaign (marketplace product) stablizes, we will combine SaaS with Marketplace
// and all campaign invitations should go through this API.
// The scenarios are as follows:
// 1. If expired, not able to accept nor decline;
// 1. If open, accept, update invitation and campaign recruit
app.put('/share/accept-invitation/brand_campaign_id/:brand_campaign_id/accept/:accept', (req, res, next) =>{
    const brand_campaign_id = req.params.brand_campaign_id;
    const accept = req.params.accept;
    const idToken = req.headers.authorization;
    if(!idToken){
        console.info('User not logged in for campaign', brand_campaign_id);
        return res.redirect(301, 'https://influencer.lifo.ai/sign-in');
    }
    return admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            const uid = decodedToken.uid;
            console.info('received decoded token', decodedToken);
            if(decodedToken.store_account){
                return res.status(403).json({ error: 'Not authorized'});
            }
            const ins_id = influencer.getInstagramIDByUID(uid); // 'xosimplysteph'
            if(accept === 'true'){
                console.info(`influencer ${ins_id} is accepting invitation ${brand_campaign_id}`);
                return campaign.acceptInvitation(brand_campaign_id, ins_id, uid);
            }else{
                console.info(`influencer ${ins_id} is declining invitation ${brand_campaign_id}`);
                return campaign.declineInvitation(brand_campaign_id, ins_id, uid);
            }
        })
        .then(results => {
            if(results){
                return res.status(200).send({status: 'OK'});
            }
            return res.status(200).send({status: 'Already accepted'});
        })
        .catch(next);
});


app.post('/am/commission', (req, res, next) => {
    const data = req.body;
    const influencer_list = data.influencers;
    const max_commission = data.max_commission;
    const bonus_percentage = data.bonus_percentage;
    let product_cost = data.product_cost;
    let cpm = data.cpm;
    if(! product_cost){
        product_cost = 20;
    }
    if(! cpm){
        cpm = 9;
    }
    const results = campaign.calculateCommission(influencer_list, max_commission, bonus_percentage, product_cost, cpm);
    return res.status(200).send(results);
});
