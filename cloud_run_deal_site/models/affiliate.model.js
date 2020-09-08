const GenericModel = require('./generic.model');
const {IModelOptions, IModelConfiguration} = require('../typings');
const {AVAILABLE_COLLECTIONS} = require('./db');

class AffiliateModel extends GenericModel {
    /**
     *
     * @param options {IModelOptions}
     */
    constructor(options= {}) {
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
    }
}

module.exports = new AffiliateModel();
