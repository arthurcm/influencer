const express = require('express')();
const influencerRoutes = require('./influencer.routes');

module.exports = (container) => {
    express.use('/influencer', influencerRoutes(container));

    return express;
};

