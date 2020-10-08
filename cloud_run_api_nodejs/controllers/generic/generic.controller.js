class GenericController {
    /**
     * type {CONTAINER}
     */
    container;
    response;
    /**
     *
     * @param container {CONTAINER}
     * @oaram res
     */
    constructor(container,res) {
        this.container = container;
        this.response = res;
        this.afterConstruct();
    }

    afterConstruct() {
        throw new Error('Must be implemented in child controllers');
    }

    beforeDestroy() {
        throw new Error('Must be implemented in child controllers');
    }

    /**
     * todo move to some kind of helper?
     *
     * @param {Array<[]>} listOfLists
     * @return {Array}
     */
    arrayFlatten(listOfLists) {
        return [].concat.apply([], listOfLists);
    }

    /**
     *
     * @param result
     * @returns {Promise.<TResult>}
     */
    successResponse(result = true) {
        return Promise.resolve(result).then(ret => {
            this.response.status(200).json(ret);
            return ret;
        });
    }

    errorResponse(errorCode, errorMessage) {
        this.response.status(errorCode);
        return Promise.resolve(errorMessage)
            .then(ret => {
                this.response.json(ret);
                return ret;
            });
    }

    json(json) {
        return Promise.resolve(
            json
        ).then(ret => this.response.json(ret));
    }

    textResponse(text) {
        return Promise.resolve(
            text
        ).then(ret => this.response.send(ret));
    }
}

module.exports = GenericController;
