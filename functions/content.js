
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore();

// const {Storage} = require('@google-cloud/storage');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const mkdirp = require('mkdirp-promise');

const transcodedBucket = admin.storage().bucket('video');
const uploadBucket = admin.storage().bucket('video');
ffmpeg.setFfmpegPath(ffmpegPath);

const path = require('path');
const os = require('os');
const fs = require('fs');

async function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}

const runtimeOpts = {
    timeoutSeconds: 300,
    memory: '2GB',
};


function uriParse(video_name){
    const tokens = video_name.split('/');
    return {
        uid: tokens[1],
        campaign_id: tokens[2],
        history_id: tokens[3],
    };
}


async function firestore_callback(campaign_id, history_id, outputpath, tempLocalFile){
    const CHUNK_SIZE = 200000; // each doc has to be below 1MB
    const stat = fs.statSync(outputpath);
    const fileSize = stat.size;
    console.log('after transcoding, file size is', fileSize);
    const NUM_CHUNKS = Math.ceil(fileSize / CHUNK_SIZE);

    const videoTransRef = db.collection('campaigns').doc(campaign_id)
        .collection('campaignHistory').doc(history_id)
        .collection('videoTrans');
    const batch = db.batch();

    // Slice the video into NUM_CHUNKS and append each to the media element.
    for (let i = 0; i < NUM_CHUNKS; ++i) {
        const startByte = CHUNK_SIZE * i;
        const fileChunkStrean = fs.createReadStream(outputpath, {start:startByte, end:startByte+CHUNK_SIZE});
        const curChunkStr = await streamToString(fileChunkStrean);  // eslint-disable-line no-await-in-loop
        console.log('processing chunk:', i);
        const vtDocRef = videoTransRef.doc(String(i));
        batch.set(vtDocRef, {video_transcoding:curChunkStr});
    }
    const resPromise = batch.commit();
    fs.unlinkSync(outputpath);
    fs.unlinkSync(tempLocalFile);
    return resPromise;
}

async function ffmpeg_transcode(parsedTokens, outputpath, tempLocalFile, bucket, filePath){
    await bucket.file(filePath).download({destination: tempLocalFile})
        .then(() => {
            console.log('The file has been downloaded to', tempLocalFile);
            return;
        })
        .catch(err => {
            console.log('failed to download', err);
            throw err;
        });
    const cmd = ffmpeg()
        .input(tempLocalFile)
        .outputOptions('-c:v h264') // Change these options to whatever suits your needs
        .size('640x480')
        // .videoBitrate('64k')
    // .outputOptions('-b:a 32k')
        .outputOptions('-f mp4')
        .outputOptions('-preset:v ultrafast')
        .outputOptions('-movflags frag_keyframe+empty_moov')
    // // https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/346#issuecomment-67299526
        .on('start', (cmdLine) => {
            console.log('Started ffmpeg with command:', cmdLine);
        });

    const promiseList = [];
    cmd.on('error', (err, stdout, stderr) => {
        console.error('An error occured during encoding', err.message);
        console.error('stdout:', stdout);
        console.error('stderr:', stderr);
        cmd.kill('SIGSTOP');
    })
        .format('mp4')
        .output(outputpath)
        // .output(remoteWriteStream, { end:true })
        .on('end', () => {
            console.log('Successfully re-encoded video.');
            promiseList.push(firestore_callback(parsedTokens.campaign_id, parsedTokens.history_id, outputpath, tempLocalFile));
        })
        .run(); // as mp4 requires a seekable output (it needs to go back after having written the video file to write the file header).
    return promiseList[0];
}

exports.transcodeVideo = functions.runWith(runtimeOpts).storage.object('video').onFinalize(async (object) => {
    if(!object.contentType.startsWith('video/')){
        return 'Not video, skip transcoding.';
    }
    const filePath = object.name;
    console.log('incoming file', filePath);
    const parsedTokens = uriParse(filePath);

    const baseFileName = `${path.basename(filePath, path.extname(filePath)) }.mov`;
    const tempLocalFile = path.join(os.tmpdir(), baseFileName);

    const bucket = admin.storage().bucket(object.bucket);
    console.log('downloading file', filePath, 'from', object.bucket, 'to', tempLocalFile);
    const outputpath = tempLocalFile.replace('.mov', '.mp4');
    // Transcode
    ffmpeg_transcode(parsedTokens, outputpath, tempLocalFile, bucket, filePath);
});

exports.transcodeVideoAlter = functions.runWith(runtimeOpts).https.onCall((data, context) => {
    // if(!data.contentType.startsWith('video/')){
    //     return 'Not video, skip transcoding.';
    // }
    const filePath = data.name;
    console.log('incoming file', filePath);
    const parsedTokens = uriParse(filePath);

    const baseFileName = `${path.basename(filePath, path.extname(filePath)) }.mov`;
    const tempLocalFile = path.join(os.tmpdir(), baseFileName);

    const bucket = admin.storage().bucket(data.bucket);
    console.log('downloading file', filePath, 'from', data.bucket, 'to', tempLocalFile);
    const outputpath = tempLocalFile.replace('.mov', '.mp4');

    // Transcode
    return ffmpeg_transcode(parsedTokens, outputpath, tempLocalFile, bucket, filePath);
});
