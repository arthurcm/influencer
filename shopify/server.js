const crypto = require('crypto');
require('isomorphic-fetch');
const Koa = require('koa');
const next = require('next');
const { default: createShopifyAuth } = require('@shopify/koa-shopify-auth');
const dotenv = require('dotenv');
const { verifyRequest } = require('@shopify/koa-shopify-auth');
const session = require('koa-session');
const cors = require('@koa/cors');

dotenv.config();
const { default: graphQLProxy } = require('@shopify/koa-shopify-graphql-proxy');
const Router = require('koa-router');
const {receiveWebhook, registerWebhook} = require('@shopify/koa-shopify-webhooks');

const { ApiVersion } = require('@shopify/koa-shopify-graphql-proxy');
const getSubscriptionUrl = require('./server/getSubscriptionUrl');
const getFirebaseAuth = require('./server/getFirebaseAuth');

const firebase = require("firebase/app");
const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://influencer-272204.firebaseio.com',
});

const firebaseConfig = {
    apiKey: "AIzaSyDUBT_LoUy-yZSbGkODOexwxN5jJgwaMw4",
    authDomain: "influencer-272204.firebaseapp.com",
    databaseURL: "https://influencer-272204.firebaseio.com",
    projectId: "influencer-272204",
    storageBucket: "influencer-272204.appspot.com",
    messagingSenderId: "65044462485",
    appId: "1:65044462485:web:04b7c9263f4cd45ec2549c",
    measurementId: "G-T0Y1HQYZ1K"
};
firebase.initializeApp(firebaseConfig);

// Add the Firebase products that you want to use
require("firebase/auth");
require("firebase/firestore");

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';

const { SHOPIFY_API_SECRET_KEY, SHOPIFY_API_KEY, HOST } = process.env;

const server = new Koa();
const router = new Router();
server.keys = [SHOPIFY_API_SECRET_KEY];
const nonce = crypto.randomBytes(16).toString('base64');

server
    .use(session({ sameSite: 'none', secure: true }, server))
    .use(cors({credentials:true}))
    .use(
        // by default, the access scope is for offline
        createShopifyAuth({
            apiKey: SHOPIFY_API_KEY,
            secret: SHOPIFY_API_SECRET_KEY,
            scopes: ['read_orders', 'write_orders', 'write_script_tags', 'read_script_tags'],
            nonce,
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
            }}),
        );

const webhook = receiveWebhook({secret: SHOPIFY_API_SECRET_KEY});

router.post('/webhooks/orders/paid', webhook, (ctx) => {
    console.log('received webhook: ', ctx.state.webhook);
    fetch(`https://api.lifo.ai/orders_paid`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(ctx.state.webhook),
    })
    .then(response => response.json())
    .then(data => console.log(data));
});


server.use(graphQLProxy({version: ApiVersion.April20}));
router.get('*', verifyRequest(), async (ctx, next) => {
    const { shop, accessToken} = ctx.session;
    return getFirebaseAuth(ctx, shop, next, accessToken);
});
server.use(router.allowedMethods());
server.use(router.routes());

server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
});


