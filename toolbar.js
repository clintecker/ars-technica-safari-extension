var __hasProp = Object.prototype.hasOwnProperty;
this.ars = {
  debug: false,
  feed_base: "http://feeds.arstechnica.com/arstechnica/",
  feed_url: null,
  timer: null,
  refresh_interval: 1000 * 60 * safari.extension.settings.refresh_interval,
  next_refresh: new Date(),
  log: function(msg) {
    if (ars.debug) {
      return console.log(msg);
    }
  },
  settings_changed: function(event) {
    var _a;
    console.log(event);
    if ((_a = event.key) === 'section') {
      return ars.change_section(event.newValue);
    } else if (_a === 'refresh_interval') {
      return ars.change_interval(event.newValue);
    }
  },
  change_section: function(section) {
    ars.feed_url = ars.feed_base + safari.extension.settings.section + '/';
    ars.clear();
    ars.refresh_data(true);
    clearInterval(ars.timer);
    ars.timer = setInterval(function() {
      return ars.refresh_data(false);
    }, ars.refresh_interval);
    return ars.timer;
  },
  change_interval: function(minutes) {
    var d, n, refresher;
    ars.refresh_interval = 1000 * 60 * minutes;
    clearInterval(ars.timer);
    ars.timer = setInterval(function() {
      return ars.refresh_data(false);
    }, ars.refresh_interval);
    d = new Date();
    n = new Date(d.getTime() + ars.refresh_interval);
    ars.next_refresh = n;
    refresher = document.getElementById('refresh-link');
    return refresher.setAttribute('title', ("Next update at: " + (ars.next_refresh)));
  },
  init: function() {
    var refresher;
    ars.log("Initilizing");
    ars.feed_url = ars.feed_base + safari.extension.settings.section + '/';
    ars.refresh_data(true);
    ars.timer = setInterval(function() {
      return ars.refresh_data(false);
    }, ars.refresh_interval);
    refresher = document.getElementById('refresh-link');
    return refresher.addEventListener('click', ars.refresh_button);
  },
  refresh_button: function(e) {
    e.target.className = 'new';
    e.target.addEventListener('webkitAnimationEnd', function(e) {
      e.target.className = '';
      return e.target.className;
    });
    ars.refresh_data();
    clearInterval(ars.timer);
    ars.timer = setInterval(function() {
      return ars.refresh_data(false);
    }, ars.refresh_interval);
    return false;
  },
  refresh_data: function(animate) {
    var d, n, refresher;
    animate = animate || false;
    if (!ars.feed_url) {
      return null;
    }
    d = new Date();
    n = new Date(d.getTime() + ars.refresh_interval);
    ars.next_refresh = n;
    refresher = document.getElementById('refresh-link');
    refresher.setAttribute('title', ("Next update at: " + (ars.next_refresh)));
    return ars.ajax({
      url: ars.feed_url,
      success: function(XMLData) {
        return ars.store_articles(XMLData, function() {
          return ars.refresh_bar(animate);
        });
      }
    });
  },
  store_articles: function(XMLData, callback) {
    var _a, _b, _c, cached_item, date, guid, item, items, link, title;
    items = XMLData.getElementsByTagName('item');
    ars.log(("Got " + (items.length) + " from RSS"));
    _b = items;
    for (_a = 0, _c = _b.length; _a < _c; _a++) {
      item = _b[_a];
      title = item.getElementsByTagName('title')[0].textContent;
      link = item.getElementsByTagName('link')[0].textContent;
      guid = item.getElementsByTagName('guid')[0].textContent;
      date = new Date(item.getElementsByTagName('pubDate')[0].textContent);
      cached_item = ars.get(guid);
      if (!(typeof cached_item !== "undefined" && cached_item !== null) || (cached_item.title !== title || cached_item.link !== link)) {
        ars.log(("New or updated item: " + (title)));
        ars.set(guid, {
          title: title,
          link: link,
          date: date,
          read: false,
          guid: guid,
          'new': cached_item === null ? true : false
        });
      }
    }
    if ((typeof callback !== "undefined" && callback !== null) && typeof callback === 'function') {
      callback();
    }
    return null;
  },
  encode: JSON.stringify,
  decode: JSON.parse,
  ajax: function(options) {
    var _a, key, req;
    options = options || {};
    req = new XMLHttpRequest();
    req.onload = function() {
      var _a, _b, data;
      if (req.status === 200 || req.status === 0) {
        data = req.responseXML;
        if ((typeof (_a = options.success) !== "undefined" && _a !== null)) {
          return options.success(data);
        }
      } else {
        if ((typeof (_b = params.success) !== "undefined" && _b !== null)) {
          return options.failure(req, req.statusText, req.responseText);
        }
      }
    };
    if (options.url) {
      ars.log(("Requesting " + (options.url)));
      req.open('GET', options.url, true);
    } else {
      return null;
    }
    if (options.reqHeaders) {
      _a = options.reqHeaders;
      for (key in _a) { if (__hasProp.call(_a, key)) {
        req.setRequestHeader(key, options.reqHeaders[key]);
      }}
    }
    req.send("");
    return null;
  },
  sort_by_date: function(a, b) {
    if (a.date > b.date) {
      return -1;
    } else if (b.date > a.date) {
      return 1;
    } else {
      return 0;
    }
  },
  get: function(key) {
    var raw;
    raw = localStorage[key];
    return raw ? ars.decode(localStorage[key]) : null;
  },
  get_all: function() {
    var _a, items, key;
    items = [];
    _a = localStorage;
    for (key in _a) { if (__hasProp.call(_a, key)) {
      items.push(ars.get(key));
    }}
    return items;
  },
  set: function(key, value) {
    localStorage[key] = ars.encode(value);
    return null;
  },
  clear: function() {
    var _a, _b, key;
    _a = []; _b = localStorage;
    for (key in _b) { if (__hasProp.call(_b, key)) {
      _a.push(delete (localStorage[key]));
    }}
    return _a;
  },
  clear_bar: function() {
    var n, p, stories_div;
    stories_div = document.getElementById('stories');
    n = document.createElement('div');
    p = stories_div.parentElement;
    p.removeChild(stories_div);
    n.setAttribute('id', 'stories');
    return p.appendChild(n);
  },
  refresh_bar: function(animate) {
    var _a, _b, article, articles, c, i, max_items, num, stories_div, to_animate, width;
    animate = animate || false;
    ars.log('refreshing the bar');
    ars.clear_bar();
    articles = ars.get_all();
    articles.sort(ars.sort_by_date);
    width = document.body.clientWidth;
    max_items = Math.floor((width - 71) / 161);
    num = 0;
    to_animate = [];
    stories_div = document.getElementById('stories');
    (_a = articles.length);

    for (i = 0; i < _a; i += 1) {
      article = articles[i];
      ars.log(("" + (article.title) + ": " + (article.read)));
      if (article.read === true) {
        continue;
      }
      num++;
      c = document.createElement('div');
      c.className = 'story';
      animate ? c.className += ' offpage' : null;
      if (article['new'] === true) {
        c.className += ' new';
        article['new'] = false;
        ars.set(article.guid, article);
      }
      c.innerHTML = ("<p><a href='" + (article.link) + "' data-guid='" + (article.guid) + "' class='story-link'>" + (article.title) + "</a></p>");
      stories_div.appendChild(c);
      to_animate.push(c);
      if (num >= max_items) {
        break;
      }
    }
    if (animate) {
      (_b = to_animate.length);

      for (i = 0; i < _b; i += 1) {
        c = to_animate[i];
        ars.animate_up(c, ((i * i) * 50) + 50);
      }
    }
    ars.attach_link_handlers();
    return null;
  },
  animate_up: function(item, delay) {
    return setTimeout(function() {
      item.style.cssText = '-webkit-transition:-webkit-transform 0.6s;-webkit-transform:translate3d(0,0,0);';
      return null;
    }, delay);
  },
  remove_item: function(item) {
    var g, key, p, stored_item;
    key = item.getAttribute('data-guid');
    p = item.parentElement.parentElement;
    g = p.parentElement;
    g.removeChild(p);
    stored_item = ars.get(key);
    stored_item.read = true;
    ars.set(key, stored_item);
    ars.refresh_bar(false);
    return null;
  },
  attach_link_handlers: function() {
    var _a, _b, _c, _d, links;
    links = document.getElementsByClassName('story-link');
    _a = []; _c = links;
    for (_b = 0, _d = _c.length; _b < _d; _b++) {
      (function() {
        var link = _c[_b];
        return _a.push(link.addEventListener('click', function(e) {
          ars.remove_item(e.target);
          return true;
        }));
      })();
    }
    return _a;
  }
};
safari.extension.settings.addEventListener("change", ars.settings_changed, false);
ars.init();