const HELLO_SIGN_API_KEY = '7c6ad36145d437d07d8158040cb369e319fbe886e8429b414e32a8c26b7011d1';
const HELLO_SIGN_CLIENT_ID = 'ed13bd512148181319db3152c8749516';

const hellosign = require('hellosign-sdk')({ key: HELLO_SIGN_API_KEY });

const protobuf = require('protobufjs');

const contract_pb = require('./proto_gen/contract_pb');
// import {Contract, ContractType} from '/proto_gen/contract_pb';
const campaign = require('./campaign');

const CONTRACTS_COLLECTION_NAME = 'contracts';

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
                        role: 'Brand',
                    },
                    {
                        email_address: 'arthur.meng@lifo.ai',
                        name: 'Arthur Meng',
                        role: 'Influencer',
                    },
                ],
                custom_fields: [
                    brand_contract_json,
                ],
            };
            return opts;
        });
};

function saveResponsedata(signature_info, response, brand_campaign_id){
    const signature_request_id = signature_info.signature_request_id;
    const save_promise = db.collection(CONTRACTS_COLLECTION_NAME)
        .doc(signature_request_id)
        .set({
            signature_request_id,
            brand_campaign_id,
            signature_response: response,
        });
    return {
        save_promise,
        signature_request_id,
        signature_response: response,
    };
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
            return saveResponsedata(response, data.brand_campaign_id);
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
            return saveResponsedata(response, data.brand_campaign_id);
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

module.exports = {
    signatureRequest,
    previewRequest,
    getAllContractsBrand,
};
