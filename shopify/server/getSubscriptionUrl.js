
const getSubscriptionUrl = async (ctx, accessToken, shop) => {
    const query = JSON.stringify({
        query: `mutation {
      appSubscriptionCreate(
          name: "Lifo Free to Use Plan"
          returnUrl: "${process.env.HOST}"
          test: true
          lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                  price: { amount: 0, currencyCode: USD }
              }
            }
          }
          ]
        ) {
            userErrors {
              field
              message
            }
            confirmationUrl
            appSubscription {
              id
            }
        }
    }`,
    });

    const response = await fetch(`https://${shop}/admin/api/2019-10/graphql.json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            "X-Shopify-Access-Token": accessToken,
        },
        body: query,
    });

    const responseJson = await response.json();
    console.log('subscription response is ', responseJson);
    const confirmationUrl = responseJson.data.appSubscriptionCreate.confirmationUrl;
    console.log('confirmation url is', confirmationUrl);
    return ctx.redirect(confirmationUrl);
};

module.exports = getSubscriptionUrl;
