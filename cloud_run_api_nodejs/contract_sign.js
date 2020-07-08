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

const admin = require('firebase-admin');
const db = admin.firestore();

// TODO: here we list the first version lifo agreement's template id, in near future, this single template may
// evolve into multiple ones
const contract_type = contract_pb.ContractType.US_FIXED_COMMISSION;
const TEMPLATE_ID = {};
TEMPLATE_ID[contract_type] = '1a0f4e4aa93d939ff0fd67bed1eb544942c03cff';

function createContractFromCampaignData(campaign_data){
    const contract_proto = new contract_pb.Contract();
    const brand_proto = new contract_pb.Brand();
    brand_proto.shopName = campaign_data.brand;
    const BrandMessage = contract_pb.Brand;
    return {'name':'shopName', 'value': campaign_data.brand, 'editor':'Brand', 'required':true};

};

function prepareSignatureRequestData(data){
    console.info('Retrieving campaign data for ', data.brand_campaign_id);
    return campaign.getBrandCampaignForBrand(data.brand_campaign_id)
        .then(brand_campaign_data => {
            console.debug('Found campaign data', brand_campaign_data);
            // TODO: check email address validity
            const shop_email  = brand_campaign_data.contact_email;
            const contact_name = brand_campaign_data.contact_name;
            let contract_type = data.contract_type;
            if (!contract_type){
                contract_type = contract_pb.ContractType.US_FIXED_COMMISSION;
            }
            console.debug('template id dictionary is', TEMPLATE_ID, 'contract type', contract_type);
            const template_id = TEMPLATE_ID[contract_type];
            const brand_contract_json = createContractFromCampaignData(data, brand_campaign_data);

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
                        email_address: shop_email,
                        name: contact_name,
                        role: BRAND_ROLE,
                    },
                    {
                        email_address: 'test@lifo.ai',
                        name: 'Arthur Meng',
                        role: INFLUENCER_ROLE,
                    },
                ],
                custom_fields: [
                    brand_contract_json,
                ],
            };
            return opts;
        });
};

function saveSignatureResponsedata(signature_info, response, brand_campaign_id){
    const signature_request_id = signature_info.signature_request_id;
    const signatures = signature_info.signatures;
    const save_promise = db.collection(CONTRACTS_COLLECTION_NAME)
        .doc(signature_request_id)
        .set({
            signature_request_id,
            brand_campaign_id,
            signatures,
            signature_response: response,
        });
    return {
        save_promise,
        signature_request_id,
        signatures,
    };
};

function getSignatureID(email, brand_campaign_id, inf_email){
    return db.collection(CONTRACTS_COLLECTION_NAME)
        .where('brand_campaign_id', '==', brand_campaign_id)
        .get()
        .then(snapshot => {
            let signature_id = null;
            snapshot.docs.forEach(doc => {
                const doc_snap = doc.data();
                const signatures = doc_snap.signatures;
                let found_contract = false;

                // if inf_email is not None, then we are finding the proper signature id for the brand-inf pair.
                // so we will need to go through all contracts and find the correct contract first.
                if(inf_email){
                    for (let i=0;i < signatures.length; i++){
                        const signature = signatures[i];
                        console.debug('signer email', signature.signer_email_address);
                        if(signature.signer_role ===INFLUENCER_ROLE && signature.signer_email_address === inf_email){
                            console.info('Found the proper contract with influencer', inf_email);
                            found_contract = true;
                        }
                    }
                }
                if(!found_contract){
                    return;
                }
                for (let i=0;i < signatures.length; i++){
                    const signature = signatures[i];
                    console.debug('Current signature is', signature);
                    if(signature.signer_email_address === email){
                        console.debug('Found proper signer using email', email, 'with name', signature.signer_name);
                        signature_id = signature.signature_id;
                        break;
                    }
                }
                if(!signature_id){
                    console.warn('No signer was found to match the email', email);
                }
            });
            return signature_id;
        });
};

// TODO: add influencer details here.
function signatureRequest(data){
    if (!data.brand_campaign_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a specific brand_campaign_id.');
    }
    return prepareSignatureRequestData(data)
        .then(opts => {
            console.debug('Signature request options are:', opts);
            return hellosign.signatureRequest.createEmbeddedWithTemplate(opts);
        })
        .then(response => {
            console.debug('signature response is', response);
            const signature_info = response.signature_request;
            return saveSignatureResponsedata(signature_info, response, data.brand_campaign_id);
        });
};

// TODO: add influencer details here.
function previewRequest(data){
    if (!data.brand_campaign_id) {
        return new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'with a specific brand_campaign_id.');
    }
    return prepareSignatureRequestData(data)
        .then(opts => {
            console.debug('Receiving opts', opts);
            return hellosign.unclaimedDraft.createEmbeddedWithTemplate(opts);
        })
        .then(response => {
            console.debug('signature response is', response);
            const signature_info = response.unclaimed_draft;
            return saveSignatureResponsedata(signature_info, response, data.brand_campaign_id);
        });
};

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

module.exports = {
    signatureRequest,
    previewRequest,
    getAllContractsBrand,
    getEmbeddedSignUrl,
};
