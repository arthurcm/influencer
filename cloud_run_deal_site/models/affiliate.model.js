const GenericModel = require('./generic.model');
const {IModelOptions, IModelConfiguration} = require('../typings');
const {AVAILABLE_COLLECTIONS} = require('./db');
const admin = require('firebase-admin');

class AffiliateModel extends GenericModel {
    /**
     *
     * @type {IModelConfiguration}
     */
    modelConfiguration;

    /**
     *
     * @param options {IModelOptions}
     */
    constructor(options = {}) {
        /**
         *
         * @type {IModelConfiguration}
         */
        const modelConfig = {
            collectionName: AVAILABLE_COLLECTIONS.affiliates,
            relations: [
                AVAILABLE_COLLECTIONS.recommended_deals
            ]
        };

        super(modelConfig, options);
        this.modelConfiguration = modelConfig;
    }

    /**
     *
     * @param dealId{string}
     */
    async getAffiliatesWithActualDateByDealId(dealId) {
        return await Promise.all(
            (await this.get()).docs.map(async doc => {
                const affiliate = doc.data();
                affiliate.id = doc.id;
                const recommendedDealsSubquery = await doc.ref.collection(AVAILABLE_COLLECTIONS.recommended_deals)
                    .where('deal_list', 'array-contains', dealId)
                    .get();
                switch (recommendedDealsSubquery.docs.length) {
                    case 0:
                        affiliate.start_date = null;
                        break;
                    case 1:
                        affiliate.start_date = recommendedDealsSubquery.docs.map(recommendedDealsDoc => recommendedDealsDoc.id)[0];
                        break;
                    default:
                        affiliate.start_date = recommendedDealsSubquery.docs.map(recommendedDealsDoc => recommendedDealsDoc.id)[0];
                        console.debug(`Affiliate ${affiliate.id} has more than 1 dates for deal ${dealId}`);
                        break;
                }
                return affiliate;
            })
        )
    }

    async updateAffiliatesDates(dealId, affiliatesToUpdate) {
        return Promise.all(affiliatesToUpdate.map(async affiliate => {
            const affiliateRef = await this.ref.doc(affiliate.id);
            const recommendedDealsRef = affiliateRef.collection(AVAILABLE_COLLECTIONS.recommended_deals);
            const recommendedDealsSnapshot = await recommendedDealsRef.get();
            const dealsList = recommendedDealsSnapshot.docs.map(doc => {
                return {id: doc.id, deal_list: doc.data().deal_list}
            });

            // we need Promise.all here for prevent storing the deal more than once for one affiliate
            await Promise.all(dealsList.map(dealList => {
            // removing previous date
                if (dealList && dealList.deal_list.indexOf(dealId) !== -1) {
                    dealList.deal_list.splice(dealList.deal_list.indexOf(dealId), 1);
                    if (dealList.deal_list.length) {
                        return recommendedDealsRef.doc(dealList.id).set({deal_list: dealList.deal_list})
                    } else {
                        return recommendedDealsRef.doc(dealList.id).delete();

                    }
                }
            }))

            if (affiliate.start_date) {
                // adding new date
                const newDateDocObj = recommendedDealsSnapshot.docs.find(doc => doc.id === affiliate.start_date);
                if (newDateDocObj) {
                    await newDateDocObj.ref.update({
                        deal_list: admin.firestore.FieldValue.arrayUnion(dealId)
                    });
                } else {
                    await recommendedDealsRef.doc(affiliate.start_date).set({
                        deal_list: [dealId]
                    });
                }
            }
        }))
    }
}

module.exports = new AffiliateModel();
