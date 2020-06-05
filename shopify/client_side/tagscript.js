window.__lifo = {
    lifo: true,
};
(function () {
    function asyncLoad() {
        const urls = ["https:\/\/script.lifo.ai\/app.js"];
        for (let i = 0; i < urls.length; i++) {
            const s = document.createElement('script');
            s.type = 'text/javascript';
            s.async = true;
            s.src = urls[i];
            const x = document.getElementsByTagName('script')[0];
            x.parentNode.insertBefore(s, x);
        }
    };
    if(window.attachEvent) {
        window.attachEvent('onload', asyncLoad);
    } else {
        window.addEventListener('load', asyncLoad, false);
    }
})();
