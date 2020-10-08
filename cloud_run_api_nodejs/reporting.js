const functions = require('firebase-functions');
const appContainer = require('./app.container');
const db = appContainer.firebaseService.firebaseDb;
const admin = appContainer.firebaseService.admin;
const FieldValue = admin.firestore.FieldValue;

const campaign = require('./campaign');

const moment = require('moment');
const path = require('path');

function reportPostingPerformance(data){
    const batch = db.batch();
    const influencer_ref = campaign.access_influencer_subcollection(data.brand_campaign_id)
        .doc(data.account_id);
    data.time_stamp = FieldValue.serverTimestamp();
    batch.set(influencer_ref, {post_perf: data}, {merge: true});
    const campaign_ref = db.collection(campaign.BRAND_CAMPAIGN_COLLECTIONS).doc(data.brand_campaign_id);
    // Atomically add a new region to the "regions" array field.
    batch.update(campaign_ref,{
        inf_posted: admin.firestore.FieldValue.arrayUnion(data.account_id),
    });
    return batch.commit();
};

function reportPostContent(data) {
    const batch = db.batch();
    const influencer_ref = campaign.access_influencer_subcollection(data.brand_campaign_id)
        .doc(data.account_id);
    batch.set(influencer_ref, {
        submit_post_time: moment.utc().unix(),
        post_url: data.link,
        post_perf: data
    }, {merge: true});
    const campaign_ref = db.collection(campaign.BRAND_CAMPAIGN_COLLECTIONS).doc(data.brand_campaign_id);
    // Atomically add a new region to the "regions" array field.
    batch.update(campaign_ref, {
        inf_posted: admin.firestore.FieldValue.arrayUnion(data.account_id),
    });
    return batch.commit();
}

function calculatePerformance(campaign_data, all_inf_perfs){
    // console.info('Obtaining brand campaign data', campaign_data);
    let total_likes = 0;
    let total_comments = 0;
    let total_commission = 0;
    if(all_inf_perfs.length === 0){
        return {};
    }
    for(var i=0; i<all_inf_perfs.length; i++){
        const cur_perf = all_inf_perfs[i];
        total_likes += cur_perf.likes;
        total_comments += cur_perf.comments;
        total_commission += cur_perf.commission;
    }
    let unit_cost = campaign_data.unit_cost;
    if(!unit_cost){
        unit_cost = campaign_data.product_price * 0.5 || 0;
    }
    const product_cost = unit_cost * all_inf_perfs.length;
    const amount_spent = product_cost + total_commission;
    let cost_per_like = null;
    let cost_per_engagement = null;
    const total_engagements = total_comments + total_likes;
    if(total_likes > 0){
        cost_per_like = amount_spent / total_likes ;
    }
    if(total_engagements >0){
        cost_per_engagement = amount_spent / total_engagements;
    }
    return {
        cost_per_engagement,
        cost_per_like,
        amount_spent,
        product_cost,
        total_commission,
        total_likes,
        total_comments,
        posts: all_inf_perfs.length,
        all_inf_perfs,
    };
}

async function campaignPerformance(brand_campaign_id){
    const all_inf_ref = campaign.access_influencer_subcollection(brand_campaign_id).get();
    const all_inf_perfs = [];
    await all_inf_ref.then(querySnapshot => {
        querySnapshot.docs.forEach(doc => {
            if(doc.data().post_perf){
                all_inf_perfs.push(doc.data().post_perf);
            }
        });
        return all_inf_perfs;
    });
    return db.collection(campaign.BRAND_CAMPAIGN_COLLECTIONS).doc(brand_campaign_id).get()
        .then(snapshot => {
            const campaign_data = snapshot.data();
            return calculatePerformance(campaign_data, all_inf_perfs);
        });
}

function campaignDashboard(uid){
    return db.collection(campaign.BRAND_CAMPAIGN_COLLECTIONS).where('brand_id', '==', uid).get()
        .then(async snapshots => {
            const campaign_perfs = [];
            return snapshots.docs.map(async doc => {
                const campaign_data = doc.data();
                if(!campaign_data.deleted) {
                    const all_inf_ref = campaign.access_influencer_subcollection(campaign_data.brand_campaign_id).get();
                    const all_inf_perfs = [];
                    await all_inf_ref.then(querySnapshot => {
                        querySnapshot.docs.forEach(doc => {
                            if(doc.data().post_perf){
                                all_inf_perfs.push(doc.data().post_perf);
                            }
                        });
                    });
                    const campaign_perf = calculatePerformance(campaign_data, all_inf_perfs);
                    console.info('Calculated campaign performance', campaign_perf);
                    // campaign_perfs.push(campaign_perf);
                    return campaign_perf;
                }
            });
            // return campaign_perfs;
        })
        .then(async campaign_perfs_pro => {
            console.info(`Found ${campaign_perfs_pro.length} individual campaign performances`, campaign_perfs_pro);
            const campaign_perfs = await Promise.all(campaign_perfs_pro);
            console.info(`Found ${campaign_perfs.length} individual campaign performances`, campaign_perfs);
            let total_likes = 0;
            let total_comments = 0;
            let total_amount_spent = 0;
            let total_posts = 0;
            for(var i=0; i<campaign_perfs.length; i++){
                const cur_perf = campaign_perfs[i];
                if(!cur_perf){
                    continue;
                }
                if(cur_perf.total_likes){
                    total_likes += cur_perf.total_likes;
                }
                if(cur_perf.total_comments){
                    total_comments += cur_perf.total_comments;
                }
                if(cur_perf.amount_spent){
                    total_amount_spent += cur_perf.amount_spent;
                }
                if(cur_perf.posts){
                    total_posts += cur_perf.posts;
                }
            }
            let cost_per_like = 0;
            let cost_per_engagement = 0;
            const total_engagements = total_comments + total_likes;
            if(total_likes > 0){
                cost_per_like = total_amount_spent / total_likes ;
            }
            if(total_engagements >0){
                cost_per_engagement = total_amount_spent / total_engagements;
            }
            const data = {
                cost_per_like,
                cost_per_engagement,
                total_likes,
                total_comments,
                total_engagements,
                posts: total_posts,
                amount_spent: total_amount_spent,
            };
            console.info('Final dashboard results is', data);
            return data;
        });
}


function registerBrandAccount(email, password, from_amazon, brand_name, first_name, last_name, data){
    const customClaims = {
        store_account: true,
        from_shopify: false,
        from_amazon,
        store_email: email,
        store_name: brand_name,
    };
    const display_name = first_name || brand_name;
    return admin.auth().createUser({
        uid: brand_name,
        email,
        password,
        displayName: display_name,
    })
        .then(userRecord => {
            // See the UserRecord reference doc for the contents of userRecord.
            console.log('Successfully created new user:', userRecord.uid);
            const shop_data =  {
                email,
                domain: data.domain || '',
                contact_name: `${first_name} ${last_name}` || '',
                address1 : data.address1 || '',
                address2 : data.address2 || '',
                city : data.city || '',
                province : data.province || '',
                country : data.country || '',
                profile_image: data.profile_image || '',
            };
            console.info('Registering brand with following information:', shop_data);
            return admin.auth().setCustomUserClaims(userRecord.uid, customClaims).then(() => {
                console.info('Successfully registered brand account', brand_name);
                return db.collection('brands').doc(brand_name)
                    .set({
                        shop: shop_data,
                    });
            });
        });
}

function assign_affiliate_link(data){
    return campaign.access_influencer_subcollection(data.brand_campaign_id).doc(data.account_id)
        .update({affiliate_link: data.affiliate_link});
}

function get_affiliate_link(brand_campaign_id, account_id){
    return campaign.access_influencer_subcollection(brand_campaign_id).doc(account_id)
        .get()
        .then(snapshot => {
            const data = snapshot.data();
            return data.affiliate_link;
        });
}

module.exports = {
    reportPostingPerformance,
    reportPostContent,
    campaignPerformance,
    campaignDashboard,
    registerBrandAccount,
    assign_affiliate_link,
    get_affiliate_link,
};
