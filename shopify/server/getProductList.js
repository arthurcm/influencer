const getProductList = (ctx, shop, next, accessToken, id_token) => {
    return fetch(`https://${shop}/admin/api/${process.env.API_VERSION}/products.json?limit=250`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken,
        },
    })
    .then(response => {
        const responseJson = response.json();
        console.log('Obtained product information', responseJson);
        return fetch(`https://api.lifo.ai/brand/product`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": id_token,
            },
            body: JSON.stringify(responseJson),
        });
    })
        .then(response => {
            console.info('POST success', response);
        })
        .catch(err => {
            console.error('Error posting product list', err);
            next();
        });
};
module.exports = getProductList;
