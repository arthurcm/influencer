/**
 *
 * @interface IRelation
 * @property relationName: string,
 * @property [relationId]: string
 * @property [relations]: IRelation
 */
class IRelation {}

/**
 *
 * @interface IModelConfiguration
 * @property collectionName {string}
 * @property relations {string[]}
 */
class IModelConfiguration {}

/**
 *
 * @interface IModelOptions
 * @property includeCreatedAt {boolean}
 * @property includeUpdatedAt {boolean}
 */
class IModelOptions {}

module.exports = {
    IRelation,
    IModelConfiguration,
    IModelOptions
};

