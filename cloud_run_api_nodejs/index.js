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

const campaign = require('./campaign');

app.post('/create_campaign', (req, res, next) => {
    console.log('/create_campaign received a request', req.body);
    const data = req.body;
    const uid = res.locals.uid;
    console.log('incoming uid is ', res.locals.uid);
    return campaign.createCampaign(data, uid)
        .then(result => {
            res.status(200).send(result.toString());
            return result;
        })
        .catch(next);
});

app.get('/get_campaign/campaign_id/:campaign_id', (req, res, next) => {
    const uid = res.locals.uid;
    const campaign_id = req.params.campaign_id;
    console.log('Receiving campaign id', campaign_id);
    if(!campaign_id){
        res.status(400).send('Have to have a valid campaign_id');
    }
    return campaign.getCampaign(req.params, uid, res)
        .then(result => {
            res.status(200).send(result.toString());
            return result;
        })
        .catch(next);
});

app.get('/get_campaign', (req, res, next) => {
    const uid = res.locals.uid;
    return campaign.getAllCampaign(uid)
        .then(result => {
            res.status(200).send(result);
            return result;
        })
        .catch(next);
});

app.delete('/delete_campaign/campaign_id/:campaign_id', (req, res, next) => {
    const uid = res.locals.uid;
    console.log('Receiving campaign id', req.params.campaign_id);
    return campaign.deleteCampaign(req.params, uid)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send(result.toString());
            return result;
        })
        .catch(next);
});

app.put('/feedback/campaign_id/:campaign_id/history_id/:history_id', (req, res, next) => {
    const campaign_id = req.params.campaign_id;
    const history_id = req.params.history_id;
    const uid = res.locals.uid;
    console.log('Receiving campaign id', campaign_id, 'and history id', history_id);
    if(!campaign_id){
        res.status(400).send('Require a valid campaign_id');
    }
    if(!history_id){
        res.status(400).send('Require a valid history_id');
    }
    return campaign.feedback(req.body, uid, campaign_id, history_id)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send(result.toString());
            return result;
        })
        .catch(next);
});

app.put('/finalize_campaign/campaign_id/:campaign_id/history_id/:history_id', (req, res, next) => {
    const campaign_id = req.params.campaign_id;
    const history_id = req.params.history_id;
    const uid = res.locals.uid;
    console.log('Receiving campaign id', campaign_id, 'and history id', history_id);
    if(!campaign_id){
        res.status(400).send('Require a valid campaign_id');
    }
    if(!history_id){
        res.status(400).send('Require a valid history_id');
    }
    return campaign.finalizeCampaign(uid, campaign_id, history_id)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send(result.toString());
            return result;
        })
        .catch(next);
});

app.put('/finalize_media_draft/campaign_id/:campaign_id/history_id/:history_id', (req, res, next) => {
    const campaign_id = req.params.campaign_id;
    const history_id = req.params.history_id;
    const uid = res.locals.uid;
    console.log('Receiving campaign id', campaign_id, 'and history id', history_id);
    if(!campaign_id){
        res.status(400).send('Require a valid campaign_id');
    }
    if(!history_id){
        res.status(400).send('Require a valid history_id');
    }
    return campaign.finalizeVideoDraft(uid, campaign_id, history_id)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send(result.toString());
            return result;
        })
        .catch(next);
});


app.post('/create_feedback_thread', (req, res, next)=>{
    console.log('/create_feedback_thread received a request', req.body);
    const data = req.body;
    const uid = res.locals.uid;
    console.log('incoming uid is ', res.locals.uid);
    return campaign.createFeedbackThread(data, uid)
        .then(result => {
            res.status(200).send(result.toString());
            return result;
        })
        .catch(next);
});

app.get('/get_threads/media_object_path/:media_object_path', async (req, res, next) => {
    const uid = res.locals.uid;
    console.log('receiving', req.params.media_object_path);
    return campaign.getAllThreads(req.params, uid)
        .then(result => {
            console.log('Transaction completed.');
            return Promise.all(result).then(values => {
                res.status(200).send(values);
                return results;
            });
        })
        .catch(next);
});

app.post('/reply_feedback_thread', (req, res, next)=>{
    console.log('/reply_feedback_thread received a request', req.body);
    const data = req.body;
    const uid = res.locals.uid;
    console.log('incoming uid is ', res.locals.uid);
    return campaign.replyToFeedbackThread(data, uid)
        .then(result => {
            res.status(200).send(result.toString());
            return result;
        })
        .catch(next);
});

app.delete('/delete_thread/media_object_path/:media_object_path/thread_id/:thread_id', (req, res, next) => {
    const uid = res.locals.uid;
    console.log('Receiving thread_id', req.params.thread_id);
    return campaign.deleteThread(req.params, uid)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send(result.toString());
            return result;
        })
        .catch(next);
});

app.put('/resolve_thread/media_object_path/:media_object_path/thread_id/:thread_id', (req, res, next) => {
    const media_object_path = req.params.media_object_path;
    const thread_id = req.params.thread_id;
    const uid = res.locals.uid;
    console.log('Receiving media_object_path', media_object_path, 'and thread_id', thread_id);
    if(!thread_id){
        res.status(400).send('Require a valid thread_id');
    }
    if(!media_object_path){
        res.status(400).send('Require a valid media_object_path');
    }
    return campaign.resolveThread(media_object_path, thread_id)
        .then(result => {
            console.log('Transaction completed.');
            res.status(200).send(result.toString());
            return result;
        })
        .catch(next);
});


app.use((err, req, res, next) => {
    // handle error
    console.error(err.stack);
    res.status(500).send('Error from nodejs api server.');
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log('Nodejs API server listening on port', port);
});

