const express = require('express');
const app = express();
app.use(express.json());

const admin = require('firebase-admin');
admin.initializeApp();

const content = require('./content');

app.post('/transcode_gcs', (req, res) => {
    console.log('Video transcoder received a request', req.body);
    data = req.body;
    return content.handleTranscodingRequestGcs(data);
});

app.get('/get_video_meta', (req, res) => {
    const video_meta = content.getVideoMeta(req.body);
    console.log('Retrieved video meta data', video_meta);
    return res.send(video_meta);
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log('Video transcoder listening on port', port);
});

