function parseTracker() {
    const url_prefix = window.location.origin.concat('/?lftracker=');
    const href = window.location.href;
    let lftracker = void 0;
    if (href && href.startsWith(url_prefix)) {
        lftracker = href.replace(url_prefix, "");
    }
    if (lftracker) {
        setCookie("lftracker", lftracker);
    }
    return lftracker;
}


function getCookie(identifier){
    for(let tracker_name=`${identifier}=`,tokens=decodeURIComponent(document.cookie).split(";"),i=0;i<tokens.length;i++) {
        // this is to remove potential space in front of each tracker name
        for(var j=tokens[i];" "==j.charAt(0);){
            j=j.substring(1);
        }
        if(0==j.indexOf(tracker_name)) {
            return j.substring(tracker_name.length,j.length);
        }
    }
    return"";
}


function getShop(){
    return document.location.host;
}

function trackVisit(){
    const lifo_tracker_id=getCookie("lftracker");
    const discount_code=getCookie("discount_code");
    try {
        if (lifo_tracker_id || discount_code) {
            const req = new XMLHttpRequest;
            req.open("POST", "https://api.lifo.ai/track"),
            req.setRequestHeader("Content-Type", "application/json;charset=UTF-8"),
            req.send(JSON.stringify({
                lifo_tracker_id,
                shop: getShop(),
                location: document.location,
                user_agent: navigator.userAgent,
                referrer: document.referrer,
                discount_code,
            })),
            req.onload = function () {
                if (420 === req.status) {
                    deleteCookie("lftracker"), deleteCookie("discount_code");
                }
            },
            req.onend = function () {
                alert("request ends");
            };
        }
    } catch(err){}
}

function setCookie(name, value){
    const time_from_now=604800;
    if(time_from_now){
        const r=`expires=${new Date((new Date).getTime()+1e3*time_from_now).toUTCString()}`;
        document.cookie=`${name}=${value};${r};path=/`;
    }else {
        document.cookie=`${name}=${value};path=/`;
    }
}

function deleteCookie(name){
    document.cookie=`${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
}

function checkoutPageCallback(){
    if(Shopify.checkout||Shopify.Checkout) {
        doCheckoutCallback(Shopify.checkout.order_id||Shopify.checkout.id, Shopify.checkout);
    }
}
function doCheckoutCallback(order_id, data){
    const lifo_tracker_id=getCookie("lftracker");
    let discount_code;
    if (data.discount){
        discount_code = data.discount.code;
    }
    discount_code=getCookie("discount_code")||discount_code;
    if(lifo_tracker_id||discount_code){
        try {
            const n = new XMLHttpRequest;
            n.open("POST", "https://api.lifo.ai/order_complete"),
            n.setRequestHeader("Content-Type", "application/json;charset=UTF-8"),
            n.send(JSON.stringify({
                lifo_tracker_id,
                shop: getShop(),
                location: document.location,
                user_agent: navigator.userAgent,
                referrer: document.referrer,
                discount_code,
                order_id,
                customer_id: data.customer_id,
                order_data: data,
            }));
        }catch (e) {}
    }
}

function remove_cookies(){
    deleteCookie("lftracker"),
    deleteCookie("discount_code");
}

const refcode = parseTracker();
"noref"===refcode&&remove_cookies();
checkoutPageCallback();
trackVisit();

