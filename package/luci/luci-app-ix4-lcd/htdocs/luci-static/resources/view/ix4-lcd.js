/* ==========================================================================
 * Section 1: Lenovo Iomega ix4-300d Front-Panel ST7565R LCD Configuration
 * Manages UCI /etc/config/ix4-lcd rows, scroll speeds, contrast & logo PNG.
 * ========================================================================== */
'use strict';
'require view';
'require form';
'require fs';
'require rpc';
'require uci';
'require ui';
'require poll';

var _ = (typeof L !== 'undefined' && L.tr) ? L.tr.bind(L) : function(s) { return s; };

var FONT5X7 = [
[0x00,0x00,0x00,0x00,0x00],
[0x00,0x00,0x5f,0x00,0x00],
[0x00,0x07,0x00,0x07,0x00],
[0x14,0x7f,0x14,0x7f,0x14],
[0x24,0x2a,0x7f,0x2a,0x12],
[0x23,0x13,0x08,0x64,0x62],
[0x36,0x49,0x55,0x22,0x50],
[0x00,0x05,0x03,0x00,0x00],
[0x00,0x1c,0x22,0x41,0x00],
[0x00,0x41,0x22,0x1c,0x00],
[0x14,0x08,0x3e,0x08,0x14],
[0x08,0x08,0x3e,0x08,0x08],
[0x00,0x50,0x30,0x00,0x00],
[0x08,0x08,0x08,0x08,0x08],
[0x00,0x60,0x60,0x00,0x00],
[0x20,0x10,0x08,0x04,0x02],
[0x3e,0x51,0x49,0x45,0x3e],
[0x00,0x42,0x7f,0x40,0x00],
[0x42,0x61,0x51,0x49,0x46],
[0x21,0x41,0x45,0x4b,0x31],
[0x18,0x14,0x12,0x7f,0x10],
[0x27,0x45,0x45,0x45,0x39],
[0x3c,0x4a,0x49,0x49,0x30],
[0x01,0x71,0x09,0x05,0x03],
[0x36,0x49,0x49,0x49,0x36],
[0x06,0x49,0x49,0x29,0x1e],
[0x00,0x36,0x36,0x00,0x00],
[0x00,0x56,0x36,0x00,0x00],
[0x08,0x14,0x22,0x41,0x00],
[0x14,0x14,0x14,0x14,0x14],
[0x00,0x41,0x22,0x14,0x08],
[0x02,0x01,0x51,0x09,0x06],
[0x32,0x49,0x79,0x41,0x3e],
[0x7e,0x11,0x11,0x11,0x7e],
[0x7f,0x49,0x49,0x49,0x36],
[0x3e,0x41,0x41,0x41,0x22],
[0x7f,0x41,0x41,0x22,0x1c],
[0x7f,0x49,0x49,0x49,0x41],
[0x7f,0x09,0x09,0x09,0x01],
[0x3e,0x41,0x49,0x49,0x7a],
[0x7f,0x08,0x08,0x08,0x7f],
[0x00,0x41,0x7f,0x41,0x00],
[0x20,0x40,0x41,0x3f,0x01],
[0x7f,0x08,0x14,0x22,0x41],
[0x7f,0x40,0x40,0x40,0x40],
[0x7f,0x02,0x0c,0x02,0x7f],
[0x7f,0x04,0x08,0x10,0x7f],
[0x3e,0x41,0x41,0x41,0x3e],
[0x7f,0x09,0x09,0x09,0x06],
[0x3e,0x41,0x51,0x21,0x5e],
[0x7f,0x09,0x19,0x29,0x46],
[0x46,0x49,0x49,0x49,0x31],
[0x01,0x01,0x7f,0x01,0x01],
[0x3f,0x40,0x40,0x40,0x3f],
[0x1f,0x20,0x40,0x20,0x1f],
[0x3f,0x40,0x38,0x40,0x3f],
[0x63,0x14,0x08,0x14,0x63],
[0x07,0x08,0x70,0x08,0x07],
[0x61,0x51,0x49,0x45,0x43],
[0x00,0x7f,0x41,0x41,0x00],
[0x02,0x04,0x08,0x10,0x20],
[0x00,0x41,0x41,0x7f,0x00],
[0x04,0x02,0x01,0x02,0x04],
[0x40,0x40,0x40,0x40,0x40],
[0x00,0x01,0x02,0x04,0x00],
[0x20,0x54,0x54,0x54,0x78],
[0x7f,0x48,0x44,0x44,0x38],
[0x38,0x44,0x44,0x44,0x20],
[0x38,0x44,0x44,0x48,0x7f],
[0x38,0x54,0x54,0x54,0x18],
[0x08,0x7e,0x09,0x01,0x02],
[0x0c,0x52,0x52,0x52,0x3e],
[0x7f,0x08,0x04,0x04,0x78],
[0x00,0x44,0x7d,0x40,0x00],
[0x20,0x40,0x44,0x3d,0x00],
[0x7f,0x10,0x28,0x44,0x00],
[0x00,0x41,0x7f,0x40,0x00],
[0x7c,0x04,0x18,0x04,0x78],
[0x7c,0x08,0x04,0x04,0x78],
[0x38,0x44,0x44,0x44,0x38],
[0x7c,0x14,0x14,0x14,0x08],
[0x08,0x14,0x14,0x18,0x7c],
[0x7c,0x08,0x04,0x04,0x08],
[0x48,0x54,0x54,0x54,0x20],
[0x04,0x3f,0x44,0x40,0x20],
[0x3c,0x40,0x40,0x20,0x7c],
[0x1c,0x20,0x40,0x20,0x1c],
[0x3c,0x40,0x30,0x40,0x3c],
[0x44,0x28,0x10,0x28,0x44],
[0x0c,0x50,0x50,0x50,0x3c],
[0x44,0x64,0x54,0x4c,0x44],
[0x00,0x08,0x36,0x41,0x00],
[0x00,0x00,0x7f,0x00,0x00],
[0x00,0x41,0x36,0x08,0x00],
[0x08,0x04,0x08,0x10,0x08]
];

return view.extend({
load: function() {
return Promise.all([
L.resolveDefault(fs.list('/etc/ix4-lcd'), []),
uci.load('ix4-lcd'),
L.resolveDefault(uci.load('system'), null)
]);
},

render: function(data) {
var bmps = data[0] || [];
var m, s, o, p, t, lv, pageNodes = [];
var bmpFiles = bmps.filter(function(f) {
return f.type === 'file' && f.name.match(/\.bmp$/i);
}).map(function(f) { return f.name; }).sort();

m = new form.Map('ix4-lcd', _('ix4-300d LCD Configuration'),
_('Configure the 128x64 front-panel ST7565 LCD and preview pages live.'));

/* ---- Tabbed General / Live View Section ---- */
s = m.section(form.NamedSection, 'general', 'general');
s.addremove = false;
s.tab('live', _('Live View'));
		s.tab('settings', _('Settings'));
s.renderContents = function(data) {
var res = form.NamedSection.prototype.renderContents.apply(this, arguments);
var tabLis = res.querySelectorAll('.cbi-tabmenu > li[data-tab]');
tabLis.forEach(function(li) {
li.addEventListener('click', function() {
try { sessionStorage.setItem('ix4_lcd_main_tab', li.getAttribute('data-tab') || 'live'); } catch (e) {}
});
});
try {
var savedMain = sessionStorage.getItem('ix4_lcd_main_tab');
if (savedMain) {
var targetLi = res.querySelector('.cbi-tabmenu > li[data-tab="' + savedMain + '"] > a');
if (targetLi) setTimeout(function() { targetLi.click(); }, 0);
}
} catch (e) {}
var pane = res.querySelector('[data-tab="settings"]');
if (pane) {
var vals = Array.prototype.slice.call(pane.children).filter(function(el) {
return el.classList && el.classList.contains('cbi-value');
});
if (vals.length >= 12) {
var c0 = vals.at(0), c1 = vals.at(7), c2 = vals.at(10), upItem = vals.at(11);
c0.title = _('Start the ix4-lcd daemon at boot to drive the front-panel 128x64 LCD and handle front-panel buttons.');
c1.title = _('Automatically rotate through all visible display pages using the Refresh Interval.');
c2.title = _('When enabled, changes made with the physical front-panel LCD buttons (cycle pages, backlight, polarity, active page) are saved to /etc/config/ix4-lcd so they survive reboots.');
upItem.title = _('Upload a 128x64 monochrome (1-bit) Windows BMP image to /etc/ix4-lcd/ for use as a page background.');
[c0, c1, c2, upItem].forEach(function(item) {
item.style.cssText = 'display:inline-flex !important; flex-direction:row !important; flex-wrap:nowrap !important; align-items:center !important; gap:8px !important; margin:0 !important; padding:4px 0 !important; width:auto !important; flex:0 0 auto !important;';
var l = item.querySelector('.cbi-value-title');
var f = item.querySelector('.cbi-value-field');
if (l) l.style.cssText = 'display:inline-block !important; flex:0 0 auto !important; flex-basis:auto !important; width:auto !important; min-width:0 !important; max-width:none !important; float:none !important; margin:0 !important; padding:0 !important; text-align:left !important; white-space:nowrap !important;';
if (f) f.style.cssText = 'display:inline-flex !important; flex:0 0 auto !important; flex-basis:auto !important; align-items:center !important; width:auto !important; min-width:0 !important; float:none !important; margin:0 !important; padding:0 !important;';
});
var topChecks = E('div', { style: 'display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px 24px; width:100%; box-sizing:border-box; border-bottom:1px solid rgba(128,128,128,0.2); margin-bottom:12px; padding-bottom:8px;' }, [
c0, c1, c2, upItem
]);
var midGrid = E('div', { style: 'display:grid; grid-template-columns:repeat(2, minmax(280px, 1fr)); gap:0 28px;' }, [
E('div', {}, [vals.at(1), vals.at(2), vals.at(3), vals.at(6)]),
E('div', {}, [vals.at(4), vals.at(5), vals.at(8), vals.at(9)])
]);
pane.appendChild(topChecks);
pane.appendChild(midGrid);
}
}
return res;
};
o = s.taboption('settings', form.Flag, 'enabled', _('Enable LCD Daemon'));
o.default = '1'; o.rmempty = false;

o = s.taboption('settings', form.ListValue, 'default_page', _('Startup Page'));
var pageCount = Math.max(1, Math.min(16, (uci.sections('ix4-lcd', 'page') || []).length));
var savedDef = parseInt(uci.get('ix4-lcd', 'general', 'default_page') || '1', 10);
if (savedDef > pageCount && savedDef <= 16) pageCount = savedDef;
for (var pi = 1; pi <= pageCount; pi++) {
o.value(String(pi), _('Page %d').format(pi));
}
o.default = '1';

o = s.taboption('settings', form.ListValue, 'backlight', _('Backlight Brightness'));
o.value('0', _('Off (0)'));
o.value('1', _('Low (1)'));
o.value('2', _('Medium (2)'));
o.value('3', _('High - Default (3)'));
o.default = '3';

o = s.taboption('settings', form.ListValue, 'invert', _('Display Polarity'));
o.value('1', _('Positive (Dark on bright)'));
o.value('0', _('Negative (Bright on dark)'));
o.default = '1';

o = s.taboption('settings', form.Value, 'contrast', _('Contrast'));
o.value('28', _('Light (28)'));
o.value('34', _('Soft (34)'));
o.value('38', _('Normal - Default (38)'));
o.value('42', _('Crisp (42)'));
o.value('48', _('High (48)'));
o.datatype = 'range(0,63)'; o.default = '38';

o = s.taboption('settings', form.Value, 'refresh', _('Refresh Interval (seconds)'));
o.datatype = 'min(1)'; o.default = '5';

o = s.taboption('settings', form.Value, 'screensaver', _('Screensaver (seconds)'),
_('Turn off LCD and backlight after N seconds of inactivity (0 = disabled). Any front-panel button wakes the display.'));
o.datatype = 'uinteger'; o.default = '0'; o.placeholder = '0';

o = s.taboption('settings', form.Flag, 'auto_scroll', _('Cycle Pages'));
o.default = '0';

o = s.taboption('settings', form.Value, 'marquee_ms', _('Marquee Scroll Step (ms)'));
o.datatype = 'min(40)'; o.default = '400';

o = s.taboption('settings', form.ListValue, 'pixel_scroll', _('Pixel Scroll'));
o.value('1', _('Ultra Smooth'));
o.value('2', _('Smooth'));
o.value('4', _('Medium'));
o.value('6', _('Fast (char)'));
o.default = '6';

o = s.taboption('settings', form.Flag, 'save_buttons', _('Persist Button Changes'));
o.default = '1';

o = s.taboption('settings', form.Button, '_upload_bmp', _('128x64 1-bit .bmp'));
o.inputtitle = _('Upload');
o.inputstyle = 'action';
o.onclick = function(ev) {
var tmpPath = '/tmp/ix4-lcd-upload.bmp';
return ui.uploadFile(tmpPath, ev.target).then(function(res) {
var name = (res && res.name) ? res.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'custom.bmp';
if (!name.match(/\.bmp$/i)) name += '.bmp';
return fs.exec('/bin/mv', [tmpPath, '/etc/ix4-lcd/' + name]).then(function() {
ui.addNotification(null, E('p', _('Uploaded %s to /etc/ix4-lcd/').format(name)), 'info');
window.location.reload();
});
}).catch(function(e) {
ui.addNotification(null, E('p', _('Upload failed: %s').format(e.message || e)), 'danger');
});
};

/* ---- Tab 2: Live View 128x64 Simulator ---- */
lv = s.taboption('live', form.DummyValue, '_live_canvas');
lv.render = function() {
var curPg = 0, tick = 0, bmpCache = {}, liveStats = {};
var canvas = E('canvas', {
width: 384, height: 192,
style: 'position:absolute; left:155px; top:44px; width:430px; height:192px; border:none; border-radius:3px; background:#7ec8ff; display:block; image-rendering:pixelated;'
});
var pageSel = E('select', { class: 'cbi-input-select', style: 'margin-right:8px;' });
var prevBtn = E('button', { class: 'btn cbi-button', type: 'button', style: 'margin-right:6px;' }, _('Prev Page'));
var nextBtn = E('button', { class: 'btn cbi-button', type: 'button', style: 'margin-right:12px;' }, _('Next Page'));
var infoSpan = E('span', { style: 'font-family:monospace; color:#666;' }, '');

function getPages() {
var secs = (m.data && m.data.sections) ? m.data.sections('ix4-lcd', 'page') : uci.sections('ix4-lcd', 'page');
if (secs && secs.length) {
return secs.map(function(sec) {
var sid = sec['.name'];
var getVal = function(opt, fb) {
var el = document.querySelector('[name="cbid.ix4-lcd.' + sid + '.' + opt + '"]');
if (!el) return (fb || '');
return (el.type === 'checkbox') ? (el.checked ? '1' : '0') : (el.value || '');
};
var obj = { bmp: getVal('bmp', sec.bmp), bmp_invert: getVal('bmp_invert', sec.bmp_invert) };
for (var r = 0; r < 8; r++) {
obj['row' + r] = getVal('row' + r, sec['row' + r]);
obj['row' + r + '_scroll'] = getVal('row' + r + '_scroll', sec['row' + r + '_scroll'] || 'normal') || 'normal';
}
return obj;
});
}
return [{ row0: '{hostname} {page}{auto}', row2: 'IP: {ip}', row3: 'Up: {uptime}' }];
}

function expandSample(tpl, pgIdx, total) {
var now = new Date();
var pad = function(n) { return (n < 10 ? '0' : '') + n; };
var map = Object.assign({
page: (pgIdx + 1) + '/' + total, auto: '*',
date: now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()),
time: pad(now.getHours()) + ':' + pad(now.getMinutes()),
time_sec: pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()),
uptime: '4h 12m', hostname: uci.get('system', '@system', 'hostname') || 'OpenWrt', kernel: '6.18.10',
ram: '48/512 MB', load: '0.12 0.08 0.05', cpu_load: ' 12',
cpu_temp: '43', soc_temp: '45', board_temp: '33', bay_temp: '31', fan: ' 827',
ip: window.location.hostname || '192.168.5.12', eth0: 'up', eth1: 'down',
eth0_ip: window.location.hostname || '192.168.5.12', eth1_ip: 'None',
eth0_speed: '1000M', eth1_speed: 'down', rx_rate: '124K', tx_rate: '85K',
sata: '1234', raid: 'md0:active', flash: '12.4M/980M (1%)',
mnt_used: '1.2T/3.6T (33%)', mnt_free: '2.4T',
hdd1_temp: '34C', hdd2_temp: '35C', hdd3_temp: '33C', hdd4_temp: '36C', smb_clients: '1'
}, liveStats);
return (tpl || '').replace(/\{([a-zA-Z0-9_]+)\}/g, function(_, k) {
return (k in map) ? map[k] : '[' + k + ']';
}).replace(/\$\([^)]+\)/g, '[cmd]');
}

function draw() {
var pages = getPages();
var hasRealSecs = (m.data && m.data.sections && m.data.sections('ix4-lcd', 'page').length > 0) || (uci.sections('ix4-lcd', 'page').length > 0);
if (hasRealSecs) {
try {
var sp = parseInt(sessionStorage.getItem('ix4_lcd_emu_pg'), 10);
if (!isNaN(sp) && sp >= 0 && sp < pages.length) curPg = sp;
} catch (e) {}
}
if (pageSel.options.length !== pages.length) {
pageSel.innerHTML = '';
pages.forEach(function(pgItem, i) {
pageSel.appendChild(E('option', { value: String(i) }, _('Page %d / %d').format(i + 1, pages.length)));
});
}
var showPg = (curPg < pages.length) ? curPg : 0;
pageSel.value = String(showPg);
var pg = pages[showPg];
var invEl = document.querySelector('[name="cbid.ix4-lcd.general.invert"]');
var blEl = document.querySelector('[name="cbid.ix4-lcd.general.backlight"]');
var inv = (invEl ? invEl.value : (uci.get('ix4-lcd', 'general', 'invert') || '1')) === '1';
var bl = parseInt(blEl ? blEl.value : (uci.get('ix4-lcd', 'general', 'backlight') || '3'), 10);
var bgColors = ['#18222a', '#355c7d', '#5c9cd6', '#7ec8ff'];
var bg = inv ? bgColors[bl & 3] : '#0b192c';
var fg = inv ? '#0b192c' : (bl === 0 ? '#2b3e50' : '#8ce0ff');
var ctx = canvas.getContext('2d');
ctx.fillStyle = bg; ctx.fillRect(0, 0, 384, 192); ctx.fillStyle = fg;
if (pg.bmp) {
var bname = pg.bmp.indexOf('/') === 0 ? pg.bmp : '/etc/ix4-lcd/' + pg.bmp;
if (!(bname in bmpCache)) {
bmpCache[bname] = null;
fs.read_direct(bname, 'blob').then(function(blob) { return blob.arrayBuffer(); }).then(function(ab) {
bmpCache[bname] = new Uint8Array(ab); draw();
}).catch(function() {});
}
var raw = bmpCache[bname];
if (raw && raw.length >= 1086 && raw[0] === 66 && raw[1] === 77) {
var off = raw[10] | (raw[11] << 8) | (raw[12] << 16) | (raw[13] << 24);
var pal0Dark = (raw[54] + raw[55] + raw[56]) < (raw[58] + raw[59] + raw[60]);
var binv = (pg.bmp_invert === '1');
for (var y = 0; y < 64; y++) {
var sy = 63 - y;
for (var x = 0; x < 128; x++) {
var bit = (raw[off + sy * 16 + (x >> 3)] >> (7 - (x & 7))) & 1;
var ink = pal0Dark ? !bit : bit;
if (binv) ink = !ink;
if (ink) ctx.fillRect(x * 3, y * 3, 3, 3);
}
}
}
}
var msEl = document.querySelector('[name="cbid.ix4-lcd.general.marquee_ms"]');
var pxEl = document.querySelector('[name="cbid.ix4-lcd.general.pixel_scroll"]');
var stepMs = Math.max(40, parseInt(msEl ? msEl.value : (uci.get('ix4-lcd', 'general', 'marquee_ms') || '400'), 10) || 400);
var pxStep = parseInt(pxEl ? pxEl.value : (uci.get('ix4-lcd', 'general', 'pixel_scroll') || '6'), 10) || 6;
if (pxStep !== 1 && pxStep !== 2 && pxStep !== 4 && pxStep !== 6) pxStep = 6;
var pauseTicks = Math.max(2, Math.round(1200 / stepMs));
var drawClip = function(rowIdx, text, xStart, xClip0, xClip1) {
var col = xStart;
for (var i = 0; i < text.length; i++) {
if (col >= xClip1) break;
if (col + 6 > xClip0) {
var code = text.charCodeAt(i);
var glyph = (code >= 32 && code <= 126) ? FONT5X7.at(code - 32) : FONT5X7.at(0);
for (var c = 0; c < 5; c++) {
var px = col + c;
if (px < xClip0 || px >= xClip1) continue;
var bits = glyph.at(c);
for (var b = 0; b < 7; b++) {
if ((bits >> b) & 1) ctx.fillRect(px * 3, (rowIdx * 8 + b) * 3, 3, 3);
}
}
}
col += 6;
}
};
for (var r = 0; r < 8; r++) {
var txt = expandSample(pg['row' + r] || '', showPg, pages.length);
if (!txt) continue;
var sc = pg['row' + r + '_scroll'] || 'normal';
if (txt.length * 6 <= 128 || sc === 'none') {
ctx.fillStyle = bg; ctx.fillRect(0, r * 24, 384, 24); ctx.fillStyle = fg;
drawClip(r, txt, 0, 0, 128); continue;
}
var firstColon = txt.indexOf(':'), lastColon = txt.lastIndexOf(':'), pfx = '', body = txt, viewX = 0;
if (firstColon > 0 && firstColon === lastColon && firstColon <= 12) { var adv = (txt.charAt(firstColon + 1) === ' ') ? 2 : 1; pfx = txt.slice(0, firstColon + adv); body = txt.slice(firstColon + adv); viewX = pfx.length * 6; }
var viewW = 128 - viewX, bodyPx = body.length * 6;
if (bodyPx <= viewW) {
ctx.fillStyle = bg; ctx.fillRect(0, r * 24, 384, 24); ctx.fillStyle = fg;
drawClip(r, txt, 0, 0, 128); continue;
}
var spanPx = bodyPx + 18, maxOff = bodyPx - viewW, offPx = 0, wrapMode = false;
if (sc === 'normal') { wrapMode = true; offPx = (tick <= pauseTicks) ? 0 : (((tick - pauseTicks) * pxStep) % spanPx); }
else if (sc === 'reverse') { wrapMode = true; var mv = (tick <= pauseTicks) ? 0 : (((tick - pauseTicks) * pxStep) % spanPx); offPx = (spanPx - mv) % spanPx; }
else if (sc === 'once') { if (tick > pauseTicks) { var mv = (tick - pauseTicks) * pxStep; offPx = (mv < spanPx) ? mv : 0; } }
else if (sc === 'reverse_once') { if (tick > pauseTicks) { var mv = (tick - pauseTicks) * pxStep; offPx = (mv < spanPx) ? (spanPx - mv) : 0; } }
else if (sc === 'pingpong') {
var tr = Math.max(1, Math.ceil(maxOff / pxStep)), cyc = pauseTicks * 2 + tr * 2, pos = tick % cyc;
if (pos < pauseTicks) offPx = 0;
else if (pos < pauseTicks + tr) offPx = Math.min(maxOff, (pos - pauseTicks) * pxStep);
else if (pos < pauseTicks * 2 + tr) offPx = maxOff;
else offPx = Math.max(0, maxOff - (pos - pauseTicks * 2 - tr) * pxStep);
}
ctx.fillStyle = bg; ctx.fillRect(0, r * 24, 384, 24); ctx.fillStyle = fg;
if (pfx) drawClip(r, pfx, 0, 0, viewX);
drawClip(r, wrapMode ? (body + '   ' + body) : body, viewX - offPx, viewX, 128);
}
infoSpan.textContent = _('128x64 px (3x zoom) | Polarity: %s | Backlight: %d/3 | Step: %dms / %dpx').format(inv ? 'Positive' : 'Negative', bl, stepMs, pxStep);
}
pageSel.addEventListener('change', function() { curPg = parseInt(pageSel.value, 10) || 0; tick = 0; draw(); });
prevBtn.addEventListener('click', function() { var n = getPages().length; curPg = (curPg + n - 1) % n; tick = 0; draw(); });
nextBtn.addEventListener('click', function() { var n = getPages().length; curPg = (curPg + 1) % n; tick = 0; draw(); });
draw();
(function scheduleTick() {
var msEl = document.querySelector('[name="cbid.ix4-lcd.general.marquee_ms"]');
var delay = Math.max(40, parseInt(msEl ? msEl.value : (uci.get('ix4-lcd', 'general', 'marquee_ms') || '400'), 10) || 400);
setTimeout(function() { if (document.body.contains(canvas)) { tick++; draw(); scheduleTick(); } }, delay);
})();

var bezelWrap = E('div', {
style: 'position:relative; width:820px; height:314px; margin:10px auto; border-radius:14px; box-shadow:0 6px 20px rgba(0,0,0,0.45); flex-shrink:0;'
});
bezelWrap.innerHTML = '<svg viewBox="0 0 820 314" width="820" height="314" style="display:block;"><defs><linearGradient id="ix4_body" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#35373b"/><stop offset="50%" stop-color="#232528"/><stop offset="100%" stop-color="#17181a"/></linearGradient><linearGradient id="ix4_trim" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#7c8087"/><stop offset="50%" stop-color="#b4b8bf"/><stop offset="100%" stop-color="#6d7178"/></linearGradient></defs><rect x="2" y="2" width="816" height="310" rx="14" fill="url(#ix4_body)" stroke="#4a4d52" stroke-width="2"/><rect x="18" y="18" width="784" height="278" rx="10" fill="#1b1c1f" stroke="#3c3f44" stroke-width="1.5"/><rect x="24" y="24" width="772" height="2" fill="url(#ix4_trim)" opacity="0.5"/><!-- Recessed LCD Bezel Window (430x192 at x=155, y=44) --><rect x="145" y="34" width="450" height="212" rx="8" fill="#101113" stroke="#555960" stroke-width="2"/><rect x="151" y="40" width="438" height="200" rx="5" fill="#090a0b" stroke="#2b2d31" stroke-width="1.5"/><!-- Left Status Indicators --><circle id="ix4_led_sys" cx="82" cy="78" r="5" fill="#2a2d34" stroke="#454952" stroke-width="1"/><text x="82" y="96" fill="#9aa0a6" font-family="sans-serif" font-size="9" text-anchor="middle">SYS</text><circle id="ix4_led_hdd" cx="82" cy="128" r="5" fill="#2a2d34" stroke="#454952" stroke-width="1"/><text x="82" y="145" fill="#9aa0a6" font-family="sans-serif" font-size="9" text-anchor="middle">HDD</text><circle id="ix4_led_pwr" cx="82" cy="176" r="5" fill="#ffffff" stroke="#454952" stroke-width="1"/><text x="82" y="194" fill="#9aa0a6" font-family="sans-serif" font-size="9" text-anchor="middle">POWER</text><!-- Right Select & Scroll Buttons --><g id="ix4_btn_prev" style="cursor:pointer;"><rect x="616" y="64" width="38" height="58" rx="6" fill="#2c2f34" stroke="#6c7077" stroke-width="1.5"/><polygon points="635,84 627,98 643,98" fill="#cfd3da"/><text x="635" y="135" fill="#9aa0a6" font-family="sans-serif" font-size="9" text-anchor="middle">SELECT</text></g><g id="ix4_btn_next" style="cursor:pointer;"><rect x="616" y="156" width="38" height="58" rx="6" fill="#2c2f34" stroke="#6c7077" stroke-width="1.5"/><polygon points="635,194 627,180 643,180" fill="#cfd3da"/><text x="635" y="227" fill="#9aa0a6" font-family="sans-serif" font-size="9" text-anchor="middle">SCROLL</text></g><!-- Lenovo / ix4-300d Branding --><text x="732" y="102" fill="#d0d4dc" font-family="sans-serif" font-weight="bold" font-style="italic" font-size="22" text-anchor="middle" letter-spacing="0.5">lenovo</text><text x="732" y="122" fill="#7c818a" font-family="sans-serif" font-size="11" text-anchor="middle" letter-spacing="1">ix4-300d</text><g id="ix4_btn_pwr" style="cursor:pointer;"><title>Power Options (Reboot / Power Off)</title><circle cx="732" cy="184" r="18" fill="#2c2f34" stroke="#6c7077" stroke-width="1.5"/><path d="M 732 174 L 732 183 M 726 178 A 8 8 0 1 0 738 178" fill="none" stroke="#cfd3da" stroke-width="1.8" stroke-linecap="round"/><text x="732" y="216" fill="#9aa0a6" font-family="sans-serif" font-size="9" text-anchor="middle">POWER</text></g><!-- Bottom Pseudo-LEDs (ETH0 / ETH1) --><circle id="ix4_led_eth0" cx="325" cy="268" r="5" fill="#ef4444" stroke="#454952" stroke-width="1"/><text x="325" y="285" fill="#9aa0a6" font-family="sans-serif" font-size="9" text-anchor="middle">ETH0</text><circle id="ix4_led_eth1" cx="415" cy="268" r="5" fill="#ef4444" stroke="#454952" stroke-width="1"/><text x="415" y="285" fill="#9aa0a6" font-family="sans-serif" font-size="9" text-anchor="middle">ETH1</text></svg>';
bezelWrap.appendChild(canvas);
var bPrev = bezelWrap.querySelector('#ix4_btn_prev');
var bNext = bezelWrap.querySelector('#ix4_btn_next');
var callLcdSig = rpc.declare({ object: 'service', method: 'signal', params: ['name', 'signal'] });
if (bPrev) bPrev.addEventListener('click', function() {
nextBtn.click();
L.resolveDefault(callLcdSig('ix4-lcd', 10), null);
});
if (bNext) bNext.addEventListener('click', function() {
var blEl = document.querySelector('[name="cbid.ix4-lcd.general.backlight"]');
var curBl = parseInt(blEl ? blEl.value : (uci.get('ix4-lcd', 'general', 'backlight') || '3'), 10);
var nxtBl = String((curBl + 1) & 3);
if (blEl) blEl.value = nxtBl;
uci.set('ix4-lcd', 'general', 'backlight', nxtBl);
draw();
L.resolveDefault(callLcdSig('ix4-lcd', 12), null);
});
var bPwr = bezelWrap.querySelector('#ix4_btn_pwr');
if (bPwr) bPwr.addEventListener('click', function() {
ui.showModal(_('System Power'), [
E('p', {}, _('Select an action for the Lenovo Iomega ix4-300d:')),
E('div', { class: 'right', style: 'display:flex; justify-content:flex-end; gap:8px; margin-top:12px;' }, [
E('button', {
class: 'btn cbi-button',
type: 'button',
click: ui.hideModal
}, _('Cancel')),
E('button', {
class: 'btn cbi-button-action',
type: 'button',
click: function() {
ui.hideModal();
ui.addNotification(null, E('p', _('Rebooting system...')), 'info');
fs.exec('/sbin/reboot').catch(function(err) {
ui.addNotification(null, E('p', _('Reboot failed: %s').format(err.message || err)), 'danger');
});
}
}, _('Reboot')),
E('button', {
class: 'btn cbi-button-negative',
type: 'button',
click: function() {
ui.hideModal();
ui.addNotification(null, E('p', _('Powering off system...')), 'warning');
fs.exec('/sbin/poweroff').catch(function(err) {
ui.addNotification(null, E('p', _('Power off failed: %s').format(err.message || err)), 'danger');
});
}
}, _('Power Off'))
])
]);
});
function pollLeds() {
if (!document.body.contains(bezelWrap)) return;
var callNetDump = rpc.declare({ object: 'network.interface', method: 'dump', expect: { 'interface': [] } });
var setLed = function(id, color) {
var el = bezelWrap.querySelector('#' + id);
if (!el) return;
el.setAttribute('fill', color || '#2a2d34');
el.style.filter = color ? ('drop-shadow(0 0 5px ' + color + ')') : 'none';
};
var setDisconnected = function() {
['ix4_led_sys', 'ix4_led_hdd', 'ix4_led_pwr', 'ix4_led_eth0', 'ix4_led_eth1'].forEach(function(id) {
setLed(id, null);
});
};
var paths = [
'/sys/class/leds/ix4-300d:sys:blue/brightness',
'/sys/class/leds/ix4-300d:sysfail:red/brightness',
'/sys/class/leds/ix4-300d:hdd:blue/brightness',
'/sys/class/leds/ix4-300d:hddfail:red/brightness',
'/sys/class/leds/ix4-300d:power:white/brightness',
'/sys/devices/platform/soc/soc:internal-regs/f1070000.ethernet/net/eth0/carrier',
'/sys/devices/platform/soc/soc:internal-regs/f1074000.ethernet/net/eth1/carrier'
];
var timer = setTimeout(setDisconnected, 1800);
Promise.all(paths.map(function(p) { return fs.read(p); }).concat([callNetDump()])).then(function(v) {
clearTimeout(timer);
var on = function(s) { return parseInt((s || '').trim(), 10) > 0; };
setLed('ix4_led_sys', on(v.at(1)) ? '#ef4444' : (on(v.at(0)) ? '#3b82f6' : null));
setLed('ix4_led_hdd', on(v.at(3)) ? '#ef4444' : (on(v.at(2)) ? '#3b82f6' : null));
setLed('ix4_led_pwr', on(v.at(4)) ? '#ffffff' : null);

var ifaces = v.at(7) || [];
var hasRouterLink = function(dev) {
return ifaces.some(function(ifc) {
if (!ifc || !ifc.up) return false;
var l3 = ifc.l3_device || '', d = ifc.device || '';
var match = (d === dev || l3 === dev || (l3 === 'br-lan' && (ifc['interface'] === 'lan' || d === 'br-lan')));
if (!match) return false;
var hasIp = Array.isArray(ifc['ipv4-address']) && ifc['ipv4-address'].length > 0;
var hasRt = Array.isArray(ifc.route) && ifc.route.length > 0;
return hasIp || hasRt;
});
};
var ethColor = function(carrier, dev) {
if (!on(carrier)) return '#ef4444';
return hasRouterLink(dev) ? '#22c55e' : '#f59e0b';
};
setLed('ix4_led_eth0', ethColor(v.at(5), 'eth0'));
setLed('ix4_led_eth1', ethColor(v.at(6), 'eth1'));
}).catch(function() {
clearTimeout(timer);
setDisconnected();
});
}
pollLeds();
setInterval(pollLeds, 2000);
var bezelScroll = E('div', {
style: 'width:100%; overflow-x:auto; display:flex; justify-content:center;'
}, [ bezelWrap ]);
return E('div', { class: 'cbi-value', style: 'display:flex; flex-direction:column; align-items:center; text-align:center;' }, [
E('div', { style: 'margin-bottom:8px; display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:6px;' }, [ pageSel, prevBtn, nextBtn, infoSpan ]),
bezelScroll,
E('div', { class: 'cbi-value-description', style: 'margin-top:6px; text-align:center;' }, _('Live simulator updates automatically as you edit pages, rows, polarity, or backlight in Settings.'))
]);
};

p = m.section(form.TypedSection, 'page', _('Display Pages (1 to 16)'));
		p.addremove = true; p.anonymous = true; p.sortable = true; p.maxrows = 16;

p.renderContents = function(data) {
return Promise.resolve(form.TypedSection.prototype.renderContents.apply(this, arguments)).then(function(res) {
var nodes = Array.prototype.slice.call(res.querySelectorAll('.cbi-section-node'));
if (!nodes.length) return res;
var tabBar = E('ul', { class: 'cbi-tabmenu', style: 'margin-bottom:10px;' });
var tabs = [], delBars = [];
var addBox = res.querySelector('.cbi-section-create');
if (addBox) {
addBox.style.display = 'flex'; addBox.style.justifyContent = 'flex-end'; addBox.style.alignItems = 'center'; addBox.style.gap = '8px';
addBox.querySelectorAll('button, .btn').forEach(function(b) { b.style.flex = '0 0 110px'; b.style.width = '110px'; b.style.margin = '0'; });
}

function selectPageTab(idx, syncEmu) {
try { sessionStorage.setItem('ix4_lcd_page_tab', String(idx)); } catch (e) {}
tabs.forEach(function(li, i) {
li.className = (i === idx) ? 'cbi-tab' : 'cbi-tab-disabled';
});
nodes.forEach(function(node, i) {
node.style.display = (i === idx) ? '' : 'none';
});
delBars.forEach(function(bar, i) {
bar.style.display = (i === idx) ? 'inline-block' : 'none';
});
if (syncEmu) {
var sel = document.querySelector('#cbi-ix4-lcd-general select.cbi-input-select');
if (sel && sel.options.length > idx) {
sel.value = String(idx);
sel.dispatchEvent(new Event('change'));
}
}
}

nodes.forEach(function(node, idx) {
var prev = node.previousElementSibling;
if (prev && prev.classList && (prev.classList.contains('cbi-section-remove') || prev.classList.contains('cbi-section-actions'))) {
prev.style.display = 'none';
prev.style.marginLeft = '0'; prev.querySelectorAll('button, .btn').forEach(function(b) { b.style.flex = '0 0 110px'; b.style.width = '110px'; b.style.margin = '0'; });
prev.style.verticalAlign = 'middle';
if (addBox) addBox.appendChild(prev);
delBars.push(prev);
}
var vals = Array.prototype.slice.call(node.children).filter(function(el) {
return el.classList && el.classList.contains('cbi-value');
});
if (vals.length >= 19) {
vals.slice(0, 3).forEach(function(v) {
v.style.display = 'flex'; v.style.alignItems = 'center'; v.style.marginBottom = '6px';
var lbl = v.querySelector('.cbi-value-title'), fld = v.querySelector('.cbi-value-field');
if (lbl) { lbl.style.width = '120px'; lbl.style.minWidth = '120px'; lbl.style.textAlign = 'left'; lbl.style.paddingRight = '8px'; }
if (fld) { fld.style.flex = '1'; fld.style.marginLeft = '0'; }
});
var topRow = E('div', { style: 'display:grid; grid-template-columns:2fr 1fr 1fr; gap:0 16px;' }, [ vals.at(0), vals.at(1), vals.at(2) ]);
var leftCol = [], rightCol = [];
for (var ri = 0; ri < 8; ri++) {
var rv = vals.at(3 + ri * 2), sv = vals.at(4 + ri * 2);
rv.style.cssText = 'display:flex; align-items:center; flex:1; min-width:0; margin:0;';
var rLbl = rv.querySelector('.cbi-value-title'), rFld = rv.querySelector('.cbi-value-field');
if (rLbl) rLbl.style.cssText = 'width:54px; min-width:54px; text-align:left; padding-right:6px; margin:0;';
if (rFld) rFld.style.cssText = 'flex:1; min-width:0; margin:0;';
sv.style.cssText = 'display:flex; align-items:center; flex:0 0 122px; width:122px; margin:0;';
var sLbl = sv.querySelector('.cbi-value-title'), sFld = sv.querySelector('.cbi-value-field');
if (sLbl) sLbl.style.display = 'none';
if (sFld) { sFld.style.cssText = 'width:100%; margin:0;'; var sSel = sFld.querySelector('select'); if (sSel) { sSel.style.width = '100%'; sSel.title = _('Row %d scroll style').format(ri); } }
var pair = E('div', { style: 'display:flex; align-items:center; gap:6px; margin-bottom:6px;' }, [ rv, sv ]);
if (ri < 4) leftCol.push(pair); else rightCol.push(pair);
}
node.appendChild(topRow);
node.appendChild(E('div', { style: 'display:grid; grid-template-columns:1fr 1fr; gap:0 24px;' }, [ E('div', {}, leftCol), E('div', {}, rightCol) ]));
}
var a = E('a', { href: '#' }, _('Page %d').format(idx + 1));
a.addEventListener('click', function(ev) { ev.preventDefault(); selectPageTab(idx, true); });
var li = E('li', { class: (idx === 0) ? 'cbi-tab' : 'cbi-tab-disabled' }, a);
tabs.push(li);
tabBar.appendChild(li);
});

if (addBox) {
var addBtn = addBox.querySelector('button, .btn');
if (addBtn) {
addBtn.style.display = 'none';
var btnCs = window.getComputedStyle(addBtn);
var btnBg = (btnCs && btnCs.backgroundColor && btnCs.backgroundColor !== 'rgba(0, 0, 0, 0)') ? btnCs.backgroundColor : '#3c9a5f';
var btnFg = (btnCs && btnCs.color) ? btnCs.color : '#ffffff';
var addA = E('a', {
href: '#',
style: 'background:' + btnBg + ' !important; color:' + btnFg + ' !important; font-weight:600; border:none !important; box-shadow:none !important;'
}, _('+ Add'));
addA.addEventListener('click', function(ev) {
ev.preventDefault();
try { sessionStorage.setItem('ix4_lcd_page_tab', String(nodes.length)); } catch (e) {}
addBtn.click();
});
tabBar.appendChild(E('li', {
class: 'cbi-tab-disabled',
style: 'overflow:hidden;'
}, addA));
}
}
nodes[0].parentNode.insertBefore(tabBar, nodes[0]);
var initIdx = 0;
try {
var savedPg = parseInt(sessionStorage.getItem('ix4_lcd_page_tab'), 10);
if (!isNaN(savedPg) && savedPg >= 0 && savedPg < nodes.length) initIdx = savedPg;
} catch (e) {}
selectPageTab(initIdx, false);
return res;
});
};

o = p.option(form.Value, 'bmp', _('Background BMP'));
o.optional = true;
o.placeholder = _('None');
bmpFiles.forEach(function(fn) { o.value(fn, fn); });

o = p.option(form.Flag, 'bmp_invert', _('Invert BMP Pixels'));
o.default = '0';

o = p.option(form.Flag, 'hide', _('Hide Page'));
o.default = '0';

for (var r = 0; r < 8; r++) {
o = p.option(form.Value, 'row' + r, _('Row %d').format(r));
o.optional = true;
o.placeholder = (r === 0) ? '{hostname} {page}{auto}' : '';
o = p.option(form.ListValue, 'row' + r + '_scroll', _('Scroll'));
o.value('normal', _('Normal')); o.value('none', _('None')); o.value('once', _('Once'));
o.value('pingpong', _('Ping Pong')); o.value('reverse', _('Reverse')); o.value('reverse_once', _('Reverse Once'));
o.default = 'normal';
}

/* ---- Custom Tokens Section ---- */
t = m.section(form.TableSection, 'token', _('Custom Tokens'),
_('Reusable {name} tokens from a sysfs/proc file or shell command (up to 32).'));
t.addremove = true;
t.anonymous = true;
t.render = function() {
return Promise.resolve(form.TableSection.prototype.render.apply(this, arguments)).then(function(el) {
var addBox = el.querySelector('.cbi-section-create');
if (addBox) {
addBox.style.display = 'flex';
addBox.style.alignItems = 'center';
addBox.style.gap = '16px';
addBox.querySelectorAll('button, .btn').forEach(function(b) {
b.style.flex = '0 0 110px';
b.style.width = '110px';
b.style.margin = '0';
});
var tokDocs = {
'{page}': 'Current page / total visible pages (e.g. 1/4)',
'{auto}': 'Shows * when Cycle Pages (auto-scroll) is active, space otherwise',
'{date}': 'Current system date (YYYY-MM-DD)',
'{time}': 'Current local time (HH:MM)',
'{time_sec}': 'Current local time with seconds (HH:MM:SS)',
'{uptime}': 'System uptime (e.g. 2d 4h 12m)',
'{hostname}': 'System hostname from /etc/config/system',
'{kernel}': 'Running Linux kernel version (e.g. 6.18.64)',
'{ram}': 'Used / total system RAM in MB (e.g. 48/512 MB)',
'{load}': '1-, 5-, and 15-minute CPU load averages',
'{cpu_temp}': 'CPU core temperature in degrees C',
'{soc_temp}': 'Armada XP SoC temperature in degrees C',
'{board_temp}': 'ADT7473 motherboard sensor temperature in degrees C',
'{bay_temp}': 'ADT7473 drive-bay sensor temperature in degrees C',
'{fan}': 'Chassis fan speed in RPM from ADT7473',
'{ip}': 'Primary active LAN/WAN IPv4 address',
'{eth0}': 'eth0 link state (up / down)',
'{eth1}': 'eth1 link state (up / down)',
'{eth0_ip}': 'eth0 IPv4 address or None',
'{eth1_ip}': 'eth1 IPv4 address or None',
'{eth0_speed}': 'eth0 link speed (e.g. 1000M or down)',
'{eth1_speed}': 'eth1 link speed (e.g. 1000M or down)',
'{rx_rate}': 'Live network receive rate (B/s, K/s, M/s)',
'{tx_rate}': 'Live network transmit rate (B/s, K/s, M/s)',
'{sata}': 'Present SATA drive bays (e.g. 1234 or ----)',
'{raid}': 'Active mdadm RAID array status (e.g. md0:active)',
'{flash}': 'Root/overlay flash used / total space',
'{mnt_used}': 'Mounted storage used / total capacity',
'{mnt_free}': 'Mounted storage free capacity',
'{hdd1_temp}': 'Drive bay 1 SMART temperature in degrees C',
'{hdd2_temp}': 'Drive bay 2 SMART temperature in degrees C',
'{hdd3_temp}': 'Drive bay 3 SMART temperature in degrees C',
'{hdd4_temp}': 'Drive bay 4 SMART temperature in degrees C',
'{smb_clients}': 'Number of active Samba/SMB client connections',
'$(cmd)': 'Inline shell command output (e.g. $(uname -m))'
};
var tokWrap = E('div', {
class: 'cbi-section-descr',
style: 'flex:1; font-size:0.82em; font-family:monospace; background:transparent; border:none; padding:0; margin:0; line-height:1.5;'
}, [E('span', {}, _('Tokens (hover for details): '))]);
Object.keys(tokDocs).forEach(function(k, idx) {
if (idx > 0) tokWrap.appendChild(document.createTextNode(' '));
tokWrap.appendChild(E('span', {
title: _(tokDocs.valueOf ? Reflect.get(tokDocs, k) : ''),
style: 'cursor:help; border-bottom:1px dotted rgba(128,128,128,0.65); padding:0 1px;'
}, k));
});
addBox.appendChild(tokWrap);
}
return el;
});
};

o = t.option(form.Value, 'name', _('Name')); o.datatype = 'uciname'; o.placeholder = 'wan_ip';
o = t.option(form.Value, 'file', _('File Path')); o.optional = true; o.placeholder = '/sys/class/thermal/thermal_zone0/temp';
o = t.option(form.Value, 'div', _('Divisor')); o.datatype = 'uinteger'; o.optional = true; o.placeholder = '1000';
o = t.option(form.Value, 'cmd', _('Command')); o.optional = true; o.placeholder = 'uname -r';
o = t.option(form.Value, 'ttl', _('TTL (s)')); o.datatype = 'uinteger'; o.optional = true; o.placeholder = '60';

return m.render();
}
});
