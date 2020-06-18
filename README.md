# Influencer

This project is currently deployed completely on GCP. 

The project extensively rely on the following product on GCP:
Firebase, Cloud Run (both managed and on Anthos), Cloud functions,  Cloud SQL, GKE, CV API, Video Inteligence API

This frontend part was generated with [Angular CLI](https://github.com/angular/angular-cli) version 8.3.19.
The backend services are all micro-services based architecture, where each service is a docker container hosted on 
GCP cloud run, or a function hosted on Cloud functions. 
The use cases are Cloud Run and cloud functions are different: Cloud run are more full fledged REST API style services,
while functions are resource-light single functions. 
The client-facing data structures are mostly hosted by Firebase, where large object media files are hosted on Firestore,
both of whose backends are GCS object storage. 
The analytics data are stored on Cloud SQL for ease of reporting etc.
The ML related APIs (CV and video inteligence) are triggered by cloud functions to provide add-on analytics. 

### UI Deployment
##### Production hosting
To update remote production hosting, under project root folder, /influencer, run the following:
npm install & npm run build
firebase deploy --only hosting:lifo

##### Local development
To develop locally, under project root folder, /influencer, run the following:
npm install & npm start
This will launch a local server at localhost:4200

### Shopify APP
The Shopify app is mainly composed of two modules: app server, and client side scripts

