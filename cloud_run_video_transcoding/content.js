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
const rimraf = require('rimraf');

const BUCKET_NAME = 'gs://influencer-272204.appspot.com/';
const bucket = admin.storage().bucket(BUCKET_NAME);

async function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}

function uriParse(file_name){
    const tokens = file_name.split('/');
    return {
        uid: tokens[1],
        campaign_id: tokens[2],
        history_id: tokens[3],
        file_name: tokens[4],
    };
}


async function firestore_callback(campaign_id, history_id, transcodeLocalPath, tempLocalFile, uploadPathName){
    const CHUNK_SIZE = 200000; // each doc has to be below 1MB
    const stat = fs.statSync(transcodeLocalPath);
    const fileSize = stat.size;
    console.log('after transcoding, file size is', fileSize);
    // const NUM_CHUNKS = Math.ceil(fileSize / CHUNK_SIZE);
    //
    // const videoTransRef = db.collection('campaigns').doc(campaign_id)
    //     .collection('campaignHistory').doc(history_id)
    //     .collection('videoTrans');
    // const batch = db.batch();
    //
    // // Slice the video into NUM_CHUNKS and append each to the media element.
    // for (let i = 0; i < NUM_CHUNKS; ++i) {
    //     const startByte = CHUNK_SIZE * i;
    //     const fileChunkStr = fs.createReadStream(transcodeLocalPath, {start:startByte, end:startByte+CHUNK_SIZE});
    //     const curChunkStr = await streamToString(fileChunkStr);  // eslint-disable-line no-await-in-loop
    //     console.log('processing chunk:', i);
    //     const vtDocRef = videoTransRef.doc(String(i));
    //     batch.set(vtDocRef, {video_transcoding:curChunkStr});
    // }
    // const resPromise = batch.commit();

    // upload the transcoded file to appropriate path.
    return uploadVideoGCS(uploadPathName, transcodeLocalPath);
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
    console.log('Adjusting resolution to', finalHeight, 'p');
    return finalHeight;
}

async function downloadVideoGCS(filePath, tempLocalFile){
    await bucket.file(filePath).download({destination: tempLocalFile})
        .then(() => {
            console.log('The file has been downloaded to', tempLocalFile);
            return 'Success!';
        })
        .catch(err => {
            console.log('failed to download', err);
            throw err;
        });
}

async function uploadVideoGCS(filePath, tempLocalFile){
    await bucket.upload(tempLocalFile, {destination: filePath})
        .then(() => {
            console.log('The file has been uploaded to', filePath);
            return 'Success!';
        })
        .catch(err => {
            console.log('failed to download', err);
            throw err;
        });
}


async function ffmpeg_transcode(filePath){

    // The following is to handle the auth, campaign id, and history id parsing.
    let parsedTokens = [];
    try {
        parsedTokens = uriParse(filePath);
    }catch (e) {
        console.error(('Parsing error', filePath));
        throw new Error('Parsing error');
    }

    // this baseName does not have suffix
    const baseFileName = `${path.basename(filePath, path.extname(filePath))}`;
    const outputFileName = baseFileName.concat('_transcoded.mp4');

    // this is the bucket path to the input data. Will be used to generate output path etc.
    const bucketPath = path.dirname(filePath);
    // rimraf.sync(path.join(os.tmpdir(), 'video'));

    // this is temp local cache to download the incoming file
    const tempLocalFilePathNosuffix = path.join(os.tmpdir(), baseFileName);
    const tempLocalFilePath = tempLocalFilePathNosuffix.concat(path.extname(filePath));
    console.log('Downloading file', filePath, 'from', BUCKET_NAME, 'to', tempLocalFilePath);
    const transcodeLocalPath =  path.join(os.tmpdir(), outputFileName);
    console.log('The file will be converted and stored temporarily at', transcodeLocalPath, 'and uploaded to', bucketPath);

    await downloadVideoGCS(filePath, tempLocalFilePath);
    const finalHeight = await getVideoScale(tempLocalFilePath);
    const video_scale_options = util.format('-filter:v scale=-2:%s', String(finalHeight));
    console.log('Using scale option', video_scale_options);
    const uploadPathName = path.join(bucketPath, String(finalHeight).concat('p'), outputFileName);

    // the options here are recommended settings by Youtube
    // https://gist.github.com/mikoim/27e4e0dc64e384adbcb91ff10a2d3678
    const cmd = ffmpeg()
        .input(tempLocalFilePath)
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
        console.error('An error occurred during encoding', err.message);
        console.error('stdout:', stdout);
        console.error('stderr:', stderr);
        cmd.kill('SIGSTOP');
    })
        .format('mp4')
        .output(transcodeLocalPath)
        // .output(remoteWriteStream, { end:true })
        .on('end', () => {
            console.log('Successfully re-encoded video.');
            promiseList.push(
                firestore_callback(parsedTokens.campaign_id, parsedTokens.history_id, transcodeLocalPath,
                                   tempLocalFilePath, uploadPathName));
        })
        .run(); // as mp4 requires a seekable output (it needs to go back after having written the video file to write the file header).
    createVideoMeta(filePath, true, finalHeight, uploadPathName);
    try {
        // fs.unlinkSync(transcodeLocalPath);
        // fs.unlinkSync(tempLocalFilePath);
    } catch(err) {
        console.error(err);
    }
    return promiseList[0];
}


// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
function retrieveVideoMetaRef(filePath){
    // The following is to handle the auth, campaign id, and history id parsing.
    return retrieveMediaMetaRef(filePath, 'videos');
}

// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
function retrieveImageMetaRef(filePath){
    // The following is to handle the auth, campaign id, and history id parsing.
    return retrieveMediaMetaRef(filePath, 'images');
}

// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
function retrieveMediaMetaRef(filePath, mediaType){
    // mediaType has to be one of "videos", "images"
    // The following is to handle the auth, campaign id, and history id parsing.
    if(mediaType !== 'videos' && mediaType !== 'images'){
        throw new Error('Currently only support videos or images as mediaType');
    }
    let parsedTokens = [];
    try {
        parsedTokens = uriParse(filePath);
    }catch (e) {
        console.error(('Parsing error', filePath));
        throw new Error('Parsing error for uri:'.concat(filePath));
    }
    const campaign_id = parsedTokens.campaign_id;

    // here we will use the campaign history_id to identify unique video versions.
    const video_id = parsedTokens.history_id;
    return db.collection('campaigns').doc(campaign_id)
        .collection(mediaType).doc(video_id);
}

function createVideoMeta(filePath, transcoded, resolution_height, uploadPathName) {
    const video_ref = retrieveVideoMetaRef(filePath);
    return video_ref
        .set({
            uri: filePath,
            transcoded: Boolean(transcoded),
            resolution_height: Number(resolution_height),
            transcoded_path: String(uploadPathName),
        }, {merge: true})
        .catch(err => {
            console.log('Error getting video meta information');
            return err;
        });
}
function getVideoMetaInternal(filePath) {
    const video_ref = retrieveVideoMetaRef(filePath);
    return video_ref.get();
}


// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
// this is copy-pasted to cloud_run_api_nodejs, make sure update both when change the following.
function retrieveSingleImageMetaRef(filePath) {
    const image_ref = retrieveImageMetaRef(filePath);
    const tokens = uriParse(filePath);
    const file_name = tokens.file_name;
    return image_ref.collection('single_image').doc(file_name);
}


function getImageMetaInternal(filePath) {
    return retrieveImageMetaRef(filePath).get();
}

module.exports = {
    async handleTranscodingRequestGcs(data) {
        if (!data.contentType){
            throw new Error('ContentType needs to be video/.');
        }
        if (data.contentType && !data.contentType.startsWith('video/')) {
            throw new Error('Not video, skip transcoding.');
        }
        const filePath = data.name;
        // const skip_transcode = data.skip_transcode;
        console.log('incoming file', filePath);
        return ffmpeg_transcode(filePath);
    },
    async getVideoMeta(data) {
        if(!data.name || !data.name.startsWith('video/')){
            console.log('Receiving incoming data', data);
            throw new Error('Request needs to have data object with name field');
        }
        console.log('Get video meta data in firestore for', data);
        const filePath = data.name;

        // Transcode
        return getVideoMetaInternal(filePath);
    },
    async getImageMeta(data) {
        if(!data.name || !data.name.startsWith('image/')){
            console.log('Receiving incoming data', data);
            throw new Error('Request needs to have data object with name field');
        }
        const filePath = data.name;
        console.log('Get single image meta data for ', filePath);
        return getImageMetaInternal(filePath);
    },
    retrieveImageMetaRef,
    retrieveVideoMetaRef,
};

