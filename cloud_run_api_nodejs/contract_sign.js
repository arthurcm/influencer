const HELLO_SIGN_API_KEY = '7c6ad36145d437d07d8158040cb369e319fbe886e8429b414e32a8c26b7011d1';
const HELLO_SIGN_CLIENT_ID = 'ed13bd512148181319db3152c8749516';

const hellosign = require('hellosign-sdk')({ key: HELLO_SIGN_API_KEY });

const protobuf = require('protobufjs');
const functions = require('firebase-functions');

const moment = require('moment');

const contract_pb = require('./proto_gen/contract_pb');
// import {Contract, ContractType} from '/proto_gen/contract_pb';
const campaign = require('./campaign');

const CONTRACTS_COLLECTION_NAME = 'contracts';
const INFLUENCER_ROLE = 'Influencer';
const BRAND_ROLE = 'Brand';
const AM_ROLE = 'AM';
const SENDER_ROLE = 'Sender';

const SIGNATURE_PENDING = 'pending contract signing';
const CONTRACT_SIGNED = 'contract signed';

const admin = require('firebase-admin');
const db = admin.firestore();
const BUCKET_NAME = 'gs://influencer-272204.appspot.com/';
const bucket = admin.storage().bucket(BUCKET_NAME);

// TODO: here we list the first version lifo agreement's template id, in near future, this single template may
// evolve into multiple ones
const contract_type = contract_pb.ContractType.US_FIXED_COMMISSION;
const TEMPLATE_ID = {};
TEMPLATE_ID[contract_type] = 'c90e59dd7b6deebe20f7af643ed43076742a8625';

function timestampToString(ts){
    return moment.unix(ts/1000).format('MM/DD/YYYY');
}

function createContractFromCampaignData(data, campaign_data){
    const contract_proto = new contract_pb.Contract();
    const brand_proto = new contract_pb.Brand();
    brand_proto.shopName = campaign_data.brand;
    const BrandMessage = contract_pb.Brand;
    const platform = campaign_data.extra_info.platform || data.platform || 'instagram';
    const campaign_name = campaign_data.campaign_name || data.campaign_name;
    let start_date = Date.now();
    if(data.start_date){
        start_date = data.start_date;
    }
    const campaignEndDateTs = data.end_time || campaign_data.end_time;
    let campaign_start_date = timestampToString(start_date);
    let campaign_end_date = timestampToString(campaignEndDateTs);
    if(typeof start_date =='string'){
        campaign_start_date = start_date;
        campaign_end_date =  data.end_time;
    }
    const fixed_commission = data.fixed_commission;
    const percentage_commission = data.percentage_commission;
    data.platform = platform;
    data.campaign_name = campaign_name;
    data.brand = campaign_data.brand;
    data.campaign_start_date = campaign_start_date;
    data.campaign_end_date = campaign_end_date;
    data.brand_campaign_id = campaign_data.brand_campaign_id;
    return {
        custom_fields: [
            {name: 'brand', value: campaign_data.brand, editor: SENDER_ROLE, required: true},
            {name: 'shop_address_line1', value: data.shop_address_line1, editor: SENDER_ROLE, required: false},
            {name: 'shop_address_line2', value: data.shop_address_line2, editor: SENDER_ROLE, required: false},
            {name: 'contact_email', value: campaign_data.contact_email, editor: SENDER_ROLE, required: true},
            {name: 'inf_name', value: data.inf_name, editor: SENDER_ROLE, required: true},
            {name: 'influencer_address1', value: data.influencer_address1, editor: SENDER_ROLE, required: false},
            {name: 'influencer_address2', value: data.influencer_address2, editor: SENDER_ROLE, required: false},
            {name: 'inf_email', value: data.inf_email, editor: SENDER_ROLE, required: true},
            {name: 'product_name1', value: data.product_name1, editor: SENDER_ROLE, required: false},
            {name: 'product_name2', value: data.product_name2, editor: SENDER_ROLE, required: false},
            {name: 'platform', value: platform, editor: SENDER_ROLE, required: true},
            {name: 'account_id', value: data.account_id, editor: SENDER_ROLE, required: true},
            {name: 'deliverable1', value: data.deliverable1, editor: SENDER_ROLE, required: true},
            {name: 'deliverable2', value: data.deliverable2, editor: SENDER_ROLE, required: false},
            {name: 'deliverable3', value: data.deliverable3, editor: SENDER_ROLE, required: false},
            {name: 'campaign_name', value: campaign_name, editor: SENDER_ROLE, required: false},
            {name: 'campaign_start_date', value: campaign_start_date, editor: SENDER_ROLE, required: true},
            {name: 'campaign_end_date', value: campaign_end_date, editor: SENDER_ROLE, required: true},
            {name: 'fixed_commission', value: fixed_commission, editor: SENDER_ROLE, required: false},
            {name: 'percentage_commission', value: percentage_commission, editor: SENDER_ROLE, required: false},
            {name: 'product_name1', value: data.product_name1, editor: SENDER_ROLE, required: false},
            {name: 'product_name2', value: data.product_name2, editor: SENDER_ROLE, required: false},
            {name: 'trade_name1', value: data.trade_name1, editor: SENDER_ROLE, required: false},
            {name: 'trade_name2', value: data.trade_name2, editor: SENDER_ROLE, required: false},
            {name: 'trade_name3', value: data.trade_name3, editor: SENDER_ROLE, required: false},
            {name: 'store_state', value: data.store_state, editor: SENDER_ROLE, required: true},
            {name: 'store_county', value: data.store_county, editor: SENDER_ROLE, required: true},
        ],
        data,
    };
};

function prepareSignatureRequestData(data){
    console.info('Retrieving campaign data for ', data.brand_campaign_id);
    return campaign.getBrandCampaignForBrand(data.brand_campaign_id)
        .then(res => {
            const brand_campaign_data = res[0]
            console.info('Found campaign data', brand_campaign_data);
            // TODO: check email address validity
            const shop_email  = brand_campaign_data.contact_email;
            const contact_name = brand_campaign_data.contact_name;

            const inf_email = data.inf_email;
            const inf_name = data.inf_name || data.account_id;

            // currently hardcoded as US_FIXED_COMMISSION type
            let contract_type = null; // data.contract_type;
            if (!contract_type){
                contract_type = contract_pb.ContractType.US_FIXED_COMMISSION;
            }

            console.info('template id dictionary is', TEMPLATE_ID, 'contract type', contract_type);
            const template_id = TEMPLATE_ID[contract_type];
            const brand_contract = createContractFromCampaignData(data, brand_campaign_data);
            const custom_fields = brand_contract.custom_fields;
            const contract_data = brand_contract.data;
            console.log('Got contract data', contract_data);
            const opts = {
                test_mode: data.test_mode || 0,
                clientId: HELLO_SIGN_CLIENT_ID,
                // requester_email_address: 'arthur.meng@lifo.ai',
                template_id,
                subject: 'Lifo brand influencer campaign agreement',
                message: 'Glad we could come to an agreement.',
                signers: [
                    {
                        email_address: 'customer@lifo.ai',
                        name: 'Lifo Inc.',
                        role: SENDER_ROLE,
                    },
                    {
                        email_address: shop_email,
                        name: contact_name,
                        role: BRAND_ROLE,
                    },
                    {
                        email_address: inf_email,
                        name: inf_name,
                        role: INFLUENCER_ROLE,
                    },
                ],
                custom_fields,
            };
            return {
                opts,
                shop_email,
                contract_data,
            };
        });
};

function saveSignatureResponsedata(signature_info, response, brand_campaign_id, inf_email, account_id, shop_email){
    const signature_request_id = signature_info.signature_request_id;
    const signatures = signature_info.signatures;
    const batch = db.batch();
    const save_ref = db.collection(CONTRACTS_COLLECTION_NAME)
        .doc(signature_request_id);
    batch.set(save_ref, {
        signature_request_id,
        brand_campaign_id,
        signatures,
        signature_response: response,
    }, {merge: true});
    const am_signature_id = signatures[0].signature_id;
    const inf_signature_id = findSignatureIdWithEmailAndRole(signatures, inf_email, INFLUENCER_ROLE);
    const brand_signature_id = findSignatureIdWithEmailAndRole(signatures, shop_email, BRAND_ROLE);
    const inf_subcollection_ref = campaign.access_influencer_subcollection(brand_campaign_id)
        .doc(account_id);

    // Here we actually are saving both brand and influencer's signature ids to each influencer's profile.
    // This is mainly due to the fact that each brand-influencer pair determines a particular influencer's status.
    // Both sides need to sign on the contract so that the influencer will get the contract in pdf version.
    batch.set(inf_subcollection_ref, {
        inf_signing_status: SIGNATURE_PENDING,
        brand_signing_status: SIGNATURE_PENDING,
        signature_request_id,
        inf_signature_id,
        brand_signature_id,
    }, {merge: true});
    return {
        am_signature_id,
        save_promise: batch.commit(),
        signature_request_id,
        signatures,
        inf_signature_id,
        brand_signature_id,
    };
};

function findSignatureIdWithEmailAndRole(signatures, email, role){
    let signature_id = null;
    for (let i=0;i < signatures.length; i++){
        const signature = signatures[i];
        console.debug('Current signature is', signature, ' and signer email is ', email);
        if(signature.signer_email_address === email && signature.signer_role === role){
            console.debug('Found proper signer using email', email, 'with name', signature.signer_name);
            signature_id = signature.signature_id;
            break;
        }
    }
    return signature_id;
}

function getSignatureIDNew(brand_campaign_id, inf_email, cur_role){
    return campaign.access_influencer_subcollection(brand_campaign_id)
        .where('email', '==', inf_email)
        .get()
        .then(snapshot => {
            let signature_id = null;
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                console.info('found contract data', data);
                if (cur_role === BRAND_ROLE) {
                    signature_id = data.brand_signature_id;
                } else {
                    signature_id = data.inf_signature_id;
                }
                console.info('found signature id for', inf_email, ' id is ', signature_id);
                return signature_id;
            });
            return signature_id;
        });
};

function signatureRequest(data){
    return prepareSignatureRequestData(data)
        .then(async results => {
            const opts = results.opts;
            const shop_email = results.shop_email;
            const contract_data = results.contract_data;
            const inf_subcollection_ref = campaign.access_influencer_subcollection(contract_data.brand_campaign_id)
                .doc(contract_data.account_id);
            const contract_promise = inf_subcollection_ref.set({contract_data}, {merge:true});
            console.debug('Signature request options are:', opts, 'and shop email', shop_email);
            const response = await hellosign.signatureRequest.createEmbeddedWithTemplate(opts);
            return {
                response,
                shop_email,
                contract_promise,
            };
        })
        .then(results => {
            const response = results.response;
            const shop_email = results.shop_email;
            console.debug('signature response is', response);
            const signature_info = response.signature_request;
            return saveSignatureResponsedata(signature_info, response, data.brand_campaign_id, data.inf_email, data.account_id, shop_email);
        })
        .then(results => {
            const am_signature_id = results.am_signature_id;
            if(!am_signature_id){
                return new functions.https.HttpsError('failed-precondition', 'AM signature not found.');
            }
            return hellosign.embedded.getSignUrl(am_signature_id);
        });
};

// // TODO: add influencer details here.
// function previewRequest(data){
//     if (!data.brand_campaign_id) {
//         return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
//             'with a specific brand_campaign_id.');
//     }
//     return prepareSignatureRequestData(data)
//         .then(opts => {
//             console.debug('Receiving opts', opts);
//             return hellosign.unclaimedDraft.createEmbeddedWithTemplate(opts);
//         })
//         .then(response => {
//             console.debug('signature response is', response);
//             const signature_info = response.unclaimed_draft;
//             return saveSignatureResponsedata(signature_info, response, data.brand_campaign_id);
//         });
// };

function getAllContractsBrand(brand_campaign_id){
    return db.collection(CONTRACTS_COLLECTION_NAME)
        .where('brand_campaign_id', '==', brand_campaign_id)
        .get()
        .then(snapshot =>{
            const contract_ids = [];
            snapshot.docs.forEach(doc => {
                const doc_snap = doc.data();
                contract_ids.push(doc_snap.signature_request_id);
            });
            console.info(`Found ${contract_ids.length} contracts for campaign ${brand_campaign_id}`);
            return contract_ids;
        });
};

function getEmbeddedSignUrl(brand_campaign_id, inf_email, role){
    return getSignatureIDNew(brand_campaign_id, inf_email, role)
        .then(signature_id =>{
            if(!signature_id){
                return new functions.https.HttpsError('failed-precondition', 'signature not found.');
            }
            return hellosign.embedded.getSignUrl(signature_id);
        });
};

function getSignedContract(signature_request_id){
    const fs = require('fs');
    return hellosign.signatureRequest.download(signature_request_id, { file_type: 'pdf' }, (err, res) => {
        console.log('error message is:', err, 'and response is', res);
        const file_path = `${signature_request_id}.pdf`;
        const remote_path = `/contract/${signature_request_id}/${file_path}`;
        const file = fs.createWriteStream(file_path);
        res.pipe(file);
        return file.on('finish', () => {
            file.close();
            return bucket.upload(file_path, {destination: remote_path})
                .then(() => {
                    console.log('The file has been uploaded to', remote_path);
                    return true;
                })
                .catch(err => {
                    console.log('failed to download', err);
                    throw err;
                });
        });
    });
}

async function create_campaign_for_inf(brand_campaign_id, account_id) {
    const inf_ref = campaign.access_influencer_subcollection(brand_campaign_id).doc(account_id);
    let contract_data = null;
    await inf_ref.get()
        .then(snapshot => {
            if (snapshot) {
                contract_data = snapshot.data().contract_data;
            }
            return contract_data;
        });
    const brand_campaigns_ref = db.collection(campaign.BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id);
    return brand_campaigns_ref.get()
        .then((snapshot) => {
            const brand_campaign_data = snapshot.data();

            // Logic is the same as signupToBrandCampaign() which is to be deprecated.
            // this section handles the influencers for brand side of the campaign.
            let collaborating_influencers = brand_campaign_data.collaborating_influencers;
            if (!collaborating_influencers) {
                collaborating_influencers = [];
            } else if(collaborating_influencers.includes(account_id)) {
                console.debug('Influencer has already signed up');
                return null;
            }
            collaborating_influencers.push(account_id);
            const uniq_inf = [...new Set(collaborating_influencers)];
            // brand_campaign_data.collaborating_influencers = uniq;
            // brand_campaign_data.commission_percentage = contract_data.percentage_commission;
            // brand_campaign_data.commission_dollar = contract_data.fixed_commission;
            console.info('Creating new campaign using data', brand_campaign_data);
            const results = campaign.createCampaign(brand_campaign_data, account_id, false);

            const batch = results.batch_promise;

            // unique influencers are only updated to brand side campaign and not influencer side.
            batch.set(brand_campaigns_ref, {collaborating_influencers: uniq_inf}, {merge: true});

            // when influencers sign up to a campaign, save the influencer campaign id pairs.
            let inf_campaign_dict = brand_campaign_data.inf_campaign;
            if (!inf_campaign_dict) {
                inf_campaign_dict = {};
            }
            inf_campaign_dict[account_id] = results.campaign_id;
            batch.set(brand_campaigns_ref, {inf_campaign_dict}, {merge: true});

            // This is to update inf campaign id
            campaign.access_influencer_subcollection(brand_campaign_id)
                .doc(account_id)
                .update({
                    inf_campaign_id: results.campaign_id,
                });
            return batch;
        });
}

async function signature_complete(brand_campaign_id, signature_id, is_brand){
    let signature_id_field_name = 'inf_signature_id';
    if(is_brand){
        signature_id_field_name = 'brand_signature_id';
    }
    let inf_doc_id = null;
    await campaign.access_influencer_subcollection(brand_campaign_id)
        .where(signature_id_field_name, '==', signature_id)
        .get()
        .then(querySnapshot => {
            querySnapshot.docs.forEach(doc => {
                console.debug('found doc id', doc.id);
                inf_doc_id = doc.id;
            });
            return inf_doc_id;
        });
    console.debug('found influencer id', inf_doc_id);
    if(!inf_doc_id){
        throw new functions.https.HttpsError('not-found', 'the signature id is not found!');
    }
    const inf_ref = campaign.access_influencer_subcollection(brand_campaign_id).doc(inf_doc_id);
    if (is_brand) {
        return inf_ref.update({
            brand_signing_status: CONTRACT_SIGNED,
        });
    }
    return inf_ref.update({
        inf_signing_status: CONTRACT_SIGNED,
    });
};

function update_status(brand_campaign_id, account_id, status_str){
    return campaign.access_influencer_subcollection(brand_campaign_id)
        .doc(account_id)
        .update({
            inf_signing_status: status_str,
        });
};


function make_offer(brand_campaign_id, account_id, data){
    const influencer_ref = campaign.access_influencer_subcollection(brand_campaign_id)
        .doc(account_id);
    return influencer_ref.set({
        offer: data,
        inf_signing_status: campaign.OFFER_MADE,
    }, {
        merge: true,
    });
};


function create_message_template(data){
    return db.collection(data.template_type).doc(data.template_name).set(data);
}


function get_message_template(template_type, template_name){
    return db.collection(template_type).doc(template_name).get();
}


function get_all_templates(template_type){
    return db.collection(template_type).get()
        .then(snapshots => {
            const templates = [];
            snapshots.forEach(snapshot => {
                const data = snapshot.data();
                if(data.template_name){
                    templates.push(data);
                }
            })
            return templates;
        });
}

function delete_template(template_type, template_name){
    return db.collection(template_type).doc(template_name).delete();
}


function update_template(template_type, template_name, data){
    return db.collection(template_type).doc(template_name).set(data, {merge: true});
}

// This is a util function checks whether the campaign is in contractual status.
// if true, then the contract information cannot be modified.
function check_contract_signing_status(brand_campaign_id, account_id){
    return get_inf_status(brand_campaign_id, account_id)
        .then(res => {
            if (res.inf_status && res.inf_status.indexOf('contract') !== -1){
                return true;
            }
            return false;
        });
}


// util function to fetch current inf signing status inf_signing_status
function get_inf_status(brand_campaign_id, account_id){
    const reco_inf_profile = campaign.access_influencer_subcollection(brand_campaign_id).doc(account_id);
    return reco_inf_profile.get()
        .then(snapshot => {
            const data = snapshot.data();
            return {inf_status: data.inf_signing_status};
        });
}


async function get_influencer_view(brand_campaign_id, account_id){
    const brand_campaigns_ref = db.collection(campaign.BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id);
    let offer_detail = null;
    await brand_campaigns_ref.get()
        .then((snapshot) => {
            const brand_campaign_data = snapshot.data();
            offer_detail = brand_campaign_data.offer_detail;
        });
    
    return campaign.access_influencer_subcollection(brand_campaign_id).doc(account_id)
        .get()
        .then(snapshot => {
            const data = snapshot.data();
            const influencer_public_profile = {
                inf_name : data.inf_name || '',
                inf_email : data.email,
                inf_phone: data.inf_phone || '',
                influencer_address1: data.influencer_address1 || '',
                influencer_address2: data.influencer_address2 || '',
                product_message: data.product_message || '',
                product_image_list: data.product_image_list || [],
                compensation_message: data.compensation_message || '',
                offer_detail: offer_detail || {},
                status: data.inf_signing_status,
            };
            return {
                influencer_public_profile,
            };
        });
}


function get_influencer_offer_status(brand_campaign_id, account_id){
    return campaign.access_influencer_subcollection(brand_campaign_id).doc(account_id)
        .get()
        .then(snapshot => {
            const data = snapshot.data();
            if (data.inf_signing_status === campaign.BRAND_CHOSEN) {
                return true;
            }
            return false;
        });
}


function update_product_message(brand_campaign_id, account_id, product_message, product_image_list){
    return campaign.access_influencer_subcollection(brand_campaign_id).doc(account_id)
        .set({
            product_message,
            product_image_list,
        }, {merge:true});
}


function update_comp_message(brand_campaign_id, account_id, compensation_message){
    return campaign.access_influencer_subcollection(brand_campaign_id).doc(account_id)
        .set({compensation_message}, {merge:true});
}


module.exports = {
    signatureRequest,
    getAllContractsBrand,
    getEmbeddedSignUrl,
    getSignedContract,
    signature_complete,
    update_status,
    make_offer,
    create_message_template,
    get_message_template,
    update_template,
    get_all_templates,
    delete_template,
    check_contract_signing_status,
    get_inf_status,
    get_influencer_view,
    get_influencer_offer_status,
    update_product_message,
    update_comp_message,
    create_campaign_for_inf,
    hellosign,
    INFLUENCER_ROLE,
    BRAND_ROLE,
};
