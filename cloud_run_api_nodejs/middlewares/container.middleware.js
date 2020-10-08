/**
 *
 * @param containerDescription
 * Object {
 *      services : {
 *          %alias% : %service class%
 *      },
 *      data : {
 *          %alias% : %data%
 *          %alias% : %service instance%
 *      },
 * }
 * Alias can be injected into services via methods named inject%alias% stylized as camelCase
 * Service can have %initMethod='afterConstruct'% to do something after setting dependencies
 * @constructor
 */
const Container = (containerDescription = {}) => {
    const setterPrefix = 'inject';
    const initMethod = 'afterConstruct';
    const dependencies = {};
    /**
     *
     * @param property String
     * @returns {boolean|*} True if property name starts with %setterPrefix% and written in camelCase
     */
    const setterFilter = (property) => {
        return property.startsWith(setterPrefix)
            &&
            property.charAt(setterPrefix.length) === property.charAt(setterPrefix.length).toUpperCase();
    };
    /**
     * Helper function
     * @param dependency
     * @returns {string}
     */
    const dependency2alias = (dependency) => {
        return dependency
            .substr(setterPrefix.length,1)
            .toLowerCase()
            .concat(
                dependency
                    .substr(setterPrefix.length+1,dependency.length - setterPrefix.length+1)
            );
    };
    /**
     * Helper function for circular dependency check
     * @param deps
     * @returns {Array}
     */
    const buildHelperMatrix = (deps) => {
        const keys = Object.keys(deps);
        const length = Object.keys(deps).length;
        const matrix = new Array(length);
        keys.forEach((alias) => {
            matrix[keys.indexOf(alias)] = new Array(length).fill(0);
            deps[alias].dependencies.forEach((depAlias) => {
                matrix[keys.indexOf(alias)][keys.indexOf(dependency2alias(depAlias))] = 1;
            });
        });
        return matrix;
    };
    /**
     * Helper function for circular dependency check
     * @param graph
     * @returns {Array}
     */
    const findTopLevelDependencies = (graph) => {
        const result = [];
        const length = graph.length;
        reset:for(let j=0; j<length;j++) {
            for(let i=0; i<length;i++) {
                if(graph[i][j] === 1) {
                    continue reset;
                }
            }
            result.push(j);
        }
        return result;
    };
    /**
     * Circular dependency check
     * @param deps
     * @returns {*}
     */
    const findCycles = (deps) => {
        const keys = Object.keys(deps);
        const graph = buildHelperMatrix(deps);
        const length = graph.length;
        const L = [];
        const S = findTopLevelDependencies(graph);
        while(S.length > 0) {
            const n = S.pop();
            next:for(let m=0; m<length; m++) {
                if(graph[n][m] === 1) {
                    graph[n][m] = 0;
                    for(let i=0;i<length;i++) {
                        if(graph[i][m] === 1) {
                            continue next;
                        }
                    }
                    S.push(m);
                }
            }
            L.push(n);
        }
        if(L.length < length) {
            const danger = [];
            for(let i=0;i<length;i++) {
                for(let j=0;j<length;j++) {
                    if(graph[i][j] === 1) {
                        danger.push({
                            from: keys[i],
                            to : keys[j],
                        });
                    }
                }
            }
            return danger;
        } else {
            return false;
        }
    };
    const container = {};
    /**
     * Fetch Data into container
     */
    if(typeof containerDescription.data !== 'undefined') {
        Object.keys(containerDescription.data).forEach((dataAlias) => {
            if(containerDescription.data[dataAlias] === null || typeof containerDescription.data[dataAlias] === 'undefined') {
                throw new Error(`${dataAlias} must be have legit value`);
            }
            if(!container[dataAlias]) {
                container[dataAlias] = containerDescription.data[dataAlias];
                dependencies[dataAlias] = {
                    injectable : true,
                    dependencies : Object.getOwnPropertyNames(container[dataAlias].__proto__).filter((property) => {
                        return setterFilter(property);
                    }),
                };
            } else {
                throw new Error('Container : Alias '.concat(dataAlias,' exists!'));
            }
        });
    }

    /**
     * Fetch services into container
     */
    if(typeof containerDescription.services !== 'undefined') {
        Object.keys(containerDescription.services).forEach((serviceAlias) => {
            if(!container[serviceAlias]) {
                container[serviceAlias] = new (containerDescription.services[serviceAlias])();
                dependencies[serviceAlias] = {
                    injectable : true,
                    dependencies : Object.getOwnPropertyNames(container[serviceAlias].__proto__).filter((property) => {
                        return setterFilter(property);
                    }),
                };
            } else {
                throw new Error('Container : Alias '.concat(serviceAlias,' exists!'));
            }
        });
    }

    /**
     * Find circular dependencies
     * @type {*}
     */
    const cycles = findCycles(dependencies);
    if(cycles !== false) {
        throw new Error('Circular dependencies detected check : '.concat(cycles.reduce((accumulator, current) => {
            return accumulator.concat(current.from,' -> ',current.to,'; ');
        },'')));
    }
    /**
     * Resolve dependencies
     */
    Object.keys(dependencies).forEach((alias) => {
        dependencies[alias].dependencies.forEach((dependencySetter) => {
            const dependencyAlias = dependency2alias(dependencySetter);
            if(!dependencies[dependencyAlias]) {
                throw new Error('Unmet dependency '.concat(dependencyAlias,' in ', alias));
            } else {
                if(dependencies[dependencyAlias].injectable) {
                    if(!container[alias].__proto__.hasOwnProperty(dependencySetter)) {
                        throw new Error('Class '.concat(alias, ' has no ', dependencySetter, ' method!'));
                    } else {
                        (container[alias][dependencySetter])(container[dependencyAlias]);
                    }
                }
            }
        });
    });
    /**
     * Call %initMethod% if any
     */
    Object.keys(dependencies).forEach(alias => {
        if(typeof container[alias] === 'undefined') {
            throw new Error('Alias '.concat(alias,' is undefined!'));
        }
        if(container[alias].__proto__.hasOwnProperty(initMethod)) {
            (container[alias][initMethod])();
        }
    });
    return container;
};

module.exports = Container;
