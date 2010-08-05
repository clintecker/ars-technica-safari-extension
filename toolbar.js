var ars;
var __hasProp = Object.prototype.hasOwnProperty;
ars = {
  debug: false,
  feed_base: "http://feeds.arstechnica.com/arstechnica/",
  feed_url: null,
  timer: null,
  refresh_interval: 1000 * 60 * safari.extension.settings.refresh_interval,
  next_refresh: new Date(),
  log: function(msg) {
    if (this.debug) {
      return console.log(msg);
    }
  },
  change_section: function(section) {
    this.feed_url = this.feed_base + safari.extension.settings.section + '/';
    this.clear();
    this.refresh_data(true);
    clearInterval(this.timer);
    this.timer = setInterval(((function(__this) {
      var __func = function() {
        return this.refresh_data(false);
      };
      return (function() {
        return __func.apply(__this, arguments);
      });
    })(this)), this.refresh_interval);
    return null;
  },
  change_interval: function(minutes) {
    var d, n, refresher;
    this.refresh_interval = 1000 * 60 * minutes;
    clearInterval(this.timer);
    this.timer = setInterval(((function(__this) {
      var __func = function() {
        return this.refresh_data(false);
      };
      return (function() {
        return __func.apply(__this, arguments);
      });
    })(this)), this.refresh_interval);
    d = new Date();
    n = new Date(d.getTime() + this.refresh_interval);
    this.next_refresh = n;
    refresher = document.getElementById('refresh-link');
    refresher.setAttribute('title', ("Next update at: " + (this.next_refresh)));
    return null;
  },
  settings_changed: function(event) {
    var _a;
    if ((_a = event.key) === 'section') {
      return this.change_section(event.newValue);
    } else if (_a === 'refresh_interval') {
      return this.change_interval(event.newValue);
    }
  },
  init: function() {
    var refresher;
    this.log("Initilizing");
    this.feed_url = this.feed_base + safari.extension.settings.section + '/';
    this.refresh_data(true);
    this.timer = setInterval(((function(__this) {
      var __func = function() {
        return this.refresh_data(false);
      };
      return (function() {
        return __func.apply(__this, arguments);
      });
    })(this)), this.refresh_interval);
    refresher = document.getElementById('refresh-link');
    return refresher.addEventListener('click', ((function(__this) {
      var __func = function(e) {
        return this.refresh_button(e);
      };
      return (function() {
        return __func.apply(__this, arguments);
      });
    })(this)));
  },
  refresh_button: function(e) {
    e.target.className = 'new';
    e.target.addEventListener('webkitAnimationEnd', function(e) {
      e.target.className = '';
      return e.target.className;
    });
    this.refresh_data();
    clearInterval(this.timer);
    this.timer = setInterval(((function(__this) {
      var __func = function() {
        return this.refresh_data(false);
      };
      return (function() {
        return __func.apply(__this, arguments);
      });
    })(this)), this.refresh_interval);
    return false;
  },
  refresh_data: function(animate) {
    var d, n, refresher;
    animate = animate || false;
    if (!this.feed_url) {
      return null;
    }
    d = new Date();
    n = new Date(d.getTime() + this.refresh_interval);
    this.next_refresh = n;
    refresher = document.getElementById('refresh-link');
    refresher.setAttribute('title', ("Next update at: " + (this.next_refresh)));
    return this.ajax({
      url: this.feed_url,
      success: (function(__this) {
        var __func = function(XMLData) {
          return this.store_articles(XMLData, (function(__this) {
            var __func = function() {
              return this.refresh_bar(animate);
            };
            return (function() {
              return __func.apply(__this, arguments);
            });
          })(this));
        };
        return (function() {
          return __func.apply(__this, arguments);
        });
      })(this)
    });
  },
  store_articles: function(XMLData, callback) {
    var _a, _b, _c, cached_item, date, guid, item, items, link, title;
    items = XMLData.getElementsByTagName('item');
    this.log(("Got " + (items.length) + " from RSS"));
    _b = items;
    for (_a = 0, _c = _b.length; _a < _c; _a++) {
      item = _b[_a];
      title = item.getElementsByTagName('title')[0].textContent;
      link = item.getElementsByTagName('link')[0].textContent;
      guid = item.getElementsByTagName('guid')[0].textContent;
      date = new Date(item.getElementsByTagName('pubDate')[0].textContent);
      cached_item = this.get(guid);
      if (!(typeof cached_item !== "undefined" && cached_item !== null) || (cached_item.title !== title || cached_item.link !== link)) {
        this.log(("New or updated item: " + (title)));
        this.set(guid, {
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
    req.onload = (function(__this) {
      var __func = function() {
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
      return (function() {
        return __func.apply(__this, arguments);
      });
    })(this);
    if (options.url) {
      this.log(("Requesting " + (options.url)));
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
    return localStorage[key] ? this.decode(localStorage[key]) : null;
  },
  get_all: function() {
    var _a, _b, key;
    _a = []; _b = localStorage;
    for (key in _b) { if (__hasProp.call(_b, key)) {
      _a.push(this.get(key));
    }}
    return _a;
  },
  set: function(key, value) {
    localStorage[key] = this.encode(value);
    return localStorage[key];
  },
  clear: function() {
    var _a, _b, key;
    _a = []; _b = localStorage;
    for (key in _b) { if (__hasProp.call(_b, key)) {
      _a.push(delete localStorage[key]);
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
    this.log('refreshing the bar');
    this.clear_bar();
    articles = this.get_all();
    articles.sort(this.sort_by_date);
    width = document.body.clientWidth;
    max_items = Math.floor((width - 71) / 161);
    num = 0;
    to_animate = [];
    stories_div = document.getElementById('stories');
    (_a = articles.length);

    for (i = 0; i < _a; i += 1) {
      article = articles[i];
      this.log(("" + (article.title) + ": " + (article.read)));
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
        this.set(article.guid, article);
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
        this.animate_up(c, ((i * i) * 50) + 50);
      }
    }
    this.attach_link_handlers();
    return null;
  },
  animate_up: function(item, delay) {
    return setTimeout(((function(__this) {
      var __func = function() {
        item.style.cssText = '-webkit-transition:-webkit-transform 0.6s;-webkit-transform:translate3d(0,0,0);';
        return item.style.cssText;
      };
      return (function() {
        return __func.apply(__this, arguments);
      });
    })(this)), delay);
  },
  remove_item: function(item) {
    var g, key, p, stored_item;
    key = item.getAttribute('data-guid');
    p = item.parentElement.parentElement;
    g = p.parentElement;
    g.removeChild(p);
    stored_item = this.get(key);
    stored_item.read = true;
    this.set(key, stored_item);
    this.refresh_bar(false);
    return null;
  },
  attach_link_handlers: function() {
    var _a, _b, _c, _d, links;
    links = document.getElementsByClassName('story-link');
    _a = []; _c = links;
    for (_b = 0, _d = _c.length; _b < _d; _b++) {
      (function() {
        var link = _c[_b];
        return _a.push(link.addEventListener('click', ((function(__this) {
          var __func = function(e) {
            return this.remove_item(e.target);
          };
          return (function() {
            return __func.apply(__this, arguments);
          });
        })(this)), true));
      }).call(this);
    }
    return _a;
  }
};
safari.extension.settings.addEventListener("change", ((function(__this) {
  var __func = function(e) {
    return ars.settings_changed(e);
  };
  return (function() {
    return __func.apply(__this, arguments);
  });
})(this)), false);
ars.init();