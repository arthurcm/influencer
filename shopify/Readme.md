## Shopify App development and production deployment
Note: this is a documentation of a few handy scripts to use for: 1. testing; 2. deploying shopify app

###Introduction
At high level, Shopify app is a Koa api server which provides basic frontend, and API backend.
So when developing it, and hook up to both GCP resources (e.g. Cloud SQL for data storage), and Shopify apps platofrm,
we will need to add: 
1. authentication through service accounts (GCP);
2. API keys (both GCP and Shopify)

In produdction, we host the Shopify app on GCP Cloud Run, with service called "shopify-app" and access
domain mapped to brand.lifo.ai
In local devleopment, we host the Koa server (in docker container) locally, and use gorok.io to map the localhost:9090
to remote domains, so that our local server can be hooked up to Shopify platform.
Note: to avoid accidental deployment of local dev app, please double check the local .env file for SHOPIFY_API_KEY
and HOST before deploy to remote. 

### Handy commands
some frequently used commands are listed below:

####build docker image on GCP (remote build):
gcloud builds submit --tag gcr.io/influencer-272204/shopify_app


####To deploy shopify_app with service account access to secret manager:
gcloud run deploy shopify-app --image gcr.io/influencer-272204/shopify_app --platform managed --service-account=65044462485-compute@developer.gserviceaccount.com



####For development purposes only:

Local testing for Shopify requires ngrok tunneling, after running the following command,
replace the HOST in .env with the randomly generated forwarding domain https://xxx.ngrok.io, also go to
https://partners.shopify.com/, update the "app setup" --> "App URL" and "Whitelisted redirection URL(s)"
using the ngrok.io domain obtained above:

ngrok http 9090 (keep running)


Then, build docker image locally inside /influencer/shopify folder (require docker installation):

docker build . --tag gcr.io/influencer-272204/shopify_app

####Local testing container:
(Note: GOOGLE_APPLICATION_CREDENTIALS below is an local environmental variable to be set on the local testing machine,
it is a path to the GCP service account json file. We currently host it on Github for dev purposes, but will remove and
rotate then once we move to production. Example config below, replace [path/to] with your local path to the codebase:

export GOOGLE_APPLICATION_CREDENTIALS="[path/to]/influencer/cloud_run_video_transcoding/service_account.json")
PORT=8080 && docker run -p 9090:${PORT} -e PORT=${PORT} -e K_SERVICE=dev -e K_CONFIGURATION=dev -e K_REVISION=dev-00001 -e GOOGLE_APPLICATION_CREDENTIALS=/tmp/keys/service_account.json -v $GOOGLE_APPLICATION_CREDENTIALS:/tmp/keys/service_account.json:ro gcr.io/influencer-272204/shopify_app

After the above container is running, go to Shopify partners website, in the lifo app page,
"Test your app" tab, click "select store", and install to test store. 


###Update client side scripts, including app.js and tagscript.js
To update and deploy the client side app.js and tagscript.js, both of them are hosted remotely under script.lifo.ai,
The difference being, tagscript.js is installed to stores at install time, and app.js is called at runtime.
run the following anywhere in the repo:
firebase deploy --only hosting:shopify

