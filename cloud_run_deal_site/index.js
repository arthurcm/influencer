const express = require('express');
const cors = require('cors');
const axios = require("axios");
const functions = require('firebase-functions');
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
const db = admin.firestore();

const DEAL_COLLECTIONS = 'deals';

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

    const dealsRef = db.collection(DEAL_COLLECTIONS).doc();
    return dealsRef.set(req.body)
        .then(result => {
            res.status(200).send(req.body);
            return result;
        })
        .catch(next);

});

app.get('/share/list_deal', (req, res, next) => {
    console.debug(`${req.path} received  ${req.body}`);
    return db.collection(DEAL_COLLECTIONS).get()
        .then(querySnapshot => {
            const deals = [];
            querySnapshot.docs.forEach(doc => {
                const doc_snap = doc.data();
                deals.push(doc_snap);
            });
            console.debug('Found', deals.length, 'deals in /campaign GET');
            res.status(200).send(deals);
        })
        .catch(next);
});

app.get('/share/item_info', (req, res, next) => {
    axios(
        {
            "method":"GET",
            "url":"https://amazon-product-search.p.rapidapi.com/amazon-search/product.php",
            "headers":{
                "content-type":"application/octet-stream",
                "x-rapidapi-host":"amazon-product-search.p.rapidapi.com",
                "x-rapidapi-key":"87ce9b7202msh2cd25930b9a3f3bp16bf78jsnec59bcf7cfae",
                "useQueryString":true
            },
            "params":{
                "asin":"B081Q5RCMV",
                "region":"com"
            }
        }
    ).then((response)=>{
        console.log(response)
        res.send(response.data);
    }).catch(next);
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.info('Nodejs API server listening on port', port);
});

