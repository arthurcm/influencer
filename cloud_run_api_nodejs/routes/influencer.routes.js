const express = require('express');
const router = express.Router({
    mergeParams: true,
});
const InfluencerController = require('../controllers/influencer.controller');

module.exports = (container) => {

    router.post('/sign-up/influencer',(req, res, next) => {
        return new InfluencerController(container, res).influencerSignUpAction(req).catch(next);
    });

    router.get('/current-profile', (req, res, next) => {
        return new InfluencerController(container, res).getCurrentProfileAction(req).catch(next);
    });

    router.put('/current-profile', (req, res, next) => {
        return new InfluencerController(container, res).updateCurrentProfileAction(req).catch(next);
    });

    router.get('/check-instagram', (req, res, next) => {
        return new InfluencerController(container, res).checkInstagramAction(req).catch(next);
    });

    router.put('/complete-sign-up', (req, res, next) => {
        return new InfluencerController(container, res).compleateSignUpAction(req).catch(next);
    });

    router.get('/campaign', (req, res, next) => {
        return new InfluencerController(container, res).getInfluenserCampaignsAction(req).catch(next);
    });

    router.get('/campaign/:id', (req, res, next) => {
        return new InfluencerController(container, res).getInfluenserCampaignByIdAction(req).catch(next);
    });

    router.put('/submit_content', (req, res, next) => {
        return new InfluencerController(container, res).submitContentAction(req).catch(next);
    });

    router.post('/post_content', (req, res, next) => {
        return new InfluencerController(container, res).postContentAction(req).catch(next);
    });

    router.get('/account_balance', (req, res, next) => {
        return new InfluencerController(container, res).getAccountBalanceAction(req).catch(next);
    });

    router.get('/transaction_history', (req, res, next) => {
        return new InfluencerController(container, res).getUserTransactionHistoryAction(req).catch(next);
    });

    router.post('/pay_campaign', (req, res, next) => {
        return new InfluencerController(container, res).addCampaignPaymentAction(req).catch(next);
    });

    router.post('/cash_out', (req, res, next) => {
        return new InfluencerController(container, res).cashOutAction(req).catch(next);
    });

    router.post('/convert_credit', (req, res, next) => {
        return new InfluencerController(container, res).convertCreditsAction(req).catch(next);
    });


    return router;
};
