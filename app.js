const supercrawler = require("supercrawler");
const UrlPattern = require("url-pattern")
const htmlLinkParser = require("./htmlLinkParser");
const axios = require('axios');
const Base64 = require('js-base64').Base64;
const parseLinkHeader = require('parse-link-header');


const AGENT = {
  name: "451Crawler",
  version: "0.0.1"
}

// 1. Create a new instance of the Crawler object, providing configuration
// details. Note that configuration cannot be changed after the object is
// created.
var crawler = new supercrawler.Crawler({
  // By default, Supercrawler uses a simple FIFO queue, which doesn't support
  // retries or memory of crawl state. For any non-trivial crawl, you should
  // create a database. Provide your database config to the constructor of
  // DbUrlList.

  // urlList: new supercrawler.RedisUrlList({
  //   redis: {
  //     host: "127.0.0.1"
  //   }
  // }),

  // Tme (ms) between requests
  interval: 1000,
  // Maximum number of requests at any one time.
  concurrentRequestsLimit: 5,
  // Time (ms) to cache the results of robots.txt queries.
  robotsCacheTime: 3600000,
  // Query string to use during the crawl.
  userAgent: "Mozilla/5.0 (compatible; supercrawler/1.0; +https://github.com/brendonboshell/supercrawler)"
});

var externalIP;

// Get "Sitemaps:" directives from robots.txt
crawler.addHandler(supercrawler.handlers.robotsParser());

// Crawl sitemap files and extract their URLs.
crawler.addHandler(supercrawler.handlers.sitemapsParser());

// Pick up <a href> links from HTML documents
crawler.addHandler("text/html", htmlLinkParser({
  // Restrict discovered links to the following hostnames.
  // hostnames: ["dretzq.co.uk"]
  hostnames: {
    "reddit.com": new UrlPattern('/r/:subreddit(/)'),
    "www.reddit.com": new UrlPattern('/r/:subreddit(/)'),
    "redditlist.com": new UrlPattern('/nsfw(?page=:pg)'),
    "dretzq.co.uk": null,
  }
}));

// Custom content handler for HTML pages.
crawler.addHandler(function(context) {
  res = {
    date: new Date(),
    creator: AGENT.name,
    version: AGENT.version,
    clientIP: externalIP,
    url: context.url,
    urlEncoded: Base64.encode(context.url),
    status: context.response.statusCode,
    statusMessage: context.response.statusMessage
  }

  if("link" in context.response.headers){
    var linkHeader = parseLinkHeader(context.response.headers['link']);
    if (linkHeader && linkHeader['blocked-by']){
      res['blockedBy'] = linkHeader['blocked-by'].url;
    }
  }

  if(context.response.statusCode == 451){
    axios.post("http://31.133.134.193:3000/report/", res)
        .then(function (response) {
            console.log("Found and Reported: " + JSON.parse(response.config.data).url);
        })
        .catch(function (error) {
          console.error(error);
        });
  }
});

axios.get('https://api.ipify.org')
.then(res => {
  externalIP = res.data;
}).then(()=>{
  crawler.getUrlList()
    .insertIfNotExists(new supercrawler.Url("http://dretzq.co.uk/test451/"))
    .then(function() {
      return crawler.start();
    });
})
