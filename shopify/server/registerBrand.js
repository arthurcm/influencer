const registerBrand = (ctx, shop, next, accessToken, id_token) => {
    return fetch(`https://api.lifo.ai/brand/auth`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: id_token,
        },
        body: JSON.stringify({
            shop,
            access_token: accessToken,
        })})
        .then(async response => {
            await response;
            console.info('POST success', response);
        })
        .catch(err => {
            console.error('Error registering shop', err);
            next();
        });
};
module.exports = registerBrand;
