const express = require('express');
const app = express();
app.use(express.json());

const admin = require('firebase-admin');
admin.initializeApp();

const content = require('./content');

app.post('/transcode_gcs', (req, res) => {
    console.log('Video transcoder received a request', req.body);
    data = req.body.data;
    return content.handleTranscodingRequestGcs(data);
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log('Video transcoder listening on port', port);
});

