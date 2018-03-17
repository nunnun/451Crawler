var cheerio = require("cheerio"),
    urlMod = require("url");

module.exports = function (opts) {
  if (!opts) {
    opts = {};
  }

  return function (context) {
    var $;

    $ = context.$ || cheerio.load(context.body);
    context.$ = $;

    return $("a[href], link[href][rel=alternate]").map(function () {
      var $this,
          targetHref,
          absoluteTargetUrl,
          urlObj,
          protocol,
          hostname;

      $this = $(this);
      targetHref = $this.attr("href");
      absoluteTargetUrl = urlMod.resolve(context.url, targetHref);
      urlObj = urlMod.parse(absoluteTargetUrl);
      protocol = urlObj.protocol;
      hostname = urlObj.hostname;

      if (protocol !== "http:" && protocol !== "https:") {
        return null;
      }

      if(typeof opts.hostnames !== "undefined"){
        if(!(hostname in opts.hostnames)){
          return null;
        }else{
          if(typeof opts.hostnames[hostname] == Object){
            var pattern = opts.hostnames[hostname];
            var parts = pattern.match(uri.pathname);
            if(!parts){
              return null;
            }
          }
        }
      }

      return urlMod.format({
        protocol: urlObj.protocol,
        auth: urlObj.auth,
        host: urlObj.host,
        pathname: urlObj.pathname,
        search: urlObj.search
      });
    }).get();
  };
};
