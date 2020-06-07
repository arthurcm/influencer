const admin = require('firebase-admin');
const firebase = require("firebase/app");

const getFirebaseAuth = async  (ctx, shop, next) => {
    let custom_token;
    return admin.auth().createCustomToken(shop)
        .then(function (customToken) {
            // Send token back to client
            custom_token = customToken;
            console.log('custom token', customToken)
            return ctx.redirect(`https://login.lifo.ai/login/?idToken=${customToken}`);
        })
        .catch(function (error) {
            console.log('Error creating custom token:', error);
            next();
        });
    // await firebase.auth()
    //     .signInWithCustomToken(custom_token)
    //     .catch(function (err) {
    //         console.error('Error creating custom token:', err);
    //         next();
    //     });
    // return firebase.auth().currentUser.getIdToken(/* forceRefresh */ true)
    //     .then(function(idToken) {
    //         // Session login endpoint is queried and the session cookie is set.
    //         // CSRF protection should be taken into account.
    //         // ...
    //         const expiresIn = 60 * 60 * 1 * 1 * 1000;
    //         // Create the session cookie. This will also verify the ID token in the process.
    //         // The session cookie will have the same claims as the ID token.
    //         // To only allow session cookie setting on recent sign-in, auth_time in ID token
    //         // can be checked to ensure user was recently signed in before creating a session cookie.
    //         return admin.auth().createSessionCookie(idToken, {expiresIn})
    //             .then((sessionCookie) => {
    //                 // Set cookie policy for session cookie.
    //                 const options = {maxAge: expiresIn, httpOnly: true, secure: true};
    //                 ctx.cookies.set('session', sessionCookie, options);
    //                 console.log('session cookie', sessionCookie);
    //                 ctx.redirect(`https://login.lifo.ai/login/?idToken=${idToken}`);
    //
    //                 ctx.set('Authorization', idToken);
    //                 ctx.set('Content-Type', 'application/json')
    //                 return ctx;
    //             }).catch( error => {
    //                 ctx.status = 401;
    //                 next();
    //             });
    //     })
    //     .catch(function(error) {
    //         // Handle error
    //         console.error('Error redirecting:', error);
    //         next();
    //     });
};

module.exports = getFirebaseAuth;