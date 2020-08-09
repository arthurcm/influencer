const functions = require('firebase-functions');
const admin = require('firebase-admin');
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const campaign = require('./campaign');

const path = require('path');

function reportPostingPerformance(data){
    const influencer_ref = campaign.access_influencer_subcollection(data.brand_campaign_id)
        .doc(data.account_id);
    data.time_stamp = FieldValue.serverTimestamp();
    return influencer_ref.set({post_perf: data}, {merge: true});
};

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
            console.info('Obtaining brand campaign data', campaign_data);
            let total_likes = 0;
            let total_comments = 0;
            let total_commission = 0;
            for(var i=0; i<all_inf_perfs.length; i++){
                const cur_perf = all_inf_perfs[i];
                total_likes += cur_perf.likes;
                total_comments += cur_perf.comments;
                total_commission += cur_perf.commission;
            }
            const product_cost = campaign_data.unit_cost * campaign_data.number_of_posts;
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
        });
}

module.exports = {
    reportPostingPerformance,
    campaignPerformance,
};
