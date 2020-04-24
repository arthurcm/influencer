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
    return content.handleTranscodingRequestGcs(data);
});

app.get('/get_video_meta/name/:name', (req, res) => {
    const video_meta = content.getVideoMeta(req.params);
    console.log('Retrieved video meta data', video_meta);
    return res.send(video_meta);
});

app.get('/get_image_meta/name/:name', (req, res) => {
    const image_meta = content.getImageMeta(req.params);
    console.log('Retrieved image meta data', image_meta);
    return res.send(image_meta);
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log('Video transcoder listening on port', port);
});

