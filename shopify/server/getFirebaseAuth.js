const admin = require('firebase-admin');
const firebase = require("firebase/app");
const getProductList = require('./getProductList');
const registerBrand = require('./registerBrand');

const getFirebaseAuth = async  (ctx, shop, next, accessToken) => {
    let shopinfo;
    let customClaims;
    let custom_token;
    let id_token;
    await fetch(`https://${shop}/admin/api/${process.env.API_VERSION}/shop.json`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
        },
    })
        .then(async (response) => {
            shopinfo = await response.json();
            customClaims = {
                store_account: true,
                from_shopify:true,
                store_email: shopinfo.shop.email,
                store_name: shopinfo.shop.name,
            };
            await admin.auth().createCustomToken(shop)
                .then(function (customToken) {
                    // Send token back to client
                    custom_token = customToken;
                    return customToken;
                })
                .then(custom_token => {
                    return firebase.auth()
                        .signInWithCustomToken(custom_token)
                        .catch(function (err) {
                            console.error('Error creating custom token:', err);
                            next();
                        });
                })
                .then(res => {
                    return firebase.auth().currentUser.getIdToken(/* forceRefresh */ true);
                })
                .then(idToken => {
                    id_token = idToken;
                })
                .catch(function (error) {
                    console.log('Error creating id token:', error);
                });
        });
    console.log('custom claims', customClaims, 'and id token', id_token);
    return admin.auth().setCustomUserClaims(shop, customClaims).then(() => {
        // The new custom claims will propagate to the user's ID token the
        // next time a new one is issued.
        // getProductList(ctx, shop, next, accessToken, id_token);
        registerBrand(ctx, shop, next, accessToken, id_token)
        return ctx.redirect(`https://login.lifo.ai/login/?idToken=${custom_token}`);
    })
    .catch(function (err) {
        console.error('Error creating custom token:', err);
        next();
    });
};

module.exports = getFirebaseAuth;
