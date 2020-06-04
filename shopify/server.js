require('isomorphic-fetch');
const Koa = require('koa');
const next = require('next');
const { default: createShopifyAuth } = require('@shopify/koa-shopify-auth');
const dotenv = require('dotenv');
const { verifyRequest } = require('@shopify/koa-shopify-auth');
const session = require('koa-session');

const koaRequest = require('koa-http-request');

dotenv.config();
const { default: graphQLProxy } = require('@shopify/koa-shopify-graphql-proxy');
const Router = require('koa-router');
const {receiveWebhook, registerWebhook} = require('@shopify/koa-shopify-webhooks');

const { ApiVersion } = require('@shopify/koa-shopify-graphql-proxy');
const getSubscriptionUrl = require('./server/getSubscriptionUrl');

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const { SHOPIFY_API_SECRET_KEY, SHOPIFY_API_KEY, HOST } = process.env;

app.prepare().then(() => {
    const server = new Koa();
    const router = new Router();
    server.use(session({ sameSite: 'none', secure: true }, server));
    server.keys = [SHOPIFY_API_SECRET_KEY];

    server.use(
        createShopifyAuth({
            apiKey: SHOPIFY_API_KEY,
            secret: SHOPIFY_API_SECRET_KEY,
            scopes: ['read_orders', 'write_orders', 'write_script_tags', 'read_script_tags'],
            async afterAuth(ctx) {
                const { shop, accessToken } = ctx.session;
                ctx.cookies.set('shopOrigin', shop, {
                    httpOnly: false,
                    secure: true,
                    sameSite: 'none',
                });
                await getSubscriptionUrl(ctx, accessToken, shop);
                const order = await registerWebhook({
                    address: `${HOST}/webhooks/orders/paid`,
                    topic: 'ORDERS_PAID',
                    accessToken,
                    shop,
                    apiVersion: ApiVersion.October19,
                });


                if (order.success) {
                    console.log('Successfully registered webhook!');
                } else {
                    console.log('Failed to register webhook', order.result);
                }

                // const res = fetch(`https://${shop}/admin/api/2020-04/graphql.json`, {
                //     method: "POST",
                //     headers: {
                //         "Content-Type": "application/json",
                //         "X-Shopify-Access-Token": accessToken,
                //     },
                //     body: JSON.stringify({
                //         query: `mutation scriptTagCreate($input: ScriptTagInput!) {
                //                   scriptTagCreate(input: $input) {
                //                     scriptTag {
                //                       id
                //                     }
                //                     userErrors {
                //                       field
                //                       message
                //                     }
                //                   }
                //                 }`,
                //             variables: {
                //             "input": {
                //                 "displayScope": "ALL",
                //                 "src": "https://script.lifo.ai/tagscript.js"
                //             }
                //         },
                //     }
                //     ),
                // })
                //     .then(response => response.json())
                //     .then(data => console.log(data));
                const res = fetch(`https://${shop}/admin/api/2020-04/script_tags.json`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Shopify-Access-Token": accessToken,
                    },
                    body: JSON.stringify(
                        {
                            script_tag: {
                                event: "onload",
                                src: "https://script.lifo.ai/tagscript.js",
                            },
                        }
                    ),
                })
                    .then(response => response.json())
                    .then(data => console.log(data));
            }}),
    );

    const webhook = receiveWebhook({secret: SHOPIFY_API_SECRET_KEY});

    router.post('/webhooks/orders/paid', webhook, (ctx) => {
        console.log('received webhook: ', ctx.state.webhook);
    });


    server.use(graphQLProxy({version: ApiVersion.October19}));
    router.get('*', verifyRequest(), async (ctx) => {
        await handle(ctx.req, ctx.res);
        ctx.respond = false;
        ctx.res.statusCode = 200;
    });
    server.use(router.allowedMethods());
    server.use(router.routes());

    server.listen(port, () => {
        console.log(`> Ready on http://localhost:${port}`);
    });
});


