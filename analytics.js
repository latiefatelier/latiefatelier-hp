(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root.document) api.init(root);
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';

  const pages = new Set(['/', '/index.html', '/concept.html', '/staff.html', '/pricing.html',
    '/hairstyle.html', '/aging-hair.html', '/hair-treatment.html', '/bleached-hair.html',
    '/blog.html', '/privacy.html']);
  const optOutKey = 'latief.analytics.optOut';

  function pagePath(pathname) {
    return pathname === '/index.html' ? '/' : pages.has(pathname) ? pathname : '/';
  }

  // Only destinations already used by this site can be classified.
  // Never send arbitrary link text, query strings, form values or fragments.
  function destination(href, base) {
    let url;
    try { url = new URL(href, base); } catch { return null; }
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    if (url.hostname === 'beauty.hotpepper.jp' && url.pathname === '/CSP/bt/reserve/' &&
        url.searchParams.get('storeId') === 'H000819673' &&
        url.searchParams.get('stylistId') === 'T001129687') {
      return { event: 'reservation_click', target: 'hotpepper' };
    }
    if (url.hostname === 'lin.ee' && url.pathname === '/6GPeVmwn') {
      return { event: 'line_click', target: 'line' };
    }
    if (url.hostname === 'docs.google.com' && url.pathname ===
        '/forms/d/e/1FAIpQLSenfjEN9BArRA2PpPxyo5vL9c3WmB7zXqXQNt8PEVHBXvngTw/viewform') {
      return { event: 'reservation_form_open', target: 'google_form' };
    }
    if (['www.instagram.com', 'instagram.com'].includes(url.hostname) &&
        /^\/latief_atelier\/?$/.test(url.pathname)) {
      return { event: 'social_click', target: 'instagram' };
    }
    if (['www.tiktok.com', 'tiktok.com'].includes(url.hostname) &&
        /^\/@latiefatelier8\/?$/.test(url.pathname)) {
      return { event: 'social_click', target: 'tiktok' };
    }
    if (url.hostname === 'note.com' && /^\/brave_phlox2184\/?$/.test(url.pathname)) {
      return { event: 'social_click', target: 'note' };
    }
    if (url.hostname === 'maps.app.goo.gl' && url.pathname === '/Fzugw7gSboFW49Jr8') {
      return { event: 'map_click', target: 'google_maps' };
    }
    return null;
  }

  function placement(link) {
    for (const [selector, name] of [
      ['.mobile-reserve-bar', 'mobile_bar'], ['.site-header', 'header'],
      ['.site-footer', 'footer'], ['.atelier-hero', 'hero'],
      ['#reservation', 'reservation'], ['#journal', 'journal'],
      ['.guide-body', 'guide'], ['#access', 'access']
    ]) if (link.closest(selector)) return name;
    return 'content';
  }

  function init(win) {
    if (win.LatiefAnalytics) return win.LatiefAnalytics;
    const doc = win.document;
    const config = win.LATIEF_ANALYTICS_CONFIG || {};
    const id = typeof config.measurementId === 'string' ? config.measurementId.trim() : '';
    const validId = /^G-[A-Z0-9]{6,20}$/.test(id);
    const productionHost = Array.isArray(config.allowedHosts) &&
      config.allowedHosts.includes(win.location.hostname) && win.location.protocol === 'https:';
    const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(win.location.hostname);
    const ready = config.enabled === true && validId && productionHost;
    let optedOut = false;
    try { optedOut = win.localStorage.getItem(optOutKey) === '1'; } catch { /* Private mode may restrict storage. */ }
    let started = false;
    const previewEvents = [];

    function state() {
      if (local) return 'local_preview';
      if (!ready) return 'not_connected';
      return optedOut ? 'opted_out' : 'active';
    }

    function common() {
      // A referrer origin is enough to distinguish referring websites.
      // Its path, query and fragment are not collected by this integration.
      let referrer = '';
      try { if (doc.referrer) referrer = new URL(doc.referrer).origin + '/'; } catch { /* No usable referrer. */ }
      return {
        page_path: pagePath(win.location.pathname),
        page_location: 'https://latiefatelier.com' + pagePath(win.location.pathname),
        page_referrer: referrer
      };
    }

    function refreshControls() {
      const status = doc.getElementById('analytics-status');
      if (status) status.textContent = ({
        local_preview: 'このプレビューでは、アクセス情報をGoogleへ送信していません。',
        not_connected: '現在、このサイトのアクセス解析は停止しています。',
        opted_out: 'このブラウザーでは、アクセス解析を停止しています。',
        active: 'このブラウザーでは、アクセス解析が有効です。'
      })[state()];
      doc.querySelectorAll('[data-analytics-choice]').forEach(button => {
        button.disabled = !ready;
      });
    }

    function start() {
      if (!ready || optedOut || started) return;
      started = true;
      win['ga-disable-' + id] = false;
      win.dataLayer = win.dataLayer || [];
      win.gtag = win.gtag || function () { win.dataLayer.push(arguments); };
      win.gtag('js', new Date());
      win.gtag('config', id, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_flags: 'SameSite=Lax;Secure',
        ...common()
      });
      win.gtag('event', 'page_view', { send_to: id, page_title: doc.title, ...common() });
      const script = doc.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
      script.id = 'latief-ga4-tag';
      doc.head.appendChild(script);
    }

    function record(info, link) {
      const params = { link_destination: info.target, link_placement: placement(link), ...common() };
      if (local) {
        previewEvents.push({ event: info.event, params });
        if (previewEvents.length > 30) previewEvents.shift();
      }
      if (ready && !optedOut && started) win.gtag('event', info.event, { send_to: id, ...params });
    }

    function click(event) {
      if (event.type === 'auxclick' && event.button !== 1) return;
      const link = event.target?.closest?.('a[href]');
      if (!link) return;
      const info = destination(link.href, win.location.origin);
      if (info) record(info, link);
    }
    doc.addEventListener('click', click, true);
    doc.addEventListener('auxclick', click, true);
    doc.querySelectorAll('[data-analytics-choice]').forEach(button => {
      button.addEventListener('click', () => {
        optedOut = button.getAttribute('data-analytics-choice') === 'stop';
        try { win.localStorage.setItem(optOutKey, optedOut ? '1' : '0'); } catch { /* Apply for the current page. */ }
        if (validId) win['ga-disable-' + id] = optedOut;
        start();
        refreshControls();
      });
    });
    const api = Object.freeze({ state, previewEvents });
    win.LatiefAnalytics = api;
    start();
    refreshControls();
    return api;
  }
  return { destination, pagePath, init };
});
