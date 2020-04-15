const admin = require('firebase-admin');
const db = admin.firestore();

const util = require('util');
const ffprobe = require('ffprobe');
const ffprobeStatic = require('ffprobe-static');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
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

// get video dimension from local file
async function getVideoDimension(filePath) {
    // const dimensions = await getDimensions(filePath);
    // console.log(dimensions.width);
    // console.log(dimensions.height);
    let width = 0;
    let height = 0;
    await ffprobe(filePath, { path: ffprobeStatic.path })
        .then(function (info) {
            console.log(info);
            width = info.streams[0].width;
            height = info.streams[0].height;
        })
        .catch(function (err) {
            console.error(err);
        });
    return {
        width,
        height,
    };
}

async function getVideoScale(filePath) {
    // The following heights are recommended Youtube resoltuions
    const standardHeights = [2160, 1440, 1080, 720, 480, 360];
    const dimensions = await getVideoDimension(filePath);
    console.log('video width', dimensions.width, 'height', dimensions.height);
    let finalHeight = standardHeights[5];
    for (let i =0; i< standardHeights.length; i++) {
        if (dimensions.height >= standardHeights[i]) {
            finalHeight = standardHeights[i];
            break;
        }
    }
    console.log('Adjusting resoltuion to', finalHeight, 'p');
    return finalHeight;
}

async function downloadVideoGCS(bucketPath, filePath, tempLocalFile){
    const bucket = admin.storage().bucket(bucketPath);
    await bucket.file(filePath).download({destination: tempLocalFile})
        .then(() => {
            console.log('The file has been downloaded to', tempLocalFile);
            return;
        })
        .catch(err => {
            console.log('failed to download', err);
            throw err;
        });
}


async function ffmpeg_transcode(parsedTokens, outputpath, tempLocalFile, bucketPath, filePath){
    await downloadVideoGCS(bucketPath, filePath, tempLocalFile);
    const final_height = await getVideoScale(tempLocalFile);
    const video_scale_options = util.format('-filter:v scale=%s:-1', String(finalHeight));
    console.log('Using scale option', video_scale_options);

    // the options here are recommened settings by Youtube
    // https://gist.github.com/mikoim/27e4e0dc64e384adbcb91ff10a2d3678
    const cmd = ffmpeg()
        .input(tempLocalFile)
        .outputOptions('-c:v libx264')
        .outputOptions('-preset slow')
        .outputOptions('-profile:v high')
        .outputOptions('-crf 18')
        .outputOptions('-coder 1')
        .outputOptions('-pix_fmt yuv420p')
        .outputOptions('-movflags faststart')
        .outputOptions('-g 30')
        .outputOptions('-bf 2')
        .outputOptions('-c:a aac')
        .outputOptions('-b:a 384k')
        .outputOptions('-profile:a aac_low')
        .outputOptions(video_scale_options)
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

module.exports = {
    handleTranscodingRequestGcs(data) {
        if (!data.contentType.startsWith('video/')) {
            return 'Not video, skip transcoding.';
        }
        const filePath = data.name;
        console.log('incoming file', filePath);
        const parsedTokens = uriParse(filePath);

        const baseFileName = `${path.basename(filePath, path.extname(filePath))}.mov`;
        const tempLocalFile = path.join(os.tmpdir(), baseFileName);
        console.log('downloading file', filePath, 'from', data.bucket, 'to', tempLocalFile);
        // Need update here!!!
        // Need update here!!!
        // Need update here!!!
        const outputpath = tempLocalFile.replace('.mov', '.mp4');

        // Transcode
        return ffmpeg_transcode(parsedTokens, outputpath, tempLocalFile, data.bucket, filePath);
    },
};
