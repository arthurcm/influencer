const express = require('express');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());

const admin = require('firebase-admin');
admin.initializeApp();

const content = require('./content');

app.post('/transcode_gcs', (req, res) => {
    console.log('Video transcoder received a request', req.body);
    data = req.body;
    content.handleTranscodingRequestGcs(data)
        .then(result => {
            res.send('Transcoding finished');
            return result;
        })
        .catch(err => {
            console.error('Transcoding err', err);
            res.send(err);
            return err;
        });
});

app.get('/get_video_meta/name/:name', (req, res) => {
    const video_meta = content.getVideoMeta(req.params);
    video_meta.then(doc => {
        if (!doc.exists) {
            console.log('No such video!');
            return {};
        }
        console.log('video meta data:', doc.data());
        res.send(doc.data());
        return doc.data();
    })
        .catch(err => {
            console.log('Error getting video meta information');
            res.send(err);
            return err;
        });
});

app.get('/get_image_meta/name/:name', (req, res) => {
    const image_meta = content.getImageMeta(req.params);
    image_meta.then(doc => {
        if (!doc.exists) {
            console.log('No such image!');
            return {};
        }
        console.log('Image meta data:', doc.data());
        res.send(doc.data());
        return doc.data();
    })
        .catch(err => {
            console.log('Error getting image meta information');
            res.send(err);
            return err;
        });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log('Video transcoder listening on port', port);
});

