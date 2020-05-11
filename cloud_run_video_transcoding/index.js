const express = require('express');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());

const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://influencer-272204.firebaseio.com',
});


// middleware for token verification
app.use((req, res, next) => {
    if (req.path.startsWith('/share')){
        return next();
    }

    // idToken comes from the client
    if (!req.headers.authorization) {
        return res.status(403).json({ error: 'No credentials sent!' });
    }
    const idToken = req.headers.authorization;
    console.log('got id token', idToken);
    admin.auth().verifyIdToken(idToken)
        .then((decodedToken) => {
            const uid = decodedToken.uid;
            res.locals.uid = uid;
            console.log('received uid', uid);
            next();
            return decodedToken;
        })
        .catch(next);
});


const content = require('./content');

app.post('/transcode_gcs', (req, res, next) => {
    console.log('Video transcoder received a request', req.body);
    data = req.body;
    const uid = res.locals.uid;
    content.handleTranscodingRequestGcs(data)
        .then(result => {
            res.status(200).send('{"status" : "OK"}');
            return result;
        })
        .catch(next);
});


// to be deprecated
app.get('/get_video_meta/name/:name', (req, res, next) => {
    const uid = res.locals.uid;
    const video_meta = content.getVideoMeta(req.params);
    video_meta
        .then(doc => {
            if (!doc.exists) {
                console.log('No such video!');
                return {};
            }
            console.log('video meta data:', doc.data());
            res.status(200).send(doc.data());
            return doc.data();
        })
        .catch(next);
});


// to be deprecated
app.get('/get_image_meta/name/:name', (req, res, next) => {
    const uid = res.locals.uid;
    const image_meta = content.getImageMeta(req.params);
    image_meta
        .then(doc => {
            if (!doc.exists) {
                console.log('No such image!');
                res.status(400).send({});
                return {};
            }
            console.log('Image meta data:', doc.data());
            res.status(200).send(doc.data());
            return doc.data();
        })
        .catch(next);
});

app.get('/get_content_meta/name/:name', (req, res, next) => {
    const uid = res.locals.uid;
    const content_meta = content.getContentMeta(req.params);
    content_meta
        .then(doc => {
            if (!doc.exists) {
                console.log('No such content!');
                res.status(400).send({});
                return {};
            }
            console.log('Content meta data:', doc.data());
            res.status(200).send(doc.data());
            return doc.data();
        })
        .catch(next);
});


app.get('/share/get_content_meta/name/:name', (req, res, next) => {
    const content_meta = content.getContentMeta(req.params, 'no_uid');
    content_meta
        .then(doc => {
            if (!doc.exists) {
                console.log('No such content!');
                res.status(400).send({});
                return {};
            }
            console.log('Content meta data:', doc.data());
            res.status(200).send(doc.data());
            return doc.data();
        })
        .catch(next);
});


app.delete('/delete_content_meta/name/:name', (req, res, next) => {
    const uid = res.locals.uid;
    console.log('Receiving content path', req.params.name);
    return content.deleteContentMeta(req.params, uid)
        .then(result => {
            console.log('Delete completed.');
            res.status(200).send('{"status" : "OK"}');
            return result;
        })
        .catch(next);
});


app.post('/add_content_text_meta', (req, res, next) => {
    console.log('/add_content_text_meta received a request', req.body);
    const data = req.body;
    const uid = res.locals.uid;
    console.log('incoming uid is ', res.locals.uid);
    return content.addContentTextMeta(data, uid)
        .then(result => {
            res.status(200).send('{"status" : "OK"}');
            return result;
        })
        .catch(next);
})


app.put('/update_content_text_meta', (req, res, next) => {
    console.log('/update_content_text_meta received a request', req.body);
    const data = req.body;
    const uid = res.locals.uid;
    console.log('incoming uid is ', res.locals.uid);
    return content.updateContentTextMeta(data, uid)
        .then(result => {
            res.status(200).send('{"status" : "OK"}');
            return result;
        })
        .catch(next);
});


app.use((err, req, res, next) => {
    // handle error
    console.error(err.stack);
    res.status(400).send('Error from nodejs api server.');
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log('Video transcoder listening on port', port);
});

