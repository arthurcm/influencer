const admin = require('firebase-admin');
const firebase = require("firebase/app");

const getFirebaseAuth = async  (ctx, shop, next, accessToken) => {
    let shopinfo;
    let customClaims;
    let custom_token;
    await fetch(`https://${shop}/admin/api/2020-04/shop.json`, {
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
                .catch(function (error) {
                    console.log('Error creating custom token:', error);
                });
        });
    console.log('custom claims', customClaims)
    return admin.auth().setCustomUserClaims(shop, customClaims).then(() => {
        // The new custom claims will propagate to the user's ID token the
        // next time a new one is issued.
        return ctx.redirect(`https://login.lifo.ai/login/?idToken=${custom_token}`);
    })
    .catch(function (err) {
        console.error('Error creating custom token:', err);
        next();
    });
};

module.exports = getFirebaseAuth;