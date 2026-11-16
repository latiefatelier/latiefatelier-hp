const test = require('node:test');
const assert = require('node:assert/strict');
const { destination, pagePath, init } = require('./analytics.js');

const hp = 'https://beauty.hotpepper.jp/CSP/bt/reserve/?storeId=H000819673&stylistId=T001129687';
function environment({ hostname = 'latiefatelier.com', enabled = true, optedOut = false } = {}) {
  const handlers = {};
  const scripts = [];
  const storage = new Map(optedOut ? [['latief.analytics.optOut', '1']] : []);
  const status = { textContent: '' };
  const choices = ['stop', 'allow'].map(choice => ({
    disabled: false, handlers: {},
    getAttribute: () => choice,
    addEventListener(type, listener) { this.handlers[type] = listener; }
  }));
  const win = {
    location: { hostname, origin: 'https://' + hostname, protocol: 'https:', pathname: '/index.html',
      search: '?email=private@example.com', hash: '#private' },
    LATIEF_ANALYTICS_CONFIG: { enabled, measurementId: 'G-1234567890', allowedHosts: ['latiefatelier.com'] },
    localStorage: { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v) },
    document: {
      title: 'Latief Atelier', referrer: 'https://example.com/private/path?email=private@example.com',
      head: { appendChild: x => scripts.push(x) },
      createElement: () => ({}), getElementById: () => status, querySelectorAll: () => choices,
      addEventListener(type, listener) { (handlers[type] ||= []).push(listener); }
    }
  };
  function click(href, selector = '.mobile-reserve-bar') {
    const link = { href, closest: s => s === selector };
    handlers.click.forEach(listener => listener({ type: 'click', target: { closest: () => link } }));
  }
  return { win, handlers, scripts, choices, click };
}
function events(win) { return (win.dataLayer || []).map(x => [...x]).filter(x => x[0] === 'event'); }

test('counts the correct booking destination; other staff and unsafe links are excluded', () => {
  assert.equal(destination(hp).event, 'reservation_click');
  assert.equal(destination(hp.replace('T001129687', 'T000000000')), null);
  assert.equal(destination('javascript:alert(1)'), null);
  assert.equal(destination('https://unrelated.example/'), null);
});
test('distinguishes consultation, social channels, forms and maps from completed bookings', () => {
  assert.deepEqual(destination('https://lin.ee/6GPeVmwn'), { event: 'line_click', target: 'line' });
  assert.deepEqual(destination('https://www.instagram.com/latief_atelier/?igsh=private'), { event: 'social_click', target: 'instagram' });
  assert.equal(destination('https://www.tiktok.com/@latiefatelier8').target, 'tiktok');
  assert.equal(destination('https://note.com/brave_phlox2184').target, 'note');
  assert.equal(destination('https://docs.google.com/forms/d/e/1FAIpQLSenfjEN9BArRA2PpPxyo5vL9c3WmB7zXqXQNt8PEVHBXvngTw/viewform').event, 'reservation_form_open');
  assert.equal(destination('https://maps.app.goo.gl/Fzugw7gSboFW49Jr8?g_st=ic').event, 'map_click');
});
test('no requests or dataLayer are created on previews, unknown hosts or disabled configurations', () => {
  for (const options of [{hostname:'127.0.0.1'}, {hostname:'preview.example'}, {enabled:false}]) {
    const env = environment(options); init(env.win); env.click(hp);
    assert.equal(env.scripts.length, 0); assert.equal(env.win.dataLayer, undefined);
  }
});
test('one page view and one classified click; no duplicate initialization or private URL values', () => {
  const env = environment(); init(env.win); init(env.win); env.click(hp);
  const rows = events(env.win);
  assert.equal(env.scripts.length, 1);
  assert.deepEqual(rows.map(x=>x[1]), ['page_view','reservation_click']);
  assert.equal(rows[1][2].link_placement, 'mobile_bar');
  assert.equal(rows[0][2].page_path, '/');
  assert.equal(rows[0][2].page_referrer, 'https://example.com/');
  const payload = JSON.stringify(env.win.dataLayer);
  assert.equal(payload.includes('private'), false);
  assert.equal(payload.includes('stylistId'), false);
});
test('an opt-out prevents initialization and remains effective for clicks', () => {
  const env = environment({optedOut:true}); init(env.win); env.click(hp);
  assert.equal(env.scripts.length,0); assert.equal(events(env.win).length,0);
  env.choices[1].handlers.click(); env.click(hp); // A visitor explicitly permits analytics.
  assert.equal(env.scripts.length,1); assert.equal(events(env.win).length,2);
  env.choices[0].handlers.click(); env.click(hp);
  assert.equal(env.win['ga-disable-G-1234567890'],true); assert.equal(events(env.win).length,2);
});
test('local preview can inspect event names without sending anything', () => {
  const env = environment({hostname:'localhost'}); const api = init(env.win); env.click(hp);
  assert.equal(api.state(),'local_preview'); assert.equal(api.previewEvents[0].event,'reservation_click');
  assert.equal(env.win.dataLayer,undefined); assert.equal(env.scripts.length,0);
});
test('index and root are aggregated together; unknown paths are not passed through', () => {
  assert.equal(pagePath('/index.html'),'/'); assert.equal(pagePath('/'),'/');
  assert.equal(pagePath('/aging-hair.html'),'/aging-hair.html');
  assert.equal(pagePath('/private@example.com'),'/');
});
