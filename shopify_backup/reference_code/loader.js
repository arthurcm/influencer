let gfp_aff_toolbar;;
window.__goaffpro = {
    pre_checkout_ref_input_data:{
        input_label:"Referred By?",
        input_placeholder:"Referral Code",
    },
    shop:"lifo-ai.myshopify.com",
    cookie_duration:604800,
    checkout_page_callback:true,
    scripts:["https://static.goaffpro.com/rt.js?shop=lifo-ai.myshopify.com"],
    show_aff_bar:false,
    first_touch_or_last:"last_touch",
    identifiers:[],
    integration:"shopify",
    partner_portal_subdomain:"lifo-ai.goaffpro.com",
    aff_bar_config:{copy_btn_text:"Copy Link",
        copied_btn_text:"Copied",bgColor:"#eee",textColor:"#3c5a99",social_icons:["fb","wa","tw","pt"],dashboard_text:"Dashboard",fb_color:"#3c5a99",tw_color:"#1da1f2",pt_color:"#bd081c",wa_color:"#4ac959"}};
function loadScript(url) {
    const script = document.createElement('script');
    script.src = url;
    script.async = false;
    document.head.appendChild(script);
}
if (window.__goaffpro.show_aff_bar) {
    const topbar = document.createElement('div');
    topbar.id = '__goaffpro_topbar';
    document.body.insertBefore(topbar, document.body.firstChild);
}

window.__goaffpro.scripts.forEach(function (script) {
    loadScript(script);
});
