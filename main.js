var scripts = document.getElementsByTagName('script');
var myScript = scripts[scripts.length - 1];

var queryString = myScript.src.replace(/^[^\?]+\??/, '');

var params = parseQuery(queryString);

var recruit = 0;

function parseQuery(query) {
    var Params = {};
    if (!query) return Params; // return empty object
    var Pairs = query.split(/[;&]/);
    for (var i = 0; i < Pairs.length; i++) {
        var KeyVal = Pairs[i].split('=');
        if (!KeyVal || KeyVal.length != 2) continue;
        var key = unescape(KeyVal[0]);
        var val = unescape(KeyVal[1]);
        val = val.replace(/\+/g, ' ');
        Params[key] = val;
    }
    return Params;
}

// All three publication views live in the DOM; .active toggles visibility.
// This preserves scroll position across switches and keeps content reachable
// to screen readers and external deep links regardless of the active view.
var PUB_VIEWS = ['pubs_selected', 'pubs_by_date', 'pubs_by_topic'];

function showPubs(id) {
  for (var i = 0; i < PUB_VIEWS.length; i++) {
    var el = document.getElementById(PUB_VIEWS[i]);
    if (!el) continue;
    if (i === id) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }
  for (var j = 0; j < PUB_VIEWS.length; j++) {
    var tab = document.getElementById('select' + j);
    if (!tab) continue;
    tab.style = (j === id) ? 'text-decoration:underline;color:#000000' : '';
  }
  // Kick lazy-video loader on the newly visible view so videos that just
  // became visible in the viewport start loading.
  var active = document.getElementById(PUB_VIEWS[id]);
  if (active) initLazyVideos(active);
}

// If the page loads with a hash pointing at something inside a hidden view
// (e.g., a #year or #topic anchor, or a specific paper only listed in the
// by-date view), switch to the view containing the hash before the browser
// scrolls.
function syncViewFromHash() {
  var hash = (location.hash || '').replace(/^#/, '');
  if (!hash) return;
  var target = document.getElementById(hash);
  if (!target) {
    // Fallback for legacy <a name="..."> anchors without matching id.
    var named = document.getElementsByName(hash);
    target = named && named.length ? named[0] : null;
  }
  if (!target) return;
  for (var i = 0; i < PUB_VIEWS.length; i++) {
    var view = document.getElementById(PUB_VIEWS[i]);
    if (view && view.contains(target) && !view.classList.contains('active')) {
      showPubs(i);
      // Re-trigger the browser's hash scroll after the view becomes visible.
      setTimeout(function () {
        if (target.scrollIntoView) target.scrollIntoView();
      }, 0);
      return;
    }
  }
}

function showRecruit() {
  if (recruit == 0) {
    document.getElementById('recruit').style='display:inline-block';
  } else {
    document.getElementById('recruit').style='display:none';
  }
  recruit = 1 - recruit;
}

// --- Lazy video loader ---------------------------------------------------
// Videos are authored with <source data-src="..."> (no src yet) and
// preload="none". When a video scrolls near the viewport we swap data-src
// -> src, load(), and play(). When it leaves, we pause to save CPU.
function initLazyVideos(root) {
  root = root || document;
  var videos = root.querySelectorAll('video.lazy-video');
  if (!videos.length) return;

  if (!('IntersectionObserver' in window)) {
    // Fallback: load everything immediately.
    videos.forEach(function (v) {
      v.querySelectorAll('source[data-src]').forEach(function (s) {
        s.src = s.dataset.src;
      });
      v.load();
      v.play().catch(function () {});
    });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var v = entry.target;
      if (entry.isIntersecting) {
        if (!v.dataset.loaded) {
          v.querySelectorAll('source[data-src]').forEach(function (s) {
            s.src = s.dataset.src;
          });
          v.load();
          v.dataset.loaded = '1';
        }
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else if (v.dataset.loaded) {
        v.pause();
      }
    });
  }, { rootMargin: '200px 0px' });

  videos.forEach(function (v) {
    if (v.dataset.observed) return;
    v.dataset.observed = '1';
    io.observe(v);
  });
}

// --- YouTube facade ------------------------------------------------------
// Talks section renders <div class="yt-facade" data-video-id="..."> ... </div>
// and the real iframe is only injected on click.
function initYouTubeFacades() {
  function activate(facade) {
    var id = facade.dataset.videoId;
    if (!id) return;
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1';
    iframe.title = facade.getAttribute('aria-label') || 'YouTube video player';
    iframe.width = '300';
    iframe.height = '169';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('allowfullscreen', '');
    facade.replaceWith(iframe);
  }
  document.querySelectorAll('.yt-facade').forEach(function (facade) {
    facade.addEventListener('click', function () { activate(facade); });
    facade.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(facade); }
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initLazyVideos();
  initYouTubeFacades();
  syncViewFromHash();
});

window.addEventListener('hashchange', syncViewFromHash);
