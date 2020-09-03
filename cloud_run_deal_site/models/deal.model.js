const GenericModel = require('./generic.model');
const {IModelOptions} = require('../typings/interfaces');
const DEAL_COLLECTIONS = 'deals';

class DealModel extends GenericModel {
    /**
     *
     * @param options {IModelOptions}
     */
    constructor(options) {
        super(DEAL_COLLECTIONS, options);
    }
}

module.exports = new DealModel({
    includeCreatedAt: true,
    includeUpdatedAt: true,
    includeDeletedAt: true,
});
