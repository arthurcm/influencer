const {db} = require('./db');
const {IModelOptions, IModelConfiguration} = require('../typings');
const moment = require('moment');
const {IRelation} = require('../typings')

class GenericModel {
    /**
     *
     * @type {string[]}
     */
    relations = [];

    /**
     *
     * @param docRef {FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>}
     * @param relations {IRelation[]}
     * @returns {Promise<{
     *     id: string
     *     ...
     * }[]>}
     */
    async getRelatedDocs(docRef, relations) {
        let docRelations = {};
        for (let relation of relations) {
            if (relation.relationName && typeof relation.relationName === 'string') {
                docRelations[relation.relationName] = [];
                if (relation.relationId) {
                    const subqueryString = `/${docRef.id}/${relation.relationName}/${relation.relationId}`;
                    const subDocRef = await this.ref.doc(subqueryString).get();
                    if (subDocRef.data()) {
                        docRelations[relation.relationName] = [{
                            id: subDocRef.id,
                            ...subDocRef.data()
                        }];
                    }
                } else {
                    const relationSubquery = await docRef.ref.collection(relation.relationName).get();
                    docRelations[relation.relationName] = [];
                    relationSubquery.forEach(subDocRef => {
                        if (subDocRef.data()) {
                            docRelations[relation.relationName].push({
                                id: subDocRef.id,
                                ...subDocRef.data()
                            });
                        }
                    })
                }
            }
        }
        return docRelations;
    }


    /**
     *
     * @param id {string}
     * @param params {
     *  {
     *      relations: IRelation[]
     *  }
     * }
     * @returns {FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>}
     */
    async getDocById(id, params = {}) {
        return this.ref
            .doc(id)
            .get()
            .then(async docRef => {
                let docData = docRef.data();
                if (params.relations && Array.isArray(params.relations) && params.relations.length) {
                    docData = Object.assign(docData, await this.getRelatedDocs(docRef, params.relations));
                }
                return docData;
            });
    };

    createDoc() {
    };

    updateDocById() {
    };

    deleteDocById() {
    };

    /**
     *
     * @param id{string}
     * @param collection {('deals' | 'affiliates' | 'recommended_deals')}
     * @returns {Promise<FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>>}
     */
    listCollectionsById(id, collection) {
        return this.ref
            .doc(id).collection(collection)
            .get();
    }

    /**
     *
     * @returns {Promise<FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>>}
     */
    get() {
        return this.ref.get();
    };

    /**
     *
     * @param collection {IModelConfiguration}
     * @param options {IModelOptions}
     */
    constructor(collection, options = {}) {
        this.ref = db.collection(collection.collectionName);
        this.relations = collection.relations

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

        /**
         *
         * @param query {[string, string, any]}
         * @returns {FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>}
         */
        this.searchDoc = (query) => {
            return this.ref
                .where(query[0], query[1], query[2])
                .get();
        };
    }
}

module.exports = GenericModel;
