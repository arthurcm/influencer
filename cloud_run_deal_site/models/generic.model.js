const db = require('./db');
const {IModelOptions} = require('../typings/interfaces');
const moment = require('moment');

class GenericModel {
    getDocById(){};
    createDoc(){};
    updateDocById(){};
    deleteDocById(){};

    /**
     *
     * @returns {Promise<FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>>}
     */
    get(){
        return this.ref.get();
    };

    /**
     *
     * @param collectionName {string}
     * @param options {IModelOptions}
     */
    constructor(collectionName, options = {}) {
        this.ref = db.collection(collectionName);

        /**
         *
         * @param id {string}
         * @returns {FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>}
         */
        this.getDocById = (id) => {
            return this.ref
                .doc(id)
                .get()
                .then(docRef => docRef.data());
        };

        /**
         *
         * @param object
         * @returns {Promise<FirebaseFirestore.WriteResult>}
         */
        this.createDoc = (object) => {
            if (options.includeCreatedAt) {
                object.created_at = moment().utc().unix();
            }
            return this.ref
                .doc()
                .set(object);
        };

        /**
         *
         * @param id {string}
         * @param object {object}
         * @returns {Promise<FirebaseFirestore.WriteResult>}
         */
        this.updateDocById = (id, object) => {
            if (options.includeUpdatedAt) {
                object.updated_at = moment().utc().unix();
            }
            return this.ref
                .doc(id)
                .update(object);
        };

        /**
         *
         * @param id {string}
         * @returns {FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>}
         */
        this.deleteDocById = (id) => {
            return this.ref
                .doc(id)
                .delete();
        };
    }
}

module.exports = GenericModel;
