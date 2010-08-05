this.ars: {
  debug: false
  feed_base: "http://feeds.arstechnica.com/arstechnica/",
  feed_url: null,
  timer: null,
  refresh_interval: 1000 * 60 * safari.extension.settings.refresh_interval,
  next_refresh: new Date(),
  
  log: (msg)->
    console.log msg if ars.debug
  
  settings_changed: (event)->
    console.log(event)
    switch event.key
      when 'section' then ars.change_section(event.newValue)
      when 'refresh_interval' then ars.change_interval(event.newValue)
      
  change_section: (section)->
    ars.feed_url: ars.feed_base + safari.extension.settings.section + '/'
    ars.clear()
    ars.refresh_data(true)
    clearInterval(ars.timer)
    ars.timer: setInterval ()->
      ars.refresh_data(false)
    , ars.refresh_interval
    
  change_interval: (minutes)->
    ars.refresh_interval: 1000 * 60 * minutes
    clearInterval(ars.timer)
    ars.timer: setInterval ()->
      ars.refresh_data(false)
    , ars.refresh_interval
    d: new Date
    n: new Date d.getTime() + ars.refresh_interval
    ars.next_refresh: n
    refresher: document.getElementById 'refresh-link'
    refresher.setAttribute('title', "Next update at: ${ars.next_refresh}")
    
  
  init: ()->
    ars.log "Initilizing"
    ars.feed_url: ars.feed_base + safari.extension.settings.section + '/'
    ars.refresh_data(true)
    # Start refresh timer (30 minutes)
    ars.timer: setInterval ()->
      ars.refresh_data(false)
    , ars.refresh_interval
    
    refresher: document.getElementById 'refresh-link'
    refresher.addEventListener 'click', ars.refresh_button
      
  refresh_button: (e)->
    e.target.className: 'new'
    e.target.addEventListener 'webkitAnimationEnd', (e)->
      e.target.className: ''
    ars.refresh_data()
    clearInterval(ars.timer)
    ars.timer: setInterval ()->
      ars.refresh_data(false)
    , ars.refresh_interval
    false
    
  refresh_data: (animate)->
    animate: or false
    return if not ars.feed_url
    d: new Date
    n: new Date d.getTime() + ars.refresh_interval
    ars.next_refresh: n
    refresher: document.getElementById 'refresh-link'
    refresher.setAttribute('title', "Next update at: ${ars.next_refresh}")
    ars.ajax {
      url: ars.feed_url,
      success: (XMLData)->
        ars.store_articles XMLData, ()->
          ars.refresh_bar animate
    }
  
  store_articles: (XMLData, callback)->
    items: XMLData.getElementsByTagName 'item'
    ars.log "Got ${items.length} from RSS"
    for item in items
      title: item.getElementsByTagName('title')[0].textContent
      link: item.getElementsByTagName('link')[0].textContent
      guid: item.getElementsByTagName('guid')[0].textContent
      date: new Date(item.getElementsByTagName('pubDate')[0].textContent)
      cached_item: ars.get guid
      if !cached_item? or (cached_item.title != title or cached_item.link != link)
        ars.log "New or updated item: ${title}"
        ars.set guid, {
          title: title,
          link: link,
          date: date,
          read: false,
          guid: guid,
          new: if cached_item == null then true else false
        }
    callback() if callback? and typeof callback == 'function'
    null
    
  encode: JSON.stringify,
  decode: JSON.parse,
  ajax: (options)->
    options: or {}
    req: new XMLHttpRequest()

    req.onload: ->
      if req.status == 200 or req.status == 0
        data: req.responseXML
        options.success data  if options.success?
      else
        options.failure req, req.statusText, req.responseText if params.success?

    if options.url 
      ars.log "Requesting ${options.url}"
      req.open 'GET', options.url, true
    else
      return

    if options.reqHeaders
      for key of options.reqHeaders
        req.setRequestHeader key, options.reqHeaders[key]

    req.send ""
    null
  
  sort_by_date: (a,b)->
    if a.date > b.date
      return -1
    else if b.date > a.date
      return 1
    else 
      return 0
  
  get: (key)->
    raw: localStorage[key]
    if raw
      ars.decode localStorage[key] 
    else
      null
  
  get_all: ()->
    items: []
    for key of localStorage
      items.push ars.get key
    items
  
  set: (key, value)->
    localStorage[key]: ars.encode value
    null
    
  clear: ()->
    for key of localStorage
      delete(localStorage[key])
    
  clear_bar: ()->
    stories_div: document.getElementById 'stories'
    n: document.createElement('div')
    p: stories_div.parentElement
    p.removeChild(stories_div)
    n.setAttribute('id','stories')
    p.appendChild(n)
    
  
  refresh_bar: (animate)->
    animate: or false
    ars.log 'refreshing the bar'
    ars.clear_bar()
    # Calculate how many items can fit in this window's width
    articles: ars.get_all()
    articles.sort ars.sort_by_date
    width: document.body.clientWidth
    max_items: Math.floor((width - 71) / 161)
    num: 0
    # Iterate and attach only that many, skipping items which have been
    #  read.
    to_animate: []
    stories_div: document.getElementById('stories')
    for i in [0...articles.length]
      article: articles[i]
      ars.log "${article.title}: ${article.read}"
      continue if article.read == true
      num++
      c: document.createElement 'div'
      c.className: 'story'
      if animate 
        c.className +=   ' offpage'
      if article['new'] == true
        c.className += ' new'
        article['new']: false
        ars.set article.guid, article
      c.innerHTML: "<p><a href='${article.link}' data-guid='${article.guid}' class='story-link'>${article.title}</a></p>"
      stories_div.appendChild c
      to_animate.push(c)
      break if num >= max_items
    
    if animate
      for i in [0...to_animate.length]
        c: to_animate[i]
        ars.animate_up(c, ((i*i)*50)+50)
    
    ars.attach_link_handlers()
    null
  
  animate_up: (item, delay)->
    setTimeout ()->
      item.style.cssText = '-webkit-transition:-webkit-transform 0.6s;-webkit-transform:translate3d(0,0,0);'
      null
    , delay
  
  remove_item: (item)->
    key: item.getAttribute 'data-guid'
    p: item.parentElement.parentElement
    g: p.parentElement
    g.removeChild p
    stored_item: ars.get key
    stored_item.read: true
    ars.set key, stored_item
    ars.refresh_bar(false)
    null
  
  attach_link_handlers: ()->
    links: document.getElementsByClassName 'story-link'
    for link in links
      link.addEventListener 'click', (e)->
        ars.remove_item e.target
        true
}

safari.extension.settings.addEventListener "change", ars.settings_changed, false
ars.init()