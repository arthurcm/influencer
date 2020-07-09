const HELLO_SIGN_API_KEY = '7c6ad36145d437d07d8158040cb369e319fbe886e8429b414e32a8c26b7011d1';
const HELLO_SIGN_CLIENT_ID = 'ed13bd512148181319db3152c8749516';

const hellosign = require('hellosign-sdk')({ key: HELLO_SIGN_API_KEY });

const protobuf = require('protobufjs');
const functions = require('firebase-functions');

const contract_pb = require('./proto_gen/contract_pb');
// import {Contract, ContractType} from '/proto_gen/contract_pb';
const campaign = require('./campaign');

const CONTRACTS_COLLECTION_NAME = 'contracts';
const INFLUENCER_ROLE = 'Influencer';
const BRAND_ROLE = 'Brand';
const AM_ROLE = 'AM';
const SIGNATURE_PENDING = 'pending contract signing';
const CONTRACT_SIGNED = 'contract signed';

const admin = require('firebase-admin');
const db = admin.firestore();

// TODO: here we list the first version lifo agreement's template id, in near future, this single template may
// evolve into multiple ones
const contract_type = contract_pb.ContractType.US_FIXED_COMMISSION;
const TEMPLATE_ID = {};
TEMPLATE_ID[contract_type] = '1a0f4e4aa93d939ff0fd67bed1eb544942c03cff';

function createContractFromCampaignData(data, campaign_data){
    const contract_proto = new contract_pb.Contract();
    const brand_proto = new contract_pb.Brand();
    brand_proto.shopName = campaign_data.brand;
    const BrandMessage = contract_pb.Brand;
    return [
        {name:'shopName', value: campaign_data.brand, editor: AM_ROLE, required:true},
        {name:'shopEmail', value: campaign_data.contact_email, editor: AM_ROLE, required:true},
        {name:'contactPersonName', value: campaign_data.contact_name, editor: AM_ROLE, required:true},
        {name:'influencerEmail', value: data.inf_email, editor: AM_ROLE, required:true},
        {name:'influencerName', value: data.inf_name, editor: AM_ROLE, required:true},
        {name:'accountId', value: data.account_id, editor: AM_ROLE, required:true},
    ];
};

function prepareSignatureRequestData(data){
    console.info('Retrieving campaign data for ', data.brand_campaign_id);
    return campaign.getBrandCampaignForBrand(data.brand_campaign_id)
        .then(brand_campaign_data => {
            console.debug('Found campaign data', brand_campaign_data);
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

            console.debug('template id dictionary is', TEMPLATE_ID, 'contract type', contract_type);
            const template_id = TEMPLATE_ID[contract_type];
            const brand_contract = createContractFromCampaignData(data, brand_campaign_data);

            // TODO: remove the hardcode here for test_mode.
            const opts = {
                test_mode: 1,
                clientId: HELLO_SIGN_CLIENT_ID,
                requester_email_address: 'arthur.meng@lifo.ai',
                template_id,
                subject: 'Lifo brand influencer campaign agreement',
                message: 'Glad we could come to an agreement.',
                signers: [
                    {
                        email_address: 'arthur.meng@lifo.ai',
                        name: 'Arthur Meng',
                        role: AM_ROLE,
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
                custom_fields: brand_contract,
            };
            return {
                opts,
                shop_email,
            };
        });
};

function saveSignatureResponsedata(signature_info, response, brand_campaign_id, inf_email, shop_email){
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
    });
    const inf_signature_id = findSignatureIdWithEmailAndRole(signatures, inf_email, INFLUENCER_ROLE);
    const brand_signature_id = findSignatureIdWithEmailAndRole(signatures, shop_email, BRAND_ROLE);
    const inf_subcollection_ref = campaign.access_influencer_subcollection(brand_campaign_id).doc(inf_email);

    // Here we actually are saving both brand and influencer's signature ids to each influencer's profile.
    // This is mainly due to the fact that each brand-influencer pair determines a particular influencer's status.
    // Both sides need to sign on the contract so that the influencer will get the contract in pdf version.
    batch.set(inf_subcollection_ref, {
        inf_signing_status: SIGNATURE_PENDING,
        brand_signing_status: SIGNATURE_PENDING,
        signature_request_id,
        inf_signature_id,
        brand_signature_id,
    });
    return {
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

function getSignatureID(email, brand_campaign_id, inf_email){
    return db.collection(CONTRACTS_COLLECTION_NAME)
        .where('brand_campaign_id', '==', brand_campaign_id)
        .get()
        .then(snapshot => {
            let signature_id = null;
            snapshot.docs.forEach(doc => {
                const doc_snap = doc.data();
                const signatures = doc_snap.signatures;
                let cur_role = INFLUENCER_ROLE;

                // if inf_email is not None, then we are finding the proper signature id for the brand-inf pair.
                // so we will need to go through all contracts and find the correct contract first.
                let found_contract = true;
                if(inf_email){

                    // when inf_email is present, current use has to be Brand.
                    cur_role = BRAND_ROLE;
                    found_contract = false;
                    const inf_sig_id = findSignatureIdWithEmailAndRole(signatures, inf_email, INFLUENCER_ROLE);
                    if(inf_sig_id){
                        found_contract= true;
                    }
                }
                if(!found_contract){
                    return;
                }
                signature_id = findSignatureIdWithEmailAndRole(signatures, email, cur_role);
                if(!signature_id){
                    console.warn('No signer was found to match the email', email);
                }
            });
            return signature_id;
        });
};

function signatureRequest(data){
    if (!data.brand_campaign_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a specific brand_campaign_id.');
    }
    if (!data.inf_email) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a specific inf_email.');
    }
    if (!data.inf_name && !data.account_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a specific inf_name or account_id.');
    }
    return prepareSignatureRequestData(data)
        .then(async results => {
            const opts = results.opts;
            const shop_email = results.shop_email;
            console.debug('Signature request options are:', opts, 'and shop email', shop_email);
            const response = await hellosign.signatureRequest.createEmbeddedWithTemplate(opts);
            return {
                response,
                shop_email,
            };
        })
        .then(results => {
            const response = results.response;
            const shop_email = results.shop_email;
            console.debug('signature response is', response);
            const signature_info = response.signature_request;
            return saveSignatureResponsedata(signature_info, response, data.brand_campaign_id, data.inf_email, shop_email);
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

function getEmbeddedSignUrl(email, brand_campaign_id, inf_email){
    return getSignatureID(email, brand_campaign_id, inf_email)
        .then(signature_id =>{
            if(!signature_id){
                return new functions.https.HttpsError('failed-precondition', 'signature not found.');
            }
            return hellosign.embedded.getSignUrl(signature_id);
        });
};

function getSignedContract(signature_request_id){
    const fs = require('fs');
    hellosign.signatureRequest.download(signature_request_id, { file_type: 'pdf' }, (err, res) => {
        const file = fs.createWriteStream('contract.pdf');

        res.pipe(file);

        return file.on('finish', () => {
            file.close();
        });
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
    if(is_brand){
        return inf_ref.update({
            brand_signing_status: CONTRACT_SIGNED,
        });
    }
    return inf_ref.update({
        inf_signing_status: CONTRACT_SIGNED,
    });
};


module.exports = {
    signatureRequest,
    getAllContractsBrand,
    getEmbeddedSignUrl,
    getSignedContract,
    signature_complete,
};
