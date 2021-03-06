const GenericModel = require('./generic.model');
const {IModelOptions, IModelConfiguration} = require('../typings');
const {AVAILABLE_COLLECTIONS} = require('./db');

class DealModel extends GenericModel {
    /**
     *
     * @param options {IModelOptions}
     */
    constructor(options) {
        /**
         *
         * @type {IModelConfiguration}
         */
        const modelConfig = {
            collectionName: AVAILABLE_COLLECTIONS.deals
        };
        super(modelConfig, options);
    }
}

module.exports = new DealModel({
    includeCreatedAt: true,
    includeUpdatedAt: true,
});
