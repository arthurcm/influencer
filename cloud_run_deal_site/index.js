const express = require('express');
const cors = require('cors');
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

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.info('Nodejs API server listening on port', port);
});

