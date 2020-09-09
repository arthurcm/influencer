const express = require('express');
const cors = require('cors');
const axios = require("axios");
const functions = require('firebase-functions');
const app = express();
app.use(express.json());
app.use(cors());
require('isomorphic-fetch');
const { db, AVAILABLE_COLLECTIONS, DealModel, AffiliateModel} = require('./models');
const { IRelation } = require('./typings');
const {Bitly} = require('./lib');
const moment = require('moment-timezone');

const DEAL_COLLECTIONS = 'deals';
const AFFILIATE_COLLECTIONS = 'affiliates';
const RECOMMENDED_DEALS_COLLECTIONS = 'recommended_deals';

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

app.use((err, req, res, next) => {
    console.error(err.stack);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).send({ error: err });
    return res;
});

app.get('/share/health', (req, res) => {
    res.send({'status': 'ok'});
});

app.post('/share/create_deal', (req, res, next) => {
    console.debug(`${req.path} received  ${req.body}`);
    const data = req.body;
    if (!data.product_name) {
        console.warn('Missing product_name from deal');
        res.status(412).send({status: 'Missing product name'});
    }
    if (!data.url) {
        console.warn('Missing url from deal');
        res.status(412).send({status: 'Missing product url'});
    }
    if (!data.expiration_time) {
        console.warn('Missing expiration_time from deal');
        res.status(412).send({status: 'Missing expiration_time'});
    }

    // Here we use China Time for deal id
    const dateStr = moment().tz('Asia/Shanghai').format('YYYYMMDD');
    // We need to count how many deals are created since 12AM China time
    const dateLong = Math.round((moment().utc().unix() - 28800)/ 86400) * 86400 - 28800;

    return DealModel.searchDoc(['created_at', '>=', dateLong])
        .then(querySnapshot => {
            console.log('There are',  querySnapshot.docs.length, 'deals generated afer', dateLong);
            let maxId = 0;
            querySnapshot.docs.forEach(doc => {
                if (doc.data().deal_id) {
                    maxId = Math.max(maxId, Number(doc.data().deal_id.substring(9)) - 1000);
                }
            })
            return maxId;
        }).then((deal_count) => {
            req.body.deal_id = `${dateStr}_${deal_count + 1001}`
            return DealModel.createDoc(req.body)
                .then(result => {
                    res.status(200).send(req.body);
                    return result;
                })
        }).catch(next);
});

app.get('/share/list_deal', (req, res, next) => {
    console.debug(`${req.path} received`);
    return DealModel.get()
        .then(querySnapshot => {
            const deals = [];
            querySnapshot.docs.forEach(doc => {
                const doc_snap = doc.data();
                doc_snap.id = doc.id;
                deals.push(doc_snap);
            });
            console.debug('Found', deals.length, 'deals in /campaign GET');
            res.status(200).send(deals);
        })
        .catch(next);
});

app.get('/share/deal/:id/list_affliates', (req, res, next) => {
    console.debug(`${req.path} received`);
    const docId = req.params.id;
    if (!docId) {
        res.status(422).send({status: 'Require a valid doc ID'});
    }

    const deal_ref =  DealModel.getDocById(docId)
        .then(result => {
            return result;
        });
    const deal_inf_ref = DealModel.listCollectionsById(docId, "affiliates")
        .then(querySnapshot => {
            const discovered_influencers = [];
            querySnapshot.docs.forEach(doc => {
                discovered_influencers.push(doc.data());
            });
            console.debug('Found', discovered_influencers.length, 'affiliates');
            return discovered_influencers;
        });
    return Promise.all([deal_ref, deal_inf_ref])
        .then(result => {
            const [deal, affiliates] = result;
            deal.affiliates = affiliates;
            res.status(200).send(deal);
            return deal;
        })
        .catch(next);
});

app.get('/share/deal/:id', (req, res, next) => {
    console.debug(`${req.path} received`);
    const dealId = req.params.id;
    if (!dealId) {
        res.status(422).send({status: 'Require a valid doc ID'});
    }
    return DealModel.getDocById(dealId)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});

app.put('/share/update_deal/:id', (req, res, next) => {
    console.debug(`${req.path} received`);
    const docId = req.params.id;
    if (!docId) {
        res.status(422).send({status: 'Require a valid doc ID'});
    }
    return DealModel.updateDocById(docId, req.body)
        .then(
            result => {
                res.status(200).send({'status': 'updated'});
                return result;
            })
        .catch(next);
});

app.delete('/share/delete_deal/:id', (req, res, next) => {
    const docId = req.params.id;
    if(!docId){
        res.status(422).send({status: 'Require a valid doc ID'});
    }

    console.info(`Deleting doc ${docId}`);
    return DealModel.deleteDocById(docId).then(
        result => {
            res.status(200).send({'status': 'deleted'});
            return result;
        })
        .catch(next);
});

app.delete('/am/delete_deal/:id', (req, res, next) => {
    const docId = req.params.id;
    if(!docId){
        res.status(422).send({status: 'Require a valid doc ID'});
    }

    console.info(`Deleting doc ${docId}`);
    return DealModel.deleteDocById(docId).then(
        result => {
            res.status(200).send({'status': 'deleted'});
            return result;
        })
        .catch(next);
});

app.post('/share/unshorten_url', (req, res, next) => {
    console.debug(`${req.path} received  ${req.body}`);
    const data = req.body;
    if (!data.link) {
        console.warn('Missing link');
        res.status(412).send({status: 'Missing link'});
    }
    const link = data.link;
    axios(
        {
            method: "get",
            url: data.link,
            maxRedirects: 0
        }
    ).then((response)=>{
        res.send({'status': 'ok'});
    }).catch(error => {
        if (Math.trunc(error.response.status / 100) === 3) {
            console.log(error.response.headers.location);
            res.status(200).send({'fullurl': error.response.headers.location});
        } else {
            res.status(400).send({'error': 'failed to find full url'});
        }
    });
});

app.get('/share/get_item_info/:asin', (req, res, next) => {
    const asin = req.params.asin;
    console.debug('Receiving asin for get item', asin);
    if (!asin) {
        console.warn(`request to ${req.path} did not provide asin`);
        res.status(422).send('Missing a valid asin');
    }
    axios(
        {
            "method":"GET",
            "url": "https://amazon-product-search.p.rapidapi.com/amazon-search/product",
            "headers":{
                "content-type": "application/octet-stream",
                "x-rapidapi-host": "amazon-product-search.p.rapidapi.com",
                "x-rapidapi-key": "87ce9b7202msh2cd25930b9a3f3bp16bf78jsnec59bcf7cfae",
                "useQueryString": true
            },
            "params":{
                "asin": asin,
                "region": "com"
            }
        }
    ).then((response)=>{
        console.log(response)
        res.send(response.data);
    }).catch(next);
});

app.post('/share/affiliate', (req, res, next) => {
    const data = req.body;
    const email = data.email;
    const affiliate_id = data.affiliate_id || '';
    if(!email){
        res.status(422).send({status: 'Require a valid email'});
    }
    return db.collection(AFFILIATE_COLLECTIONS).doc(email).set({
            email,
            affiliate_id,
        })
        .then(result => {
            res.status(200).send({status: 'OK'});
        })
        .catch(next);
});

app.get('/share/affiliate/email/:email/date/:date', (req, res, next) => {
    const email = req.params.email;
    const date = req.params.date;
    if (!email) {
        res.status(422).send({status: 'Require a valid email'});
    }

    if (!date) {
        res.status(422).send({status: 'Require a valid date string'});
    }

    /**
     *
     * @type {IRelation[]}
     */
    const affiliateRelations = [
        {
            relationName: AVAILABLE_COLLECTIONS.recommended_deals,
            relationId: date
        }
    ]

    return AffiliateModel.getDocById(email, {relations: affiliateRelations})
        .then(async doc => {
            if (doc) {
                if (doc[AVAILABLE_COLLECTIONS.recommended_deals].length) {
                    doc[AVAILABLE_COLLECTIONS.recommended_deals] = await Promise.all(
                        doc[AVAILABLE_COLLECTIONS.recommended_deals].map(async recommendedDeals => {
                            if (recommendedDeals.deal_list.length) {
                                recommendedDeals.deal_list = (await Promise.all(
                                    recommendedDeals.deal_list.map(async dealId => await DealModel.getDocById(dealId))
                                )).filter(deal => deal);
                            }
                            return recommendedDeals
                        })
                    );
                }

                res.status(200).send(doc);
                return doc;
            }
            res.status(200).send({status: 'Affiliate not found'});
        })
        .catch(next);
});

app.get('/share/affiliate_link/email/:email/asin/:asin/deal_id/:deal_id', (req, res, next) => {
    const email = req.params.email;
    const asin = req.params.asin;
    const deal_id = req.params.deal_id;
    if(!email){
        res.status(422).send({status: 'Require a valid email'});
    }
    if(!asin){
        res.status(422).send({status: 'Require a valid asin'});
    }
    return db.collection(AFFILIATE_COLLECTIONS).doc(email).get()
        .then(snapshot => {
            if(snapshot) {
                const data = snapshot.data();
                const affiliate_id = data.affiliate_id;
                const affiliate_link = `https://www.amazon.com/dp/${asin}/?tag=${affiliate_id}`;
                console.log('Created affiliate link', affiliate_link);
                return Bitly.generateShortLink(affiliate_link);
            }
            res.status(200).send({status: 'not found'});
        })
        .then(shortAffiliateLinkObject => {
            console.log('Created affiliate link', shortAffiliateLinkObject.link);
            res.status(200).send({affiliate_link: shortAffiliateLinkObject.link});

            // TODO (@Alex): I updated the endpoint to add deal_id param so that we can record the shortened url for
            // each affiliate. Once you update the client side, there's no need to check the validity of the deal_id
            // here. The deal_id is referred to as the document id for each deal.
            if(deal_id){
                const promise = db.collection(DEAL_COLLECTIONS).doc(deal_id)
                    .collection(AFFILIATE_COLLECTIONS).doc(email)
                    .set({short_link: shortAffiliateLinkObject.link}, {merge: true});
                return promise;
            }
            return shortAffiliateLinkObject;
        })
        .catch(next);
});

app.post('/share/apply/email/:email/deal_id/:deal_id', (req, res, next) => {
    const email = req.params.email;
    if(!email){
        res.status(422).send({status: 'Require a valid email'});
    }
    const deal_id = req.params.deal_id;
    if(!deal_id){
        res.status(422).send({status: 'Require a valid deal_id'});
    }
    const batch = db.batch();
    const deal_ref = db.collection(DEAL_COLLECTIONS).doc(deal_id).collection(AFFILIATE_COLLECTIONS).doc(email);
    const affiliate_ref = db.collection(AFFILIATE_COLLECTIONS).doc(email).collection(DEAL_COLLECTIONS).doc(deal_id);
    return db.collection(AFFILIATE_COLLECTIONS).doc(email).get()
        .then(snapshot => {
            if(snapshot){
                return snapshot.data();
            }
            return snapshot
        })
        .then(data => {
            let affiliate_id = '';
            if (data) {
                affiliate_id = data.affiliate_id || '';
            }
            const request_body = req.body;
            request_body.email = email;
            request_body.affiliate_id = affiliate_id
            batch.set(deal_ref, request_body);
            batch.set(affiliate_ref, {deal_id});
            return batch.commit();
        })
        .then(results => {
            res.status(200).send({status: 'OK'});
            return results;
        })
        .catch(next);
});


const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.info('Nodejs API server listening on port', port);
});

