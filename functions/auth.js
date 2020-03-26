const functions = require('firebase-functions');

exports.regiserUser = functions.auth.user().onCreate(async (user) => {
  // send welcome email to users when signed up using Auth
  const email = user.email; // The email of the user.
  const uid = user.uid
  const displayName = user.displayName; // The display name of the user.

  var influencerProfile = {
        contacts: email,
        name: displayName,
        uid: uid,
        profile_picture: user.photoURL
    };

    db.collection("influencers").doc(uid)
    .set(docData)
    .then(function() {
        console.log("Document successfully written!");
        return null
    })
    .catch(function(error) {
        console.log('Document creation failed', docData);
    })
});

