const goaffpro_identifiers=["ref","aff","wpam_id","sub_id","click_id"];
const source_identifiers=["source","utm_source"];
const gfp_additional=window.__goaffpro&&window.__goaffpro.identifiers; const isFirstTouch=window.__goaffpro&&"first_touch"===window.__goaffpro.first_touch_or_last;

function getCookie(o){
    for(let e=`${o}=`,t=decodeURIComponent(document.cookie).split(";"),r=0;r<t.length;r++){
        for(var i=t[r];" "==i.charAt(0);)
        {i=i.substring(1);}
        if(0==i.indexOf(e))
        {return i.substring(e.length,i.length);}
    }
    return"";
}

function getRefCode(){
    if(isFirstTouch&&getCookie("ref"))
    {return getCookie("ref");}
    let o=searchInQuery(goaffpro_identifiers,document.location.search);
    return o||((o=searchInQuery(goaffpro_identifiers,document.location.hash))||(-1<goaffpro_identifiers.indexOf("hash")?document.location.hash&&document.location.hash.substr(1):isFirstTouch?"organic":null));
}

function getSourceId(){
    return searchInQuery(source_identifiers,document.location.search);
}

function searchInQuery(e,o){
    if(e&&0!==e.length){
        const t=o||document.location.search;
        if(0<t.length){
            const r=t.substring(1).split("&")
                .map(function (o){return o.split("=");})
                .find(function (o){return-1<e.indexOf(o[0].toLowerCase());});
            if(r)return r[1];
        }
    }
}

function getShop(){
    let t=void 0;
    return Object
        .keys(document.scripts)
        .forEach(function (o){
            const e=document.scripts[o];e.src&&e.src.startsWith("https://static.goaffpro.com/reftracker.js")&&(t=e.src.replace("https://static.goaffpro.com/reftracker.js?shop=",""));}),t||window.__goaffpro&&window.__goaffpro.shop||document.location.host;
}

function trackVisit(){
    const o=getCookie("ref");
    const t=getCookie("discount_code");
    const e=getCookie("source");
    if(o||t){
        const r=new XMLHttpRequest;
        r.open("POST","https://api.goaffpro.com/track"),
        r.setRequestHeader("Content-Type","application/json;charset=UTF-8"),
        r.send(JSON.stringify({sub_id:e,ref:o,shop:getShop(),location:document.location,navigator:navigator.userAgent,referrer:document.referrer,discount_code:t})),
        r.onload=function (){
            if(420===r.status)deleteCookie("ref"),deleteCookie("discount_code");
            else if(r.response){try{
                const o=JSON.parse(r.response);
                if(o.discount_code&&!t){
                    const e=new XMLHttpRequest;
                    o.apply_discount_on_myshopify?e.open("GET",`https://${o.website}/discount/${encodeURIComponent(o.discount_code)}`):e.open("GET",`/discount/${encodeURIComponent(o.discount_code)}`),e.send();
                }
            }catch(o){}}},
        r.onend=function (){alert("request ends");
        }
        ;}
}

function setCookie(o,e){
    const t=window.__goaffpro&&-1<window.__goaffpro.cookie_duration?window.__goaffpro.cookie_duration:604800;
    if(t){const r=`expires=${new Date((new Date).getTime()+1e3*t).toUTCString()}`;
        document.cookie=`${o}=${e};${r};path=/`;
    }else document.cookie=`${o}=${e};path=/`;
}

function deleteCookie(o){
    document.cookie=`${o}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
}

function checkoutPageCallback(){
    if(window.__goaffpro)
    {if("undefined"!=typeof Shopify&&(Shopify.checkout||Shopify.Checkout)&&window.__goaffpro.checkout_page_callback)
    {doCallback(Shopify.checkout.order_id||Shopify.checkout.id,Shopify.checkout);}
    else if(void 0!==window.__big)
    {doCallback(window.__big.order_id,window.__big);}
    else if(void 0!==window.Goaffpro&&window.Goaffpro.data)
    {doCallback(window.Goaffpro.data.order_id,window.Goaffpro.data);}
    else if("bigcommerce"===window.__goaffpro.integration){
        const o=document.body.innerHTML.split(" ").join("");
        const e=/orderId:'(.*?)'/gm.exec(o);e&&0<e.length&&doCallback(e[1],{});
    }}
}

function doCallback(o,e){
    const t=getCookie("ref");
    const r=getCookie("discount_code");
    const i=getCookie("source");
    if(t||r){
        const n=new XMLHttpRequest;
        n.open("POST","https://api.goaffpro.com/order_complete"),
        n.setRequestHeader("Content-Type","application/json;charset=UTF-8"),
        n.send(JSON.stringify({sub_id:i,ref:t,shop:getShop(),location:document.location,navigator:navigator.userAgent,referrer:document.referrer,discount_code:r,order_id:o,data:e}))
        ;}
    window.__goaffpro&&window.__goaffpro.remove_tracking_post_order&&gfp_remove_cookies();
}

function gfp_remove_cookies(){
    deleteCookie("ref"),
    deleteCookie("source"),
    deleteCookie("discount_code")
    ;
}
gfp_additional&&gfp_additional.forEach(function (o){goaffpro_identifiers.push(o);});
let refcode=getRefCode();refcode&&setCookie("ref",refcode);
const source=getSourceId();
function updateSiteLink(){
    const e=window.__goaffpro&&window.__goaffpro.partner_portal_subdomain;
    if(e){
        const t=[];if("querySelectorAll"in document)document.querySelectorAll("a").forEach(function (o){t.push(o);});
        else {for(let o=document.getElementsByTagName("a"),r=0,i=o.length;r<i;r++)
        {t.push(o);}}if(t&&0!==t.length){t.forEach(function (o){o.href&&(-1<o.href.search(e)||o.host!==document.location.host)&&(o.href=function (o,e,t){e=encodeURIComponent(e);
            const r=document.createElement("a");
            return e+=t?`=${encodeURIComponent(t)}`:"",r.href=o,r.search+=(r.search?"&":"")+e,r.href;
        }
        (o.href,"ref",refcode));});
        }
    }
}
source&&setCookie("source",source),"noref"===refcode&&gfp_remove_cookies(),trackVisit(),checkoutPageCallback(),(refcode=getCookie("ref"))&&"organic"!==refcode&&updateSiteLink();


