ars = {
  debug: false
  feed_base: "http://feeds.arstechnica.com/arstechnica/",
  feed_url: null,
  timer: null,
  refresh_interval: 1000 * 60 * safari.extension.settings.refresh_interval,
  next_refresh: new Date,
  log: (msg)-> console.log msg if @debug
  
  change_section: (section)->
    @feed_url = @feed_base + safari.extension.settings.section + '/'
    @clear()
    @refresh_data true
    clearInterval @timer
    @timer = setInterval (=> @refresh_data false), @refresh_interval
    null
    
  change_interval: (minutes)->
    @refresh_interval = 1000 * 60 * minutes
    clearInterval @timer
    @timer = setInterval (=> @refresh_data false), @refresh_interval
    d = new Date
    n = new Date d.getTime() + @refresh_interval
    @next_refresh = n
    refresher = document.getElementById 'refresh-link'
    refresher.setAttribute 'title', "Next update at: ${@next_refresh}"
    null
  
  settings_changed: (event)->
    switch event.key
      when 'section' then @change_section event.newValue
      when 'refresh_interval' then @change_interval event.newValue
    
  init: ->
    @log "Initilizing"
    @feed_url = @feed_base + safari.extension.settings.section + '/'
    @refresh_data true
    # Start refresh timer (30 minutes)
    @timer = setInterval (=> @refresh_data false), @refresh_interval
    refresher = document.getElementById 'refresh-link'
    refresher.addEventListener 'click', ((e)=> @refresh_button(e))
      
  refresh_button: (e)->
    e.target.className = 'new'
    e.target.addEventListener 'webkitAnimationEnd', (e)->
      e.target.className = ''
    @refresh_data()
    clearInterval @timer
    @timer = setInterval (=> @refresh_data false), @refresh_interval
    false
    
  refresh_data: (animate)->
    animate =or false
    return if not @feed_url
    d = new Date
    n = new Date d.getTime() + @refresh_interval
    @next_refresh = n
    refresher = document.getElementById 'refresh-link'
    refresher.setAttribute 'title', "Next update at: ${@next_refresh}"
    @ajax {
      url: @feed_url,
      success: (XMLData)=>
        @store_articles XMLData, ()=>
          @refresh_bar animate
    }
  
  store_articles: (XMLData, callback)->
    items = XMLData.getElementsByTagName 'item'
    @log "Got ${items.length} from RSS"
    for item in items
      title = item.getElementsByTagName('title')[0].textContent
      link = item.getElementsByTagName('link')[0].textContent
      guid = item.getElementsByTagName('guid')[0].textContent
      date = new Date item.getElementsByTagName('pubDate')[0].textContent
      cached_item = @get guid
      if !cached_item? or (cached_item.title != title or cached_item.link != link)
        @log "New or updated item: ${title}"
        @set guid, {
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
    options =or {}
    req = new XMLHttpRequest()

    req.onload = =>
      if req.status == 200 or req.status == 0
        data = req.responseXML
        options.success data if options.success?
      else
        options.failure req, req.statusText, req.responseText if params.success?

    if options.url 
      @log "Requesting ${options.url}"
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
    if localStorage[key] then @decode localStorage[key] else null
      
  get_all: ()->
    @get key for key of localStorage
     
  set: (key, value)->
    localStorage[key] = @encode value
        
  clear: ()->
    for key of localStorage
      delete localStorage[key]
    
  clear_bar: ()->
    stories_div = document.getElementById 'stories'
    n = document.createElement 'div'
    p = stories_div.parentElement
    p.removeChild stories_div
    n.setAttribute 'id','stories'
    p.appendChild n
  
  refresh_bar: (animate)->
    animate =or false
    @log 'refreshing the bar'
    @clear_bar()
    # Calculate how many items can fit in this window's width
    articles = @get_all()
    articles.sort @sort_by_date
    width = document.body.clientWidth
    max_items = Math.floor((width - 71) / 161)
    num = 0
    # Iterate and attach only that many, skipping items which have been
    #  read.
    to_animate = []
    stories_div = document.getElementById 'stories'
    for i in [0...articles.length]
      article = articles[i]
      @log "${article.title}: ${article.read}"
      continue if article.read == true
      num++
      c = document.createElement 'div'
      c.className = 'story'
      if animate 
        c.className += ' offpage'
      if article['new'] == true
        c.className += ' new'
        article['new'] = false
        @set article.guid, article
      c.innerHTML = "<p><a href='${article.link}' data-guid='${article.guid}' class='story-link'>${article.title}</a></p>"
      stories_div.appendChild c
      to_animate.push(c)
      break if num >= max_items
    
    if animate
      for i in [0...to_animate.length]
        c = to_animate[i]
        @animate_up c, ((i*i)*50)+50
    
    @attach_link_handlers()
    null
  
  animate_up: (item, delay)->
    setTimeout (=> item.style.cssText = '-webkit-transition:-webkit-transform 0.6s;-webkit-transform:translate3d(0,0,0);'), delay
  
  remove_item: (item)->
    key = item.getAttribute 'data-guid'
    p = item.parentElement.parentElement
    g = p.parentElement
    g.removeChild p
    stored_item = @get key
    stored_item.read = true
    @set key, stored_item
    @refresh_bar false
    null
  
  attach_link_handlers: ()->
    links = document.getElementsByClassName 'story-link'
    for link in links
      link.addEventListener 'click', ((e)=> @remove_item e.target), true
}

safari.extension.settings.addEventListener "change", ((e)=>ars.settings_changed(e)), false
ars.init()