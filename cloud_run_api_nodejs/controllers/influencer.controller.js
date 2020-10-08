const GenericController = require('./generic/generic.controller');
const campaign = require('../campaign');
const reporting = require('../reporting');

class InfluencerController extends GenericController {
    afterConstruct() {
        /**
         *
         * @type {InfluencerService}
         */
        this.influencerService = this.container.influencerService;

        /**
         *
         * @type {SQLDbService}
         */
        this.sqlDbService = this.container.sqlDbService;
    }

    influencerSignUpAction(req) {
        const data = req.body;
        const currentUser = req.current_user;
        return this.influencerService.updateInfluencerUserById(currentUser.uid, data)
            .then(user => this.successResponse(user));
    }

    compleateSignUpAction(req) {
        const data = req.body;
        const currentUser = req.current_user;
        return this.influencerService.updateInfluencerUserById(currentUser.uid, data)
            .then(user => this.successResponse(user));
    }

    getCurrentProfileAction(req) {
        return this.successResponse(req.current_user);
    }

    updateCurrentProfileAction(req) {
        const data = req.body;
        const currentUser = req.current_user;
        return this.influencerService.updateInfluencerUserById(currentUser.uid, data)
            .then(user => this.successResponse(user));
    }

    checkInstagramAction(req) {
        const currentUser = req.current_user;
        return this.influencerService.getInstagramProfileFromModash(currentUser.uid, req.headers.authorization)
            .then(modashResults => {
                if (modashResults) {
                    return this.influencerService.updateInfluencerUserById(currentUser.uid, {is_instagram_checked: true});
                }
            })
            .then(response => this.successResponse(response));
    }

    getInfluenserCampaignsAction(req) {
        const currentUser = req.current_user;
        return this.influencerService.getCampaignsByUid(currentUser.uid)
            .then(campaigns => this.successResponse(campaigns));
    }

    getInfluenserCampaignByIdAction(req) {
        const brandCampaignId = req.params.id;
        const currentUser = req.current_user;
        return this.influencerService.getCampaignById(currentUser.uid, brandCampaignId)
            .then(campaigns => this.successResponse(campaigns));
    }

    postContentAction(req) {
        const data = req.body;
        if (!data.brand_campaign_id) {
            console.warn('brand_campaign_id can not be empty');
            return this.errorResponse(412, {status: 'brand_campaign_id empty'});
        }
        if (!data.account_id) {
            console.warn('account_id can not be empty');
            return this.errorResponse(412, {status: 'account_id empty'});
        }
        if (!data.link) {
            console.warn('link can not be empty');
            return this.errorResponse(412, {status: 'likes empty'});
        }

        return reporting.reportPostContent(data)
            .then(() => this.successResponse({status: 'OK'}));
    }

    async submitContentAction(req) {
        const data = req.body;
        if (!data.brand_campaign_id) {
            console.warn('brand_campaign_id can not be empty');
            return this.errorResponse(412, {status: 'brand_campaign_id empty'});
        }
        if (!data.account_id) {
            console.warn('account_id can not be empty');
            return this.errorResponse(412, {status: 'account_id empty'});
        }

        let first_time_submit = true;
        await campaign.access_influencer_subcollection(data.brand_campaign_id)
            .doc(data.account_id)
            .get()
            .then(querySnapshot => {
                querySnapshot.docs.forEach(doc => {
                    if (doc.data().content_submit_time) {
                        first_time_submit = false;
                    }
                });
                return first_time_submit;
            });

        if (first_time_submit) {
            return campaign.access_influencer_subcollection(data.brand_campaign_id).doc(data.account_id)
                .set({
                    submit_post_time: moment().utc().unix(),
                }, {merge: true})
                .then(results => {
                    res.status(200).send({status: 'OK'});
                    return results;
                })
                .catch(next);
        } else {
            return this.successResponse({status: 'OK'});
        }
    }

    getAccountBalanceAction(req) {
        const currentUser = req.current_user;
        return this.sqlDbService.getUserBalance(currentUser.uid)
            .then(result => {
                if (result.rows.length <= 0) {
                    this.errorResponse(400, {error: 'influencer not found'});
                }
                return this.successResponse(result.rows[0]);
            });
    }

    getUserTransactionHistoryAction(req) {
        const currentUser = req.current_user;
        return this.sqlDbService.getUserTransactionHistory(currentUser.uid)
            .then(result => this.successResponse(result.rows));
    }

    async addCampaignPaymentAction(req) {
        const currentUser = req.current_user;
        const data = req.body;
        if (!data.campaign_id || !data.amount) {
            this.errorResponse(400, {error: 'missing campaign information'});
        }
        const ret = await this.sqlDbService.addCampaignPayment(currentUser.uid, data.amount, data.campaign_id);
        return this.successResponse(ret);
    }

    async cashOutAction(req) {
        const currentUser = req.current_user;
        const data = req.body;
        if (!data.amount) {
            this.errorResponse(400, {error: 'missing amount information'});
        }
        const ret = await this.sqlDbService.cashOutBalance(currentUser.uid, data.amount);
        return this.successResponse(ret);
    }

    async convertCreditsAction(req) {
        const currentUser = req.current_user;
        const data = req.body;
        if (!data.date) {
            this.errorResponse(400, {error: 'missing date information'});
        }
        const ret = await this.sqlDbService.convertCampaignPayment(currentUser.uid, data.date);
        return this.successResponse(ret);
    }
}

module.exports = InfluencerController;
