const express = require('express');
const router = express.Router();

// middleware for token verification
const TokenVerificationMiddleware =
    /**
     *
     * @param container{CONTAINER}
     * @constructor
     */
    (container) => {
        router.use(async (req, res, next) => {
            // all /share/* endpoints require no authorization
            if (req.path.startsWith('/share')) {
                return next();
            }

            // idToken comes from the client
            if (!req.headers.authorization) {
                console.warn(`request to ${req.path} did not provide authorization header`);
                return res.status(401).json({error: 'No credentials sent!'});
            }
            const idToken = req.headers.authorization;
            try {
                const decodedToken = await container.firebaseService.admin.auth().verifyIdToken(idToken);
                const uid = decodedToken.uid;
                if (process.env.USE_REQUEST_LOGGER !== 'true') {
                    console.info('received decoded token', decodedToken);
                }
                // the following "additional claim" field "store_account" is set in shopify/sever.js to
                // sign up store accounts
                // /brand/* end points can only be accessed by store accounts
                // /common/* endpoints require auth, can be accessed by both store and inf
                // /am/* endpoints require account manager accounts, and can ONLY be accessed by account managers.
                if (req.path.startsWith('/am/') && !decodedToken.account_manager) {
                    return res.status(403).json({error: 'Not authorized'});
                } else if (req.path.startsWith('/common') || req.path.startsWith('/share')) {
                } else if (req.path.startsWith('/brand') && !decodedToken.store_account && !decodedToken.account_manager) {
                    return res.status(403).json({error: 'Not authorized'});

                    // other campaign related end points (except for /share) are not accessible to store accounts.
                } else if (!req.path.startsWith('/brand') && decodedToken.store_account) {
                    return res.status(403).json({error: 'Not authorized'});
                }

                res.locals.uid = uid;
                res.locals.from_shopify = decodedToken.from_shopify;
                res.locals.store_account = decodedToken.store_account;
                res.locals.account_manager = decodedToken.account_manager;
                res.locals.name = decodedToken.name;
                res.locals.email = decodedToken.email;

                req.current_user = await container.influencerService.getInfluencerUserByUid(uid);
                if (!req.current_user) {
                    req.current_user = {
                        uid,
                    };
                }
                next();
                return decodedToken;
            } catch (error) {
                console.error(error);
                res.status(401).send({status: 'auth failure'});
                next(error);
            }
        });
        return router;
    };

module.exports = TokenVerificationMiddleware;
