'use strict';
'require view';
'require rpc';
'require uci';
'require ui';
'require poll';

var callList = rpc.declare({ object: 'volmgr', method: 'list', expect: {} });
var callInfo = rpc.declare({ object: 'volmgr', method: 'info', params: ['disk'], expect: {} });
var callSmart = rpc.declare({ object: 'volmgr', method: 'smart', params: ['disk'], expect: {} });
var callPackages = rpc.declare({ object: 'volmgr', method: 'packages', expect: {} });
var callJobStatus = rpc.declare({ object: 'volmgr', method: 'job_status', expect: {} });
var callCreatePart = rpc.declare({ object: 'volmgr', method: 'create_part', params: ['disk', 'layout', 'ptype', 'fstype', 'size', 'label', 'role', 'offset_mib'], expect: {} });
var callFormatPart = rpc.declare({ object: 'volmgr', method: 'format_part', params: ['part', 'fstype', 'label'], expect: {} });
var callResizePart = rpc.declare({ object: 'volmgr', method: 'resize_part', params: ['disk', 'num', 'size', 'fstype'], expect: {} });
var callMovePart = rpc.declare({ object: 'volmgr', method: 'move_part', params: ['disk', 'num', 'delta_mib', 'fstype'], expect: {} });
var callDeletePart = rpc.declare({ object: 'volmgr', method: 'delete_part', params: ['disk', 'num'], expect: {} });
var callSetMeta = rpc.declare({ object: 'volmgr', method: 'set_part_meta', params: ['disk', 'num', 'label', 'fstype', 'role', 'flags'], expect: {} });
var callMountAct = rpc.declare({ object: 'volmgr', method: 'mount_action', params: ['action', 'part', 'target'], expect: {} });
var callPkgAct = rpc.declare({ object: 'volmgr', method: 'pkg_action', params: ['action', 'packages'], expect: {} });

function fmtBytes(b) {
b = Number(b) || 0;
if (b <= 0) return '0 B';
var u = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
var i = Math.min(u.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
return (b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2) + ' ' + u[i];
}

function fmtTime(sec) {
sec = Math.max(0, Math.round(Number(sec) || 0));
var m = Math.floor(sec / 60), s = sec % 60;
return (m > 0 ? m + 'm ' : '') + s + 's';
}

var FS_COLORS = {
ext4: '#2e7d32', ext3: '#388e3c', ext2: '#43a047',
btrfs: '#00838f', f2fs: '#6a1b9a',
ntfs: '#1565c0', exfat: '#0277bd', vfat: '#ef6c00',
swap: '#ad1457', linux_raid_member: '#c62828', LVM2_member: '#4527a0'
};

var callVolumesStatus = rpc.declare({ object: 'volmgr', method: 'volumes_status', expect: new Object() });
var callRaidAction = rpc.declare({ object: 'volmgr', method: 'raid_action', params: new Array('action', 'array', 'level', 'members', 'name'), expect: new Object() });
var callLuksAction = rpc.declare({ object: 'volmgr', method: 'luks_action', params: new Array('action', 'part', 'name', 'passphrase'), expect: new Object() });

function buildVolumesTabView(self) {
var wrap = E('div', new Object());
var statusBox = E('div', { 'style': 'margin-top:10px;' }, E('em', new Object(), _('Loading RAID & LUKS status...')));

var candidateParts = new Array();
(self.disks || new Array()).forEach(function(d) {
var kids = d.children || new Array();
if (kids.length) {
kids.forEach(function(c) {
if (!c.mountpoint) candidateParts.push({ dev: '/dev/' + c.name, label: '/dev/' + c.name + ' (' + fmtBytes(c.size) + (c.fstype ? ', ' + c.fstype : '') + ')' });
});
} else {
candidateParts.push({ dev: '/dev/' + d.name, label: '/dev/' + d.name + ' (' + fmtBytes(d.size) + ', whole disk)' });
}
});

var openCreateRaidModal = function() {
var levelSel = E('select', { 'class': 'cbi-input-select' }, new Array('0', '1', '5', '6', '10').map(function(l) {
return E('option', { 'value': l }, 'RAID ' + l);
}));
var arrInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': '/dev/md0' });
var nameInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': 'nas_raid' });
var checks = candidateParts.map(function(p) {
var cb = E('input', { 'type': 'checkbox', 'value': p.dev, 'style': 'margin-right:6px;' });
return E('label', { 'style': 'display:block; margin:4px 0;' }, new Array(cb, p.label));
});
ui.showModal(_('Create Software RAID Array'), new Array(
E('div', { 'class': 'cbi-value' }, new Array(E('label', { 'class': 'cbi-value-title' }, _('RAID Level')), E('div', { 'class': 'cbi-value-field' }, new Array(levelSel)))),
E('div', { 'class': 'cbi-value' }, new Array(E('label', { 'class': 'cbi-value-title' }, _('Array Device')), E('div', { 'class': 'cbi-value-field' }, new Array(arrInput)))),
E('div', { 'class': 'cbi-value' }, new Array(E('label', { 'class': 'cbi-value-title' }, _('Array Name')), E('div', { 'class': 'cbi-value-field' }, new Array(nameInput)))),
E('div', { 'style': 'margin:8px 0; max-height:180px; overflow:auto; border:1px solid rgba(128,128,128,0.3); padding:8px; border-radius:4px;' }, checks.length ? checks : new Array(E('em', new Object(), _('No unmounted partitions/disks found')))),
E('div', { 'class': 'right', 'style': 'margin-top:12px;' }, new Array(
E('button', { 'class': 'cbi-button', 'click': ui.hideModal }, _('Cancel')), ' ',
E('button', { 'class': 'cbi-button cbi-button-action', 'click': function() {
var chosen = new Array();
checks.forEach(function(lbl) { var inp = lbl.querySelector('input'); if (inp && inp.checked) chosen.push(inp.value); });
if (chosen.length < 2) { ui.addNotification(null, E('p', new Object(), _('Select at least 2 member devices.')), 'warning'); return; }
ui.hideModal();
callRaidAction('create', arrInput.value.trim(), levelSel.value, chosen.join(' '), nameInput.value.trim()).then(function(r) {
if (r && r.error) ui.addNotification(null, E('p', new Object(), r.error), 'error');
else { ui.addNotification(null, E('p', new Object(), _('RAID array created.')), 'info'); self.refreshAll(); }
});
} }, _('Create Array'))
))
));
};
var openLuksFormatModal = function() {
var partSel = E('select', { 'class': 'cbi-input-select' }, candidateParts.map(function(p) { return E('option', { 'value': p.dev }, p.label); }));
var pw1 = E('input', { 'type': 'password', 'class': 'cbi-input-text', 'placeholder': _('Passphrase') });
var pw2 = E('input', { 'type': 'password', 'class': 'cbi-input-text', 'placeholder': _('Confirm passphrase') });
ui.showModal(_('Encrypt Partition (LUKS2)'), new Array(
E('p', { 'style': 'color:#c62828; font-weight:600;' }, _('Warning: All existing data on the selected partition will be erased.')),
E('div', { 'class': 'cbi-value' }, new Array(E('label', { 'class': 'cbi-value-title' }, _('Target Partition')), E('div', { 'class': 'cbi-value-field' }, new Array(partSel)))),
E('div', { 'class': 'cbi-value' }, new Array(E('label', { 'class': 'cbi-value-title' }, _('Passphrase')), E('div', { 'class': 'cbi-value-field' }, new Array(pw1)))),
E('div', { 'class': 'cbi-value' }, new Array(E('label', { 'class': 'cbi-value-title' }, _('Confirm')), E('div', { 'class': 'cbi-value-field' }, new Array(pw2)))),
E('div', { 'class': 'right', 'style': 'margin-top:12px;' }, new Array(
E('button', { 'class': 'cbi-button', 'click': ui.hideModal }, _('Cancel')), ' ',
E('button', { 'class': 'cbi-button cbi-button-negative', 'click': function() {
if (!pw1.value || pw1.value !== pw2.value) { ui.addNotification(null, E('p', new Object(), _('Passphrases do not match.')), 'warning'); return; }
ui.hideModal();
callLuksAction('format', partSel.value, '', pw1.value).then(function(r) {
if (r && r.error) ui.addNotification(null, E('p', new Object(), r.error), 'error');
else { ui.addNotification(null, E('p', new Object(), _('LUKS2 encryption initialized.')), 'info'); self.refreshAll(); }
});
} }, _('Format LUKS2'))
))
));
};

var openLuksUnlockModal = function(partDev) {
var nameIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': 'luks_' + partDev.replace('/dev/', '') });
var pwIn = E('input', { 'type': 'password', 'class': 'cbi-input-text', 'placeholder': _('Passphrase') });
ui.showModal(_('Unlock LUKS Volume: ') + partDev, new Array(
E('div', { 'class': 'cbi-value' }, new Array(E('label', { 'class': 'cbi-value-title' }, _('Mapper Name')), E('div', { 'class': 'cbi-value-field' }, new Array(nameIn)))),
E('div', { 'class': 'cbi-value' }, new Array(E('label', { 'class': 'cbi-value-title' }, _('Passphrase')), E('div', { 'class': 'cbi-value-field' }, new Array(pwIn)))),
E('div', { 'class': 'right', 'style': 'margin-top:12px;' }, new Array(
E('button', { 'class': 'cbi-button', 'click': ui.hideModal }, _('Cancel')), ' ',
E('button', { 'class': 'cbi-button cbi-button-action', 'click': function() {
ui.hideModal();
callLuksAction('open', partDev, nameIn.value.trim(), pwIn.value).then(function(r) {
if (r && r.error) ui.addNotification(null, E('p', new Object(), r.error), 'error');
else { ui.addNotification(null, E('p', new Object(), _('Unlocked at /dev/mapper/') + nameIn.value.trim()), 'info'); self.refreshAll(); }
});
} }, _('Unlock'))
))
));
};

callVolumesStatus().then(function(st) {
statusBox.innerHTML = '';
var mdDet = (st && st.md_details) || '';
var mdstat = (st && st.mdstat) || '';
var cryptRaw = (st && st.crypt_list) || '';
var mdNodes = mdDet.match(/=== (\/dev\/md\S+) ===/g) || new Array();
var mdBtns = mdNodes.map(function(h) {
var dev = h.replace(/=== | ===/g, '');
return E('button', { 'class': 'cbi-button cbi-button-negative', 'style': 'margin-right:6px;', 'click': function() {
callRaidAction('stop', dev, '', '', '').then(function(r) {
if (r && r.error) ui.addNotification(null, E('p', new Object(), r.error), 'error');
else { ui.addNotification(null, E('p', new Object(), _('Stopped ') + dev), 'info'); self.refreshAll(); }
});
} }, _('Stop ') + dev);
});
statusBox.appendChild(E('div', { 'class': 'cbi-section-node', 'style': 'padding:12px; border:1px solid rgba(128,128,128,0.25); border-radius:6px; margin-bottom:14px;' }, new Array(
E('div', { 'style': 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;' }, new Array(
E('h4', { 'style': 'margin:0;' }, _('Software RAID (mdadm)')),
E('div', new Object(), new Array(
E('button', { 'class': 'cbi-button', 'click': function() { callRaidAction('assemble', '', '', '', '').then(function() { self.refreshAll(); }); } }, _('Scan & Assemble')), ' ',
E('button', { 'class': 'cbi-button cbi-button-action', 'click': openCreateRaidModal }, _('Create RAID Array'))
))
)),
mdBtns.length ? E('div', { 'style': 'margin-bottom:8px;' }, mdBtns) : E('span', new Object()),
E('pre', { 'style': 'font-size:12px; padding:8px; background:rgba(0,0,0,0.18); border-radius:4px; overflow:auto; max-height:220px;' }, (mdDet || mdstat || _('No active MD RAID arrays.')).trim())
)));
var cryptRows = cryptRaw.split('\n').filter(Boolean).map(function(line) {
var cols = line.trim().split(/\s+/);
var name = cols.at(0) || '';
var typ = cols.at(2) || '';
var dev = '/dev/' + name;
var actBtn = (typ === 'crypt')
? E('button', { 'class': 'cbi-button cbi-button-negative', 'click': function() { callLuksAction('close', '', name, '').then(function(r) { if (r && r.error) ui.addNotification(null, E('p', new Object(), r.error), 'error'); else self.refreshAll(); }); } }, _('Lock'))
: E('button', { 'class': 'cbi-button cbi-button-action', 'click': function() { openLuksUnlockModal(dev); } }, _('Unlock'));
return E('tr', { 'class': 'tr' }, new Array(E('td', { 'class': 'td' }, dev), E('td', { 'class': 'td' }, typ), E('td', { 'class': 'td' }, fmtBytes(cols.at(3))), E('td', { 'class': 'td' }, cols.at(4) || ''), E('td', { 'class': 'td' }, new Array(actBtn))));
});
statusBox.appendChild(E('div', { 'class': 'cbi-section-node', 'style': 'padding:12px; border:1px solid rgba(128,128,128,0.25); border-radius:6px;' }, new Array(
E('div', { 'style': 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;' }, new Array(
E('h4', { 'style': 'margin:0;' }, _('LUKS2 Encrypted Volumes (cryptsetup)')),
E('button', { 'class': 'cbi-button cbi-button-action', 'click': openLuksFormatModal }, _('Encrypt Partition (LUKS2)'))
)),
cryptRows.length ? E('table', { 'class': 'table' }, new Array(E('tr', { 'class': 'tr table-titles' }, new Array(E('th', { 'class': 'th' }, _('Device')), E('th', { 'class': 'th' }, _('Type')), E('th', { 'class': 'th' }, _('Size')), E('th', { 'class': 'th' }, _('Format')), E('th', { 'class': 'th' }, _('Action'))))).concat(cryptRows)) : E('em', new Object(), _('No LUKS2 encrypted partitions or active mappers detected.'))
)));
appendLvmAndIscsiCards(self, statusBox, candidateParts, st);
});
wrap.appendChild(statusBox);
return wrap;
}

var callLvmAction = rpc.declare({ object: 'volmgr', method: 'lvm_action', params: new Array('action', 'vg', 'lv', 'size', 'devices'), expect: new Object() });
var callIscsiAction = rpc.declare({ object: 'volmgr', method: 'iscsi_action', params: new Array('action', 'portal', 'iqn', 'backing', 'tid'), expect: new Object() });

function appendLvmAndIscsiCards(self, statusBox, candidateParts, st) {
var pvsRaw = (st && st.lvm_pvs) || '';
var vgsRaw = (st && st.lvm_vgs) || '';
var lvsRaw = (st && st.lvm_lvs) || '';
var iscsiSess = (st && st.iscsi_sessions) || '';
var iscsiTgt = (st && st.iscsi_targets) || '';

var openVgCreateModal = function() {
var vgIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': 'vg_nas' });
var checks = candidateParts.map(function(p) {
var cb = E('input', { 'type': 'checkbox', 'value': p.dev, 'style': 'margin-right:6px;' });
return E('label', { 'style': 'display:block; margin:4px 0;' }, new Array(cb, p.label));
});
ui.showModal(_('Create LVM Volume Group (vgcreate)'), new Array(
E('div', { 'class': 'cbi-value' }, new Array(E('label', { 'class': 'cbi-value-title' }, _('Volume Group Name')), E('div', { 'class': 'cbi-value-field' }, new Array(vgIn)))),
E('div', { 'style': 'margin:8px 0; max-height:170px; overflow:auto; border:1px solid rgba(128,128,128,0.3); padding:8px; border-radius:4px;' }, checks.length ? checks : new Array(E('em', new Object(), _('No unmounted partitions/disks found')))),
E('div', { 'class': 'right', 'style': 'margin-top:12px;' }, new Array(
E('button', { 'class': 'cbi-button', 'click': ui.hideModal }, _('Cancel')), ' ',
E('button', { 'class': 'cbi-button cbi-button-action', 'click': function() {
var chosen = new Array();
checks.forEach(function(lbl) { var inp = lbl.querySelector('input'); if (inp && inp.checked) chosen.push(inp.value); });
if (!vgIn.value.trim() || !chosen.length) { ui.addNotification(null, E('p', new Object(), _('Enter VG name and select at least 1 device.')), 'warning'); return; }
ui.hideModal();
callLvmAction('vgcreate', vgIn.value.trim(), '', '', chosen.join(' ')).then(function(r) {
if (r && r.error) ui.addNotification(null, E('p', new Object(), r.error), 'error');
else { ui.addNotification(null, E('p', new Object(), _('Volume Group created.')), 'info'); self.refreshAll(); }
});
} }, _('Create VG'))
))
));
};

var openLvCreateModal = function() {
var vgIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': 'vg_nas' });
var lvIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': 'lv_data' });
var szIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': '10G', 'placeholder': 'e.g. 10G or 500M' });
ui.showModal(_('Create Logical Volume (lvcreate)'), new Array(
E('div', { 'class': 'cbi-value' }, new Array(E('label', { 'class': 'cbi-value-title' }, _('Volume Group')), E('div', { 'class': 'cbi-value-field' }, new Array(vgIn)))),
E('div', { 'class': 'cbi-value' }, new Array(E('label', { 'class': 'cbi-value-title' }, _('Logical Volume')), E('div', { 'class': 'cbi-value-field' }, new Array(lvIn)))),
E('div', { 'class': 'cbi-value' }, new Array(E('label', { 'class': 'cbi-value-title' }, _('Size')), E('div', { 'class': 'cbi-value-field' }, new Array(szIn)))),
E('div', { 'class': 'right', 'style': 'margin-top:12px;' }, new Array(
E('button', { 'class': 'cbi-button', 'click': ui.hideModal }, _('Cancel')), ' ',
E('button', { 'class': 'cbi-button cbi-button-action', 'click': function() {
ui.hideModal();
callLvmAction('lvcreate', vgIn.value.trim(), lvIn.value.trim(), szIn.value.trim(), '').then(function(r) {
if (r && r.error) ui.addNotification(null, E('p', new Object(), r.error), 'error');
else { ui.addNotification(null, E('p', new Object(), _('Logical Volume created.')), 'info'); self.refreshAll(); }
});
} }, _('Create LV'))
))
));
};
var openIscsiLoginModal = function() {
var portalIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'placeholder': '192.168.5.50:3260' });
ui.showModal(_('Discover & Login iSCSI Target'), new Array(
E('div', { 'class': 'cbi-value' }, new Array(E('label', { 'class': 'cbi-value-title' }, _('Target Portal (IP:Port)')), E('div', { 'class': 'cbi-value-field' }, new Array(portalIn)))),
E('div', { 'class': 'right', 'style': 'margin-top:12px;' }, new Array(
E('button', { 'class': 'cbi-button', 'click': ui.hideModal }, _('Cancel')), ' ',
E('button', { 'class': 'cbi-button cbi-button-action', 'click': function() {
ui.hideModal();
callIscsiAction('discover_login', portalIn.value.trim(), '', '', 1).then(function(r) {
if (r && r.error) ui.addNotification(null, E('p', new Object(), r.error), 'error');
else { ui.addNotification(null, E('p', new Object(), _('iSCSI target connected.')), 'info'); self.refreshAll(); }
});
} }, _('Discover & Login'))
))
));
};

var openIscsiTargetModal = function() {
var iqnIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': 'iqn.2026-11.local.openwrt:nas.lun1' });
var devSel = E('select', { 'class': 'cbi-input-select' }, candidateParts.map(function(p) { return E('option', { 'value': p.dev }, p.label); }));
var tidIn = E('input', { 'type': 'number', 'class': 'cbi-input-text', 'value': '1', 'min': '1' });
ui.showModal(_('Export iSCSI Target LUN (tgt)'), new Array(
E('div', { 'class': 'cbi-value' }, new Array(E('label', { 'class': 'cbi-value-title' }, _('Target IQN')), E('div', { 'class': 'cbi-value-field' }, new Array(iqnIn)))),
E('div', { 'class': 'cbi-value' }, new Array(E('label', { 'class': 'cbi-value-title' }, _('Backing Block Device')), E('div', { 'class': 'cbi-value-field' }, new Array(devSel)))),
E('div', { 'class': 'cbi-value' }, new Array(E('label', { 'class': 'cbi-value-title' }, _('Target ID')), E('div', { 'class': 'cbi-value-field' }, new Array(tidIn)))),
E('div', { 'class': 'right', 'style': 'margin-top:12px;' }, new Array(
E('button', { 'class': 'cbi-button', 'click': ui.hideModal }, _('Cancel')), ' ',
E('button', { 'class': 'cbi-button cbi-button-action', 'click': function() {
ui.hideModal();
callIscsiAction('target_add', '', iqnIn.value.trim(), devSel.value, Number(tidIn.value) || 1).then(function(r) {
if (r && r.error) ui.addNotification(null, E('p', new Object(), r.error), 'error');
else { ui.addNotification(null, E('p', new Object(), _('iSCSI target LUN exported.')), 'info'); self.refreshAll(); }
});
} }, _('Export LUN'))
))
));
};

var lvmSummary = (vgsRaw || pvsRaw || lvsRaw)
? ('Volume Groups:\n' + (vgsRaw || 'none') + '\n\nPhysical Volumes:\n' + (pvsRaw || 'none') + '\n\nLogical Volumes:\n' + (lvsRaw || 'none'))
: _('No LVM2 Physical Volumes, Volume Groups, or Logical Volumes configured.');

statusBox.appendChild(E('div', { 'class': 'cbi-section-node', 'style': 'padding:12px; border:1px solid rgba(128,128,128,0.25); border-radius:6px; margin-top:14px; margin-bottom:14px;' }, new Array(
E('div', { 'style': 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;' }, new Array(
E('h4', { 'style': 'margin:0;' }, _('LVM2 Logical Volume Management')),
E('div', new Object(), new Array(
E('button', { 'class': 'cbi-button', 'click': openVgCreateModal }, _('Create Volume Group')), ' ',
E('button', { 'class': 'cbi-button cbi-button-action', 'click': openLvCreateModal }, _('Create Logical Volume'))
))
)),
E('pre', { 'style': 'font-size:12px; padding:8px; background:rgba(0,0,0,0.18); border-radius:4px; overflow:auto; max-height:200px;' }, lvmSummary.trim())
)));

var iscsiSummary = (iscsiSess || iscsiTgt)
? ('Active Initiator Sessions:\n' + (iscsiSess || 'none') + '\n\nExported Target LUNs:\n' + (iscsiTgt || 'none'))
: _('No active iSCSI initiator sessions or exported target LUNs.');

statusBox.appendChild(E('div', { 'class': 'cbi-section-node', 'style': 'padding:12px; border:1px solid rgba(128,128,128,0.25); border-radius:6px;' }, new Array(
E('div', { 'style': 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;' }, new Array(
E('h4', { 'style': 'margin:0;' }, _('iSCSI Initiator & Target LUNs')),
E('div', new Object(), new Array(
E('button', { 'class': 'cbi-button', 'click': function() { callIscsiAction('logout_all', '', '', '', 1).then(function() { self.refreshAll(); }); } }, _('Logout All')), ' ',
E('button', { 'class': 'cbi-button', 'click': openIscsiLoginModal }, _('Connect Remote Target')), ' ',
E('button', { 'class': 'cbi-button cbi-button-action', 'click': openIscsiTargetModal }, _('Export Target LUN'))
))
)),
E('pre', { 'style': 'font-size:12px; padding:8px; background:rgba(0,0,0,0.18); border-radius:4px; overflow:auto; max-height:200px;' }, iscsiSummary.trim())
)));
}

return view.extend({
selectedDisk: null,
selectedItem: null,
disks: [],
diskInfo: {},
smartInfo: {},
installedList: '', kfsList: '', kbusList: '',

load: function() {
return Promise.all([ callList(), callPackages(), uci.load('fstab') ]);
},

filterDisks: function(lsblkRes) {
var devs = (lsblkRes && lsblkRes.lsblk && lsblkRes.lsblk.blockdevices) || [];
return devs.filter(function(d) {
return d.type === 'disk' && !/^(mtd|ubi|loop|ram|zram|mmcblk0)/.test(d.name || '');
});
},

buildSegments: function(disk, infoRes) {
var totalBytes = Number(disk.size) || 1;
var sfd = (infoRes && infoRes.sfdisk && infoRes.sfdisk.partitiontable) || null;
var secSize = (sfd && Number(sfd.sectorsize)) || Number(infoRes.logical_bs) || 512;
var parts = disk.children || [];
var segs = [];

if (sfd && Array.isArray(sfd.partitions) && sfd.partitions.length > 0) {
var firstLba = Number(sfd.firstlba) || 2048;
var lastLba = Number(sfd.lastlba) || Math.floor(totalBytes / secSize) - 34;
var sorted = sfd.partitions.slice().sort(function(a, b) { return Number(a.start) - Number(b.start); });
var cursor = firstLba;

sorted.forEach(function(sp) {
var st = Number(sp.start) || 0;
var sz = Number(sp.size) || 0;
if (st - cursor > 2048) {
segs.push({ kind: 'free', name: 'Unallocated', size: (st - cursor) * secSize, startSec: cursor, endSec: st - 1 });
}
var child = parts.find(function(c) { return c.kname === sp.node || ('/dev/' + c.name) === sp.node; }) || {};
var pnum = Number((sp.node || '').replace(/^.*[^0-9]/, '')) || 1;
segs.push({
kind: 'part', num: pnum,
node: sp.node || ('/dev/' + child.name),
name: child.name || (sp.node || '').replace('/dev/', ''),
size: sz * secSize,
fstype: child.fstype || '',
label: child.label || sp.name || '',
uuid: child.uuid || '',
parttype: child.parttypename || sp.type || '',
flags: child.partflags || '',
mountpoint: child.mountpoint || ''
});
cursor = st + sz;
});

if (lastLba - cursor > 2048) {
segs.push({ kind: 'free', name: 'Unallocated', size: (lastLba - cursor + 1) * secSize, startSec: cursor, endSec: lastLba });
}
} else {
if (parts.length > 0) {
            var lbs = Number((infoRes && infoRes.logical_bs) || 512);
            var sorted = parts.slice().sort(function(a, b) { return (Number(a.start) || 0) - (Number(b.start) || 0); });
            var cursor = 1048576;
            sorted.forEach(function(child, idx) {
                var sz = Number(child.size) || 0;
                var stBytes = (child.start != null) ? (Number(child.start) * lbs) : cursor;
                if (stBytes - cursor > 1048576) {
                    segs.push({ kind: 'free', name: 'Unallocated', size: stBytes - cursor });
                }
                var pnum = Number((child.name || '').replace(/^.*[^0-9]/, '')) || (idx + 1);
                segs.push({
                    kind: 'part', num: pnum,
                    node: '/dev/' + child.name,
                    name: child.name,
                    size: sz,
                    fstype: child.fstype || '',
                    label: child.label || '',
                    uuid: child.uuid || '',
                    parttype: child.parttypename || '', rawparttype: child.parttype || '',
                    flags: child.partflags || '',
                    mountpoint: child.mountpoint || ''
                });
                cursor = stBytes + sz;
            });
            if (totalBytes - cursor > 1048576) {
                segs.push({ kind: 'free', name: 'Unallocated', size: totalBytes - cursor });
            }
        } else {
            segs.push({ kind: 'free', name: 'Unallocated (No partition table)', size: totalBytes });
        }
}
return segs;
},

runWithProgress: function(title, startPromise, onDone) {
var barFill = E('div', { 'style': 'height:100%; width:5%; background:#2e7d32; transition:width 0.4s;' });
var pctEl = E('strong', {}, '5%');
var stepEl = E('div', { 'style': 'margin-bottom:6px; font-weight:600;' }, _('Starting operation...'));
var timeEl = E('div', { 'style': 'font-size:12px; opacity:0.85;' }, _('Elapsed: 0s · ETA: calculating...'));
var msgEl = E('div', { 'style': 'margin-top:8px; font-size:12px;' }, '');

ui.showModal(title, [
stepEl,
E('div', { 'style': 'width:100%; height:18px; background:rgba(128,128,128,0.25); border-radius:4px; overflow:hidden; margin:8px 0;' }, [ barFill ]),
E('div', { 'style': 'display:flex; justify-content:space-between;' }, [ pctEl, timeEl ]),
msgEl
]);

var stopped = false;
var poller = function() {
if (stopped) return;
return callJobStatus().then(function(st) {
if (!st || stopped) return;
var pct = Math.min(100, Math.max(0, Number(st.pct) || 0));
barFill.style.width = pct + '%';
pctEl.textContent = pct + '%';
if (st.step) stepEl.textContent = st.step;
timeEl.textContent = _('Elapsed: %s · ETA: %s').format(fmtTime(st.elapsed), st.state === 'done' ? '0s' : fmtTime(st.eta));
if (st.state === 'done' || st.state === 'error') {
stopped = true;
poll.remove(poller);
msgEl.textContent = st.message || '';
setTimeout(function() {
ui.hideModal();
ui.addNotification(null, E('p', st.message || _('Completed')), st.state === 'error' ? 'error' : 'info');
if (onDone) onDone();
}, 900);
}
});
};

startPromise.then(function(res) {
if (res && res.error) {
stopped = true;
ui.hideModal();
ui.addNotification(null, E('p', res.error), 'error');
return;
}
poll.add(poller, 1);
});
},

refreshAll: function() {
var self = this;
return Promise.all([ callList(), callPackages(), uci.load('fstab') ]).then(function(res) {
self.disks = self.filterDisks(res.at(0));
self.installedList = (res.at(1) && res.at(1).installed) || ''; self.kfsList = (res.at(1) && res.at(1).kfs) || ''; self.kbusList = (res.at(1) && res.at(1).kbuses) || '';
if (!self.selectedDisk || !self.disks.some(function(d) { return '/dev/' + d.name === self.selectedDisk; })) {
self.selectedDisk = self.disks.length ? ('/dev/' + self.disks.at(0).name) : null;
}
if (!self.selectedDisk) { self.renderMain(); return; }
return Promise.all([ callInfo(self.selectedDisk), callSmart(self.selectedDisk) ]).then(function(dres) {
self.diskInfo = dres.at(0) || {};
self.smartInfo = dres.at(1) || {};
self.renderMain();
});
});
},

    buildRoleWidget: function(keepOpt) {
        var opts = keepOpt ? [ keepOpt ] : [];
        var roles = [
            { v: 'linux', l: 'Linux Filesystem (0FC63DAF / 0x83)' },
            { v: 'home', l: 'Linux /home (933AC7E1 / 0x83)' },
            { v: 'raid', l: 'Linux RAID Member (A19D880F / 0xFD)' },
            { v: 'lvm', l: 'Linux LVM PV (E6D6D379 / 0x8E)' },
            { v: 'swap', l: 'Linux Swap (0657FD6D / 0x82)' },
            { v: 'luks', l: 'Linux LUKS Encrypted (CA7D7CCB / 0x83)' },
            { v: 'dmcrypt', l: 'Linux Plain dm-crypt (7FFEC5C9 / 0x83)' },
            { v: 'bios', l: 'BIOS Boot Partition (21686148 / 0xDA)' },
            { v: 'esp', l: 'EFI System Partition (C12A7328 / 0xEF)' },
            { v: 'zfs', l: 'ZFS / Solaris / FreeBSD ZFS (516E7CBA / 0xBF)' },
            { v: 'apfs', l: 'Apple APFS (7C3457EF / 0xAF)' },
            { v: 'hfs', l: 'Apple HFS / HFS+ (48465300 / 0xAF)' },
            { v: 'msftdata', l: 'Microsoft Basic Data (EBD0A0A2 / 0x07)' },
            { v: 'msr', l: 'Microsoft Reserved MSR (E3C9E316 / 0x0C)' },
            { v: 'ldm', l: 'Windows Dynamic Disk LDM (AF9B60A0 / 0x42)' },
            { v: 'diag', l: 'Windows Recovery (DE94BBA4 / 0x27)' },
            { v: 'custom', l: _('Custom Hex (0x..) or GPT GUID...') }
        ];
        roles.forEach(function(r) { opts.push(E('option', { 'value': r.v }, r.l)); });
        var sel = E('select', { 'class': 'cbi-input-select' }, opts);
        var customIn = E('input', {
            'type': 'text', 'class': 'cbi-input-text',
            'placeholder': 'e.g. 0x83 or 0FC63DAF-8483-4772-8E79-3D69D8477DE4',
            'style': 'display:none; margin-top:6px; width:100%;'
        });
        sel.addEventListener('change', function() {
            customIn.style.display = (sel.value === 'custom') ? '' : 'none';
        });
        return {
            sel: sel,
            node: E('div', {}, [ sel, customIn ]),
            getValue: function() { return sel.value === 'custom' ? customIn.value.trim() : sel.value; }
        };
    },

    openCreateModal: function(diskObj, seg, existingLayout) {
        var self = this;
        var maxMiB = Math.max(1, Math.floor((Number(seg.size) || 0) / (1024 * 1024)));
        var preMiB = 0;
        var sizeMiB = maxMiB;

        var layoutSel = E('select', { 'class': 'cbi-input-select', 'disabled': existingLayout ? true : null },
            existingLayout ? [
                E('option', { 'value': existingLayout }, existingLayout === 'gpt' ? 'GPT (Locked - existing table)' : 'MBR (Locked - existing table)')
            ] : [
                E('option', { 'value': 'gpt' }, 'GPT (GUID Partition Table)'),
                E('option', { 'value': 'mbr' }, 'MBR (Master Boot Record)')
            ]
        );

        var ptypeSel = E('select', { 'class': 'cbi-input-select' }, [ E('option', { 'value': 'primary' }, _('Primary')) ]);
        var syncPtype = function() {
            ptypeSel.innerHTML = '';
            ptypeSel.appendChild(E('option', { 'value': 'primary' }, _('Primary')));
            if (layoutSel.value === 'mbr') {
                ptypeSel.appendChild(E('option', { 'value': 'extended' }, _('Extended')));
                ptypeSel.disabled = false;
            } else {
                ptypeSel.disabled = true;
            }
        };
        layoutSel.addEventListener('change', syncPtype);
        syncPtype();

        var fsSel = this.buildFsSelect(true);
        var roleW = this.buildRoleWidget(null);
        var roleSel = roleW.sel;
        fsSel.addEventListener('change', function() {
            var v = fsSel.value;
            if (v === 'swap') roleSel.value = 'swap';
            else if (v === 'ntfs' || v === 'exfat' || v === 'vfat') roleSel.value = 'msftdata';
            else roleSel.value = 'linux';
            updatePreview();
        });

        var hatchBg = 'repeating-linear-gradient(45deg, rgba(128,128,128,0.14), rgba(128,128,128,0.14) 8px, rgba(128,128,128,0.24) 8px, rgba(128,128,128,0.24) 16px)';
        var segPre = E('div', { 'style': 'height:100%; background:' + hatchBg + ';' });
        var handleLeft = E('div', {
            'title': _('Drag left edge to adjust start offset'),
            'style': 'width:10px; height:100%; background:rgba(255,255,255,0.35); cursor:ew-resize; flex:0 0 10px;'
        });
        var segCenter = E('div', {
            'title': _('Drag partition to slide position'),
            'style': 'flex:1 1 auto; height:100%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; overflow:hidden; white-space:nowrap; cursor:grab; padding:0 4px;'
        });
        var handleRight = E('div', {
            'title': _('Drag right edge to resize partition'),
            'style': 'width:10px; height:100%; background:rgba(255,255,255,0.35); cursor:ew-resize; flex:0 0 10px;'
        });
        var segNew = E('div', {
            'style': 'height:100%; min-width:28px; background:#2e7d32; color:#fff; display:flex; align-items:stretch; overflow:hidden;'
        }, [ handleLeft, segCenter, handleRight ]);
        var segPost = E('div', { 'style': 'height:100%; background:' + hatchBg + ';' });
        var previewBar = E('div', {
            'style': 'display:flex; width:100%; height:44px; border-radius:6px; overflow:hidden; border:1px solid rgba(128,128,128,0.45); margin-bottom:12px; background:rgba(0,0,0,0.2); user-select:none; touch-action:none;'
        }, [ segPre, segNew, segPost ]);

        var preNumIn = E('input', { 'type': 'number', 'class': 'cbi-input-text', 'min': '0', 'step': 'any', 'value': '0', 'style': 'width:130px;' });
        var preUnitSel = E('select', { 'class': 'cbi-input-select', 'style': 'width:95px;' }, [
            E('option', { 'value': 'MiB', 'selected': 'selected' }, 'MiB'),
            E('option', { 'value': 'GiB' }, 'GiB'),
            E('option', { 'value': 'TiB' }, 'TiB'),
            E('option', { 'value': 'pct' }, '%')
        ]);
        var numIn = E('input', { 'type': 'number', 'class': 'cbi-input-text', 'min': '1', 'step': 'any', 'value': String((maxMiB / 1024).toFixed(2)), 'style': 'width:130px;', 'disabled': true });
        var unitSel = E('select', { 'class': 'cbi-input-select', 'style': 'width:95px;' }, [
            E('option', { 'value': 'max', 'selected': 'selected' }, 'Max'),
            E('option', { 'value': 'GiB' }, 'GiB'),
            E('option', { 'value': 'MiB' }, 'MiB'),
            E('option', { 'value': 'TiB' }, 'TiB'),
            E('option', { 'value': 'pct' }, '%')
        ]);
        var postNumIn = E('input', { 'type': 'number', 'class': 'cbi-input-text', 'min': '0', 'step': 'any', 'value': '0', 'style': 'width:130px;' });
        var postUnitSel = E('select', { 'class': 'cbi-input-select', 'style': 'width:95px;' }, [
            E('option', { 'value': 'MiB', 'selected': 'selected' }, 'MiB'),
            E('option', { 'value': 'GiB' }, 'GiB'),
            E('option', { 'value': 'TiB' }, 'TiB'),
            E('option', { 'value': 'pct' }, '%')
        ]);

        var fmtUnitVal = function(mib, u) {
            if (u === 'GiB') return (mib / 1024).toFixed(2);
            if (u === 'TiB') return (mib / 1048576).toFixed(3);
            if (u === 'pct') return Math.round((mib / maxMiB) * 100);
            return Math.round(mib);
        };

        var parseUnitVal = function(val, u) {
            var v = parseFloat(val) || 0;
            if (u === 'GiB') return v * 1024;
            if (u === 'TiB') return v * 1048576;
            if (u === 'pct') return (v / 100) * maxMiB;
            return v;
        };

        var syncPreFromMiB = function() { preNumIn.value = fmtUnitVal(preMiB, preUnitSel.value); };
        var syncPostFromMiB = function(postMiB) { postNumIn.value = fmtUnitVal(postMiB, postUnitSel.value); };
        var syncNumFromMiB = function() {
            var u = unitSel.value;
            numIn.disabled = (u === 'max');
            numIn.value = (u === 'max') ? ((maxMiB - preMiB) / 1024).toFixed(2) : fmtUnitVal(sizeMiB, u);
        };

        var updatePreview = function() {
            preMiB = Math.max(0, Math.min(maxMiB - 1, Math.round(preMiB)));
            sizeMiB = Math.max(1, Math.min(maxMiB - preMiB, Math.round(sizeMiB)));
            var postMiB = Math.max(0, maxMiB - preMiB - sizeMiB);
            segPre.style.flex = preMiB + ' 1 0';
            segNew.style.flex = sizeMiB + ' 1 0';
            segPost.style.flex = postMiB + ' 1 0';
            segNew.style.background = FS_COLORS[fsSel.value] || '#455a64';
            segCenter.textContent = (sizeMiB >= 1024 ? (sizeMiB / 1024).toFixed(1) + ' GiB' : sizeMiB + ' MiB');
            syncPostFromMiB(postMiB);
        };

        var startDrag = function(mode, ev) {
            ev.preventDefault();
            var startX = ev.clientX;
            var initPre = preMiB;
            var initSize = sizeMiB;
            var barW = previewBar.getBoundingClientRect().width || 1;
            var onMove = function(mv) {
                var deltaMiB = Math.round(((mv.clientX - startX) / barW) * maxMiB);
                if (unitSel.value === 'max') unitSel.value = 'GiB';
                if (mode === 'move') {
                    preMiB = Math.max(0, Math.min(maxMiB - initSize, initPre + deltaMiB));
                } else if (mode === 'left') {
                    var rightEdge = initPre + initSize;
                    preMiB = Math.max(0, Math.min(rightEdge - 1, initPre + deltaMiB));
                    sizeMiB = rightEdge - preMiB;
                } else if (mode === 'right') {
                    sizeMiB = Math.max(1, Math.min(maxMiB - initPre, initSize + deltaMiB));
                }
                syncPreFromMiB();
                syncNumFromMiB();
                updatePreview();
            };
            var onUp = function() {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        };
        handleLeft.addEventListener('pointerdown', function(e) { startDrag('left', e); });
        segCenter.addEventListener('pointerdown', function(e) { startDrag('move', e); });
        handleRight.addEventListener('pointerdown', function(e) { startDrag('right', e); });

        preUnitSel.addEventListener('change', syncPreFromMiB);
        preNumIn.addEventListener('input', function() {
            preMiB = parseUnitVal(preNumIn.value, preUnitSel.value);
            if (unitSel.value === 'max') sizeMiB = maxMiB - preMiB;
            else if (preMiB + sizeMiB > maxMiB) sizeMiB = maxMiB - preMiB;
            syncNumFromMiB();
            updatePreview();
        });
        unitSel.addEventListener('change', function() {
            if (unitSel.value === 'max') sizeMiB = maxMiB - preMiB;
            syncNumFromMiB();
            updatePreview();
        });
        numIn.addEventListener('input', function() {
            sizeMiB = parseUnitVal(numIn.value, unitSel.value);
            updatePreview();
        });
        postUnitSel.addEventListener('change', function() {
            syncPostFromMiB(Math.max(0, maxMiB - preMiB - sizeMiB));
        });
        postNumIn.addEventListener('input', function() {
            var wantPost = Math.max(0, Math.min(maxMiB - 1, Math.round(parseUnitVal(postNumIn.value, postUnitSel.value))));
            if (unitSel.value === 'max') unitSel.value = 'GiB';
            if (preMiB + wantPost >= maxMiB) preMiB = Math.max(0, maxMiB - wantPost - 1);
            sizeMiB = Math.max(1, maxMiB - preMiB - wantPost);
            syncPreFromMiB();
            syncNumFromMiB();
            updatePreview();
        });
        updatePreview();

        var labelInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'placeholder': _('Optional volume label') });

        ui.showModal(_('Create Partition on %s').format('/dev/' + diskObj.name), [
            previewBar,
            E('div', { 'class': 'cbi-section' }, [
                E('div', { 'class': 'cbi-value' }, [ E('label', { 'class': 'cbi-value-title' }, _('Partition Layout')), E('div', { 'class': 'cbi-value-field' }, [ layoutSel ]) ]),
                E('div', { 'class': 'cbi-value' }, [ E('label', { 'class': 'cbi-value-title' }, _('Partition Type')), E('div', { 'class': 'cbi-value-field' }, [ ptypeSel ]) ]),
                E('div', { 'class': 'cbi-value' }, [ E('label', { 'class': 'cbi-value-title' }, _('Filesystem')), E('div', { 'class': 'cbi-value-field' }, [ fsSel ]) ]),
                E('div', { 'class': 'cbi-value' }, [ E('label', { 'class': 'cbi-value-title' }, _('Partition Type ID')), E('div', { 'class': 'cbi-value-field' }, [ roleW.node ]) ]),
                E('div', { 'class': 'cbi-value' }, [ E('label', { 'class': 'cbi-value-title' }, _('Free Space Preceding')), E('div', { 'class': 'cbi-value-field' }, [ E('div', { 'style': 'display:flex; gap:8px; align-items:center;' }, [ preNumIn, preUnitSel ]) ]) ]),
                E('div', { 'class': 'cbi-value' }, [
                    E('label', { 'class': 'cbi-value-title' }, _('New Size (max %d MiB)').format(maxMiB)),
                    E('div', { 'class': 'cbi-value-field' }, [
                        E('div', { 'style': 'display:flex; gap:8px; align-items:center;' }, [ numIn, unitSel ])
                    ])
                ]),
                E('div', { 'class': 'cbi-value' }, [ E('label', { 'class': 'cbi-value-title' }, _('Free Space Following')), E('div', { 'class': 'cbi-value-field' }, [ E('div', { 'style': 'display:flex; gap:8px; align-items:center;' }, [ postNumIn, postUnitSel ]) ]) ]),
                E('div', { 'class': 'cbi-value' }, [ E('label', { 'class': 'cbi-value-title' }, _('Label')), E('div', { 'class': 'cbi-value-field' }, [ labelInput ]) ])
            ]),
            E('div', { 'class': 'right' }, [
                E('button', { 'class': 'btn', 'click': ui.hideModal }, _('Cancel')), ' ',
                E('button', {
                    'class': 'btn cbi-button-apply important',
                    'click': function() {
                        var szArg = (unitSel.value === 'max') ? 'max' : (Math.round(sizeMiB) + 'M');
                        self.runWithProgress(_('Creating Partition'),
                            callCreatePart('/dev/' + diskObj.name, layoutSel.value, ptypeSel.value, fsSel.value, szArg, labelInput.value.trim(), roleW.getValue(), Math.round(preMiB)),
                            function() { self.refreshAll(); }
                        );
                    }
                }, _('Create'))
            ])
        ]);
    },

    openFormatModal: function(seg) {
        var self = this;
        var fsSel = this.buildFsSelect(false); if (seg && seg.fstype) { for (var i = 0; i < fsSel.options.length; i++) { if (fsSel.options[i].value === seg.fstype && !fsSel.options[i].disabled) { fsSel.value = seg.fstype; break; } } }
        var labelInput = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': seg.label || '' });

ui.showModal(_('Format %s').format(seg.node), [
E('p', { 'style': 'color:#e53935; font-weight:600;' }, _('Warning: All existing data on %s will be permanently erased.').format(seg.node)),
E('div', { 'class': 'cbi-value' }, [ E('label', { 'class': 'cbi-value-title' }, _('Filesystem')), E('div', { 'class': 'cbi-value-field' }, [ fsSel ]) ]),
E('div', { 'class': 'cbi-value' }, [ E('label', { 'class': 'cbi-value-title' }, _('Volume Label')), E('div', { 'class': 'cbi-value-field' }, [ labelInput ]) ]),
E('div', { 'class': 'right' }, [
E('button', { 'class': 'btn', 'click': ui.hideModal }, _('Cancel')), ' ',
E('button', {
'class': 'btn cbi-button-negative',
'click': function() {
self.runWithProgress(_('Formatting %s').format(seg.node),
callFormatPart(seg.node, fsSel.value, labelInput.value.trim()),
function() { self.refreshAll(); }
);
}
}, _('Format'))
])
]);
},

openResizeModal: function(diskObj, seg) {
        var self = this;
        var segs = this.buildSegments(diskObj, this.diskInfo);
        var idx = segs.findIndex(function(x) { return x.node === seg.node; });
        var nextSeg = (idx >= 0 && idx + 1 < segs.length) ? segs.at(idx + 1) : null;
        var adjFreeMiB = (nextSeg && nextSeg.kind === 'free') ? Math.max(0, Math.floor((Number(nextSeg.size) || 0) / (1024 * 1024))) : 0;
        var curMiB = Math.max(64, Math.round((Number(seg.size) || 0) / (1024 * 1024)));
        var totalSpanMiB = curMiB + adjFreeMiB;
        var sizeMiB = curMiB;

        var hatchBg = 'repeating-linear-gradient(45deg, rgba(128,128,128,0.14), rgba(128,128,128,0.14) 8px, rgba(128,128,128,0.24) 8px, rgba(128,128,128,0.24) 16px)';
        var segCenter = E('div', {
            'style': 'flex:1 1 auto; height:100%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; overflow:hidden; white-space:nowrap; padding:0 6px;'
        });
        var handleRight = E('div', {
            'title': _('Drag right edge to grow or shrink partition'),
            'style': 'width:10px; height:100%; background:rgba(255,255,255,0.35); cursor:ew-resize; flex:0 0 10px;'
        });
        var segCur = E('div', {
            'style': 'height:100%; min-width:28px; background:' + (FS_COLORS[seg.fstype] || '#455a64') + '; color:#fff; display:flex; align-items:stretch; overflow:hidden;'
        }, [ segCenter, handleRight ]);
        var segPost = E('div', { 'style': 'height:100%; background:' + hatchBg + ';' });
        var previewBar = E('div', {
            'style': 'display:flex; width:100%; height:44px; border-radius:6px; overflow:hidden; border:1px solid rgba(128,128,128,0.45); margin-bottom:12px; background:rgba(0,0,0,0.2); user-select:none; touch-action:none;'
        }, [ segCur, segPost ]);
        var numIn = E('input', { 'type': 'number', 'class': 'cbi-input-text', 'min': '64', 'step': 'any', 'value': String((curMiB / 1024).toFixed(2)), 'style': 'width:130px;' });
        var unitSel = E('select', { 'class': 'cbi-input-select', 'style': 'width:95px;' }, [
            E('option', { 'value': 'GiB', 'selected': 'selected' }, 'GiB'),
            E('option', { 'value': 'MiB' }, 'MiB'),
            E('option', { 'value': 'TiB' }, 'TiB'),
            E('option', { 'value': 'pct' }, '%'),
            E('option', { 'value': 'max' }, 'Max')
        ]);
        var postNumIn = E('input', { 'type': 'number', 'class': 'cbi-input-text', 'min': '0', 'step': 'any', 'value': String(adjFreeMiB), 'style': 'width:130px;' });
        var postUnitSel = E('select', { 'class': 'cbi-input-select', 'style': 'width:95px;' }, [
            E('option', { 'value': 'MiB', 'selected': 'selected' }, 'MiB'),
            E('option', { 'value': 'GiB' }, 'GiB'),
            E('option', { 'value': 'TiB' }, 'TiB'),
            E('option', { 'value': 'pct' }, '%')
        ]);

        var fmtVal = function(mib, u) {
            if (u === 'GiB') return (mib / 1024).toFixed(2);
            if (u === 'TiB') return (mib / 1048576).toFixed(3);
            if (u === 'pct') return Math.round((mib / totalSpanMiB) * 100);
            return Math.round(mib);
        };
        var parseVal = function(val, u) {
            var v = parseFloat(val) || 0;
            if (u === 'GiB') return v * 1024;
            if (u === 'TiB') return v * 1048576;
            if (u === 'pct') return (v / 100) * totalSpanMiB;
            return v;
        };

        var syncInputs = function() {
            var u = unitSel.value;
            numIn.disabled = (u === 'max');
            numIn.value = (u === 'max') ? (totalSpanMiB / 1024).toFixed(2) : fmtVal(sizeMiB, u);
            postNumIn.value = fmtVal(Math.max(0, totalSpanMiB - sizeMiB), postUnitSel.value);
        };

        var updatePreview = function() {
            sizeMiB = Math.max(64, Math.min(totalSpanMiB, Math.round(sizeMiB)));
            var postMiB = Math.max(0, totalSpanMiB - sizeMiB);
            segCur.style.flex = sizeMiB + ' 1 0';
            segPost.style.flex = postMiB + ' 1 0';
            var delta = sizeMiB - curMiB;
            var tag = delta > 0 ? (' (+' + (delta >= 1024 ? (delta / 1024).toFixed(1) + ' GiB' : delta + ' MiB') + ')')
                    : (delta < 0 ? (' (' + (delta <= -1024 ? (delta / 1024).toFixed(1) + ' GiB' : delta + ' MiB') + ')') : '');
            segCenter.textContent = (sizeMiB >= 1024 ? (sizeMiB / 1024).toFixed(1) + ' GiB' : sizeMiB + ' MiB') + tag;
        };

        handleRight.addEventListener('pointerdown', function(ev) {
            ev.preventDefault();
            var startX = ev.clientX;
            var initSize = sizeMiB;
            var barW = previewBar.getBoundingClientRect().width || 1;
            var onMove = function(mv) {
                var deltaMiB = Math.round(((mv.clientX - startX) / barW) * totalSpanMiB);
                if (unitSel.value === 'max') unitSel.value = 'GiB';
                sizeMiB = Math.max(64, Math.min(totalSpanMiB, initSize + deltaMiB));
                syncInputs();
                updatePreview();
            };
            var onUp = function() {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        });

        unitSel.addEventListener('change', function() {
            if (unitSel.value === 'max') sizeMiB = totalSpanMiB;
            syncInputs();
            updatePreview();
        });
        numIn.addEventListener('input', function() {
            sizeMiB = parseVal(numIn.value, unitSel.value);
            postNumIn.value = fmtVal(Math.max(0, totalSpanMiB - Math.round(sizeMiB)), postUnitSel.value);
            updatePreview();
        });
        postUnitSel.addEventListener('change', syncInputs);
        postNumIn.addEventListener('input', function() {
            var wantPost = Math.max(0, Math.min(totalSpanMiB - 64, Math.round(parseVal(postNumIn.value, postUnitSel.value))));
            if (unitSel.value === 'max') unitSel.value = 'GiB';
            sizeMiB = totalSpanMiB - wantPost;
            numIn.value = fmtVal(sizeMiB, unitSel.value);
            updatePreview();
        });
        updatePreview();

        ui.showModal(_('Resize / Extend %s').format(seg.node), [
            previewBar,
            E('div', { 'class': 'cbi-section' }, [
                E('div', { 'class': 'cbi-value' }, [
                    E('label', { 'class': 'cbi-value-title' }, _('New Size (current %s)').format(fmtBytes(seg.size))),
                    E('div', { 'class': 'cbi-value-field' }, [ E('div', { 'style': 'display:flex; gap:8px; align-items:center;' }, [ numIn, unitSel ]) ])
                ]),
                E('div', { 'class': 'cbi-value' }, [
                    E('label', { 'class': 'cbi-value-title' }, _('Free Space Following')),
                    E('div', { 'class': 'cbi-value-field' }, [ E('div', { 'style': 'display:flex; gap:8px; align-items:center;' }, [ postNumIn, postUnitSel ]) ])
                ])
            ]),
            E('div', { 'class': 'right' }, [
                E('button', { 'class': 'btn', 'click': ui.hideModal }, _('Cancel')), ' ',
                E('button', {
                    'class': 'btn cbi-button-apply important',
                    'click': function() {
                        var delta = Math.round(sizeMiB) - curMiB;
                        if (delta === 0 && unitSel.value !== 'max') { ui.hideModal(); return; }
                        var szArg = (unitSel.value === 'max') ? 'max' : (delta < 0 ? ('-' + Math.abs(delta) + 'M') : (Math.round(sizeMiB) + 'M'));
                        self.runWithProgress(_('Resizing %s').format(seg.node),
                            callResizePart('/dev/' + diskObj.name, seg.num, szArg, seg.fstype || 'ext4'),
                            function() { self.refreshAll(); }
                        );
                    }
                }, _('Resize'))
            ])
        ]);
    },

    openMoveModal: function(diskObj, seg) {
        var self = this;
        var segs = this.buildSegments(diskObj, this.diskInfo);
        var idx = segs.findIndex(function(x) { return x.node === seg.node; });
        var prevSeg = (idx > 0) ? segs.at(idx - 1) : null;
        var nextSeg = (idx >= 0 && idx + 1 < segs.length) ? segs.at(idx + 1) : null;
        var initPreMiB = (prevSeg && prevSeg.kind === 'free') ? Math.max(0, Math.floor((Number(prevSeg.size) || 0) / (1024 * 1024))) : 0;
        var initPostMiB = (nextSeg && nextSeg.kind === 'free') ? Math.max(0, Math.floor((Number(nextSeg.size) || 0) / (1024 * 1024))) : 0;
        var partMiB = Math.max(1, Math.round((Number(seg.size) || 0) / (1024 * 1024)));
        var maxOffsetMiB = initPreMiB + initPostMiB;
        var totalSpanMiB = maxOffsetMiB + partMiB;
        var preMiB = initPreMiB;

        var hatchBg = 'repeating-linear-gradient(45deg, rgba(128,128,128,0.14), rgba(128,128,128,0.14) 8px, rgba(128,128,128,0.24) 8px, rgba(128,128,128,0.24) 16px)';
        var segPre = E('div', { 'style': 'height:100%; background:' + hatchBg + ';' });
        var segCenter = E('div', {
            'title': _('Drag partition left or right'),
            'style': 'height:100%; min-width:36px; background:' + (FS_COLORS[seg.fstype] || '#455a64') + '; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; overflow:hidden; white-space:nowrap; cursor:grab; padding:0 8px;'
        });
        var segPost = E('div', { 'style': 'height:100%; background:' + hatchBg + ';' });
        var previewBar = E('div', {
            'style': 'display:flex; width:100%; height:44px; border-radius:6px; overflow:hidden; border:1px solid rgba(128,128,128,0.45); margin-bottom:12px; background:rgba(0,0,0,0.2); user-select:none; touch-action:none;'
        }, [ segPre, segCenter, segPost ]);
        var preNumIn = E('input', { 'type': 'number', 'class': 'cbi-input-text', 'min': '0', 'step': 'any', 'value': String(preMiB), 'style': 'width:130px;' });
        var preUnitSel = E('select', { 'class': 'cbi-input-select', 'style': 'width:95px;' }, [
            E('option', { 'value': 'MiB', 'selected': 'selected' }, 'MiB'),
            E('option', { 'value': 'GiB' }, 'GiB'),
            E('option', { 'value': 'TiB' }, 'TiB')
        ]);
        var postNumIn = E('input', { 'type': 'number', 'class': 'cbi-input-text', 'min': '0', 'step': 'any', 'value': String(initPostMiB), 'style': 'width:130px;' });
        var postUnitSel = E('select', { 'class': 'cbi-input-select', 'style': 'width:95px;' }, [
            E('option', { 'value': 'MiB', 'selected': 'selected' }, 'MiB'),
            E('option', { 'value': 'GiB' }, 'GiB'),
            E('option', { 'value': 'TiB' }, 'TiB')
        ]);

        var fmtV = function(mib, u) { return u === 'GiB' ? (mib / 1024).toFixed(2) : (u === 'TiB' ? (mib / 1048576).toFixed(3) : Math.round(mib)); };
        var parseV = function(val, u) { var v = parseFloat(val) || 0; return u === 'GiB' ? v * 1024 : (u === 'TiB' ? v * 1048576 : v); };

        var syncBoxes = function() {
            preNumIn.value = fmtV(preMiB, preUnitSel.value);
            postNumIn.value = fmtV(Math.max(0, maxOffsetMiB - preMiB), postUnitSel.value);
        };
        var updatePreview = function() {
            preMiB = Math.max(0, Math.min(maxOffsetMiB, Math.round(preMiB)));
            var postMiB = Math.max(0, maxOffsetMiB - preMiB);
            segPre.style.flex = preMiB + ' 1 0';
            segCenter.style.flex = partMiB + ' 1 0';
            segPost.style.flex = postMiB + ' 1 0';
            var shift = preMiB - initPreMiB;
            var tag = shift !== 0 ? (' (' + (shift > 0 ? '+' : '') + (Math.abs(shift) >= 1024 ? (shift / 1024).toFixed(1) + ' GiB' : shift + ' MiB') + ')') : '';
            segCenter.textContent = (partMiB >= 1024 ? (partMiB / 1024).toFixed(1) + ' GiB' : partMiB + ' MiB') + tag;
        };

        segCenter.addEventListener('pointerdown', function(ev) {
            ev.preventDefault();
            var startX = ev.clientX, initP = preMiB, barW = previewBar.getBoundingClientRect().width || 1;
            var onMove = function(mv) {
                preMiB = Math.max(0, Math.min(maxOffsetMiB, initP + Math.round(((mv.clientX - startX) / barW) * totalSpanMiB)));
                syncBoxes(); updatePreview();
            };
            var onUp = function() { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        });
        preUnitSel.addEventListener('change', syncBoxes);
        postUnitSel.addEventListener('change', syncBoxes);
        preNumIn.addEventListener('input', function() { preMiB = parseV(preNumIn.value, preUnitSel.value); postNumIn.value = fmtV(Math.max(0, maxOffsetMiB - Math.round(preMiB)), postUnitSel.value); updatePreview(); });
        postNumIn.addEventListener('input', function() { var wp = Math.max(0, Math.min(maxOffsetMiB, Math.round(parseV(postNumIn.value, postUnitSel.value)))); preMiB = maxOffsetMiB - wp; preNumIn.value = fmtV(preMiB, preUnitSel.value); updatePreview(); });
        updatePreview();

        ui.showModal(_('Move Partition %s').format(seg.node), [
            E('p', { 'style': 'color:#ef6c00; font-weight:600;' }, _('Warning: Moving relocates data sectors on disk. Do not power off or interrupt until complete.')),
            previewBar,
            E('div', { 'class': 'cbi-section' }, [
                E('div', { 'class': 'cbi-value' }, [ E('label', { 'class': 'cbi-value-title' }, _('Free Space Preceding')), E('div', { 'class': 'cbi-value-field' }, [ E('div', { 'style': 'display:flex; gap:8px; align-items:center;' }, [ preNumIn, preUnitSel ]) ]) ]),
                E('div', { 'class': 'cbi-value' }, [ E('label', { 'class': 'cbi-value-title' }, _('Free Space Following')), E('div', { 'class': 'cbi-value-field' }, [ E('div', { 'style': 'display:flex; gap:8px; align-items:center;' }, [ postNumIn, postUnitSel ]) ]) ])
            ]),
            E('div', { 'class': 'right' }, [
                E('button', { 'class': 'btn', 'click': ui.hideModal }, _('Cancel')), ' ',
                E('button', {
                    'class': 'btn cbi-button-apply important',
                    'click': function() {
                        var deltaMiB = Math.round(preMiB) - initPreMiB;
                        if (deltaMiB === 0) { ui.hideModal(); return; }
                        self.runWithProgress(_('Moving %s').format(seg.node),
                            callMovePart('/dev/' + diskObj.name, seg.num, deltaMiB, seg.fstype || ''),
                            function() { self.refreshAll(); }
                        );
                    }
                }, _('Move'))
            ])
        ]);
    },

        getLabelPkgStatus: function(fstype) {
        var map = { ext4: 'tune2fs', ext3: 'tune2fs', ext2: 'tune2fs', vfat: 'dosfstools', fat32: 'dosfstools', ntfs: 'ntfs-3g', exfat: 'exfat-mkfs', btrfs: 'btrfs-progs' };
        var pkg = map[(fstype || '').toLowerCase()] || '';
        var ok = pkg ? String(this.installedList || '').indexOf(pkg) !== -1 : false;
        return { pkg: pkg, installed: ok };
    },

    openMetaModal: function(diskObj, seg, existingLayout) {
var self = this;
var st = this.getLabelPkgStatus(seg.fstype);
        var lblIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': seg.label || '', 'disabled': !st.installed ? 'disabled' : null });
        var lblWarn = !st.installed ? E('div', { 'style': 'display:flex; gap:8px; align-items:center; color:#ef6c00; font-size:12px; margin-top:6px;' }, [
            E('span', {}, st.pkg ? _('Requires %s to edit volume labels.').format(st.pkg) : _('Format partition before setting a volume label.')),
            st.pkg ? E('button', { 'class': 'btn cbi-button-action', 'click': function() {
                self.runWithProgress(_('Installing %s').format(st.pkg), callPkgAct('add', st.pkg), function() { self.refreshAll().then(function() { self.openMetaModal(diskObj, seg, existingLayout); }); });
            } }, _('Install %s').format(st.pkg)) : ''
        ]) : '';
        var keepOpt = E('option', { 'value': '' }, _('(Keep current: %s)').format((seg.parttype || _('Unknown')) + (seg.rawparttype ? (' [' + seg.rawparttype + ']') : '')));
        var roleW = this.buildRoleWidget(keepOpt);
                var fStr = String(seg.flags || '');
        var rType = String(seg.rawparttype || '').toLowerCase();
        var isBoot = (fStr.indexOf('0x80') !== -1 || fStr.indexOf('Boot') !== -1 || fStr.indexOf('2') !== -1);
        var isHidden = (fStr.indexOf('62') !== -1 || fStr.indexOf('Hidden') !== -1 || rType === '0x17' || rType === '0x1b' || rType === '0x1c');
        var isNoAuto = (fStr.indexOf('63') !== -1 || fStr.indexOf('NoBlockIO') !== -1);
        var flagBoot = E('input', { 'type': 'checkbox', 'checked': isBoot ? 'checked' : null });
        var flagHidden = E('input', { 'type': 'checkbox', 'checked': isHidden ? 'checked' : null });
        var flagNoAuto = E('input', { 'type': 'checkbox', 'checked': isNoAuto ? 'checked' : null });

ui.showModal(_('Label, Type ID & Flags — %s').format(seg.node), [
E('div', { 'class': 'cbi-value' }, [ E('label', { 'class': 'cbi-value-title' }, _('Volume Label')), E('div', { 'class': 'cbi-value-field' }, [ lblIn, lblWarn ]) ]),
E('div', { 'class': 'cbi-value' }, [ E('label', { 'class': 'cbi-value-title' }, _('Partition Type ID')), E('div', { 'class': 'cbi-value-field' }, [ roleW.node ]) ]),
E('div', { 'class': 'cbi-value' }, [
E('label', { 'class': 'cbi-value-title' }, _('Partition Flags')),
E('div', { 'class': 'cbi-value-field', 'style': 'display:flex; gap:16px; align-items:center;' }, [
E('label', {}, [ flagBoot, ' ', existingLayout === 'gpt' ? 'Legacy Boot' : 'Boot / Active' ]),
E('label', {}, [ flagHidden, ' Hidden' ]),
E('label', {}, [ flagNoAuto, ' No Auto-Mount' ])
])
]),
E('div', { 'class': 'right' }, [
E('button', { 'class': 'btn', 'click': ui.hideModal }, _('Cancel')), ' ',
E('button', {
'class': 'btn cbi-button-apply important',
'click': function() {
var fl = [];
if (flagBoot.checked) fl.push(existingLayout === 'gpt' ? 'legacy_boot' : 'boot');
if (flagHidden.checked) fl.push('hidden');
if (flagNoAuto.checked) fl.push('no_auto');
ui.hideModal();
callSetMeta('/dev/' + diskObj.name, seg.num, lblIn.value.trim(), seg.fstype || '', roleW.getValue(), fl.join(',')).then(function() {
ui.addNotification(null, E('p', _('Updated partition metadata for %s').format(seg.node)), 'info');
self.refreshAll();
});
}
}, _('Apply'))
])
]);
},

    detectTableLayout: function(disk) {
        var sfd = (this.diskInfo && this.diskInfo.sfdisk && this.diskInfo.sfdisk.partitiontable) || {};
        var pt = sfd.label || (disk && disk.pttype) || '';
        if (pt === 'gpt') return 'gpt';
        if (pt === 'dos' || pt === 'mbr') return 'mbr';
        var kids = (disk && disk.children) || [];
        if (kids.length > 0) {
            var firstType = String(kids.at(0).parttype || '');
            if (firstType.indexOf('-') !== -1) return 'gpt';
            return 'mbr';
        }
        return null;
    },

    getCurDisk: function() {
var self = this;
return this.disks.find(function(d) { return '/dev/' + d.name === self.selectedDisk; }) || this.disks[0] || {};
},

renderDiskSelector: function() {
var self = this;
var sel = E('select', {
'class': 'cbi-input-select',
'style': 'min-width:260px; font-weight:600;',
'change': function() {
self.selectedDisk = sel.value;
self.selectedItem = null;
self.refreshAll();
}
}, this.disks.map(function(d) {
var dev = '/dev/' + d.name;
var lbl = '%s — %s (%s)'.format(dev, (d.model || d.tran || 'Block Device').trim(), fmtBytes(d.size));
return E('option', { 'value': dev, 'selected': dev === self.selectedDisk ? 'selected' : null }, lbl);
}));

var sfd = (this.diskInfo && this.diskInfo.sfdisk && this.diskInfo.sfdisk.partitiontable) || {};
var det = this.detectTableLayout(this.getCurDisk()); var tblLabel = det ? det.toUpperCase() : _('Unformatted');
var temp = (this.smartInfo && this.smartInfo.smart && this.smartInfo.smart.temperature && this.smartInfo.smart.temperature.current);

return E('div', {
'style': 'display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; padding:10px 14px; margin-bottom:14px; background:var(--background-color-medium, rgba(255,255,255,0.03)); border:1px solid var(--border-color-medium, rgba(128,128,128,0.25)); border-radius:6px;'
}, [
E('div', { 'style': 'display:flex; align-items:center; gap:10px;' }, [
E('strong', {}, _('Target Disk:')), sel,
E('button', { 'class': 'btn', 'click': function() { self.refreshAll(); } }, _('Refresh')),
(this.activeTab === 'info' && this.smartInfo && !this.smartInfo.installed) ? E('button', {
'class': 'btn cbi-button-action',
'click': function() {
self.runWithProgress(_('Installing S.M.A.R.T. Tools'), callPkgAct('add', 'smartmontools'), function() { self.refreshAll(); });
}
}, _('Install smartmontools')) : ''
]),
E('div', { 'style': 'display:flex; flex-wrap:wrap; gap:12px; font-size:12px;' }, [
E('span', {}, [ E('strong', {}, _('Table: ')), tblLabel ]),
E('span', {}, [ E('strong', {}, _('Bus: ')), (this.getCurDisk().tran || 'sata').toUpperCase() ]),
temp != null ? E('span', {}, [ E('strong', {}, _('Temp: ')), temp + ' °C' ]) : ''
])
]);
},

renderDiskTab: function() {
var self = this;
if (!this.disks.length) return E('div', { 'class': 'cbi-section' }, E('p', {}, _('No storage disks detected in /dev.')));

var disk = this.getCurDisk();
var sfd = (this.diskInfo && this.diskInfo.sfdisk && this.diskInfo.sfdisk.partitiontable) || {};
var existingLayout = this.detectTableLayout(disk);
var segs = this.buildSegments(disk, this.diskInfo);
        if (this.selectedItem) {
            var matched = segs.find(function(x) {
                return (self.selectedItem.node && x.node === self.selectedItem.node) ||
                       (self.selectedItem.kind === 'free' && x.kind === 'free');
            });
            this.selectedItem = matched || segs.at(0) || null;
        } else if (segs.length) {
            this.selectedItem = segs.at(0);
        }

        var totalBytes = segs.reduce(function(acc, x) { return acc + (Number(x.size) || 0); }, 0) || 1;
var bar = E('div', {
'style': 'display:flex; width:100%; height:54px; border-radius:6px; overflow:hidden; border:1px solid var(--border-color-medium, rgba(128,128,128,0.35)); margin-bottom:14px; background:rgba(0,0,0,0.2);'
}, segs.map(function(sg) {
var pct = Math.max(4, (Number(sg.size) / totalBytes) * 100);
var isSel = self.selectedItem && (self.selectedItem.node === sg.node && self.selectedItem.startSec === sg.startSec);
var bg = sg.kind === 'free' ? 'repeating-linear-gradient(45deg, rgba(128,128,128,0.12), rgba(128,128,128,0.12) 8px, rgba(128,128,128,0.22) 8px, rgba(128,128,128,0.22) 16px)' : (FS_COLORS[sg.fstype] || '#455a64');
return E('div', {
'style': 'flex:' + pct + ' 1 0; min-width:72px; overflow:hidden; background:' + bg + '; color:#fff; padding:6px 8px; box-sizing:border-box; cursor:pointer; display:flex; flex-direction:column; justify-content:center; border-right:1px solid rgba(0,0,0,0.4); outline:' + (isSel ? '3px solid #ffd54f' : 'none') + '; outline-offset:-3px;',
'click': function() { self.selectedItem = sg; self.renderMain(); }
}, [
E('div', { 'style': 'font-size:12px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;' }, sg.kind === 'free' ? _('Unallocated') : sg.name),
E('div', { 'style': 'font-size:11px; opacity:0.9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;' }, (sg.fstype ? sg.fstype + ' · ' : '') + fmtBytes(sg.size))
]);
}));

var cur = this.selectedItem, isFree = cur && cur.kind === 'free', isPart = cur && cur.kind === 'part';
var toolbar = E('div', { 'style': 'display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px;' }, [
E('button', { 'class': 'btn cbi-button-apply important', 'disabled': !isFree ? true : null, 'click': function() { if (isFree) self.openCreateModal(disk, cur, existingLayout); } }, _('Create Partition')),
E('button', { 'class': 'btn cbi-button-action', 'disabled': !(isPart && self.canResize(cur.fstype)) ? true : null, 'title': (isPart && !self.canResize(cur.fstype)) ? _('Resize unavailable for this filesystem or missing resize tool in Config tab') : '', 'click': function() { if (isPart && self.canResize(cur.fstype)) self.openResizeModal(disk, cur); } }, _('Resize / Extend')),
E('button', { 'class': 'btn cbi-button-action', 'disabled': !isPart ? true : null, 'click': function() { if (isPart) self.openMoveModal(disk, cur); } }, _('Move')),
            E('button', { 'class': 'btn cbi-button-action', 'disabled': !isPart ? true : null, 'click': function() { if (isPart) self.openFormatModal(cur); } }, _('Format')),
(function() { var st = isPart ? self.getLabelPkgStatus(cur.fstype) : { pkg: '', installed: true }; var tip = (isPart && !st.installed) ? (st.pkg ? _('Volume label editing requires %s (install in Config tab)').format(st.pkg) : _('Format partition first to edit volume label')) : null; return E('button', { 'title': tip, 'class': 'btn cbi-button-action', 'disabled': !isPart ? true : null, 'click': function() { if (isPart) self.openMetaModal(disk, cur, existingLayout); } }, _('Label / Type / Flags')); })(),
E('button', {
'class': 'btn cbi-button-action', 'disabled': !isPart ? true : null,
'click': function() {
if (!isPart) return;
callMountAct(cur.mountpoint ? 'umount' : 'mount', cur.node, '/mnt/' + cur.name).then(function(r) {
if (r && r.error) ui.addNotification(null, E('p', r.error), 'error'); else self.refreshAll();
});
}
}, (isPart && cur.mountpoint) ? _('Unmount') : _('Mount')),
E('button', {
'class': 'btn cbi-button-negative', 'disabled': !isPart ? true : null,
'click': function() {
if (!isPart) return;
ui.showModal(_('Delete %s?').format(cur.node), [
E('p', {}, _('Permanently delete partition %s (%s)?').format(cur.node, fmtBytes(cur.size))),
E('div', { 'class': 'right' }, [
E('button', { 'class': 'btn', 'click': ui.hideModal }, _('Cancel')), ' ',
E('button', { 'class': 'btn cbi-button-negative', 'click': function() {
self.runWithProgress(_('Deleting %s').format(cur.node), callDeletePart('/dev/' + disk.name, cur.num), function() { self.selectedItem = null; self.refreshAll(); });
} }, _('Delete'))
])
]);
}
}, _('Delete'))
]);

var tbl = E('table', { 'class': 'table cbi-section-table' }, [
E('tr', { 'class': 'tr table-titles' }, [
E('th', { 'class': 'th' }, _('Partition')), E('th', { 'class': 'th' }, _('Filesystem')), E('th', { 'class': 'th' }, _('Label')),
E('th', { 'class': 'th' }, _('Size')), E('th', { 'class': 'th' }, _('Mount Point')), E('th', { 'class': 'th' }, _('Type ID / Flags'))
])
].concat(segs.map(function(sg) {
var isSel = self.selectedItem && (self.selectedItem.node === sg.node && self.selectedItem.startSec === sg.startSec);
return E('tr', {
'class': 'tr', 'style': 'cursor:pointer;' + (isSel ? 'background:rgba(255, 213, 79, 0.14); font-weight:600;' : ''),
'click': function() { self.selectedItem = sg; self.renderMain(); }
}, [
E('td', { 'class': 'td' }, sg.kind === 'free' ? _('Unallocated space') : sg.node),
E('td', { 'class': 'td' }, sg.fstype || (sg.kind === 'free' ? '—' : 'unformatted')),
E('td', { 'class': 'td' }, sg.label || '—'),
E('td', { 'class': 'td' }, fmtBytes(sg.size)),
E('td', { 'class': 'td' }, sg.mountpoint || '—'),
E('td', { 'class': 'td' }, [ sg.parttype || '—', sg.flags ? ' [' + sg.flags + ']' : '' ])
]);
})));

return E('div', {}, [ this.renderDiskSelector(), bar, toolbar, tbl ]);
},

renderMountsTab: function() {
var self = this;
var mounts = uci.sections('fstab', 'mount') || [];
var allParts = [];
this.disks.forEach(function(d) {
(d.children || []).forEach(function(p) { if (p.uuid) allParts.push(p); });
});

var rows = [
E('tr', { 'class': 'tr table-titles' }, [
E('th', { 'class': 'th' }, _('Enabled')), E('th', { 'class': 'th' }, _('Device / UUID')),
E('th', { 'class': 'th' }, _('Mount Point')), E('th', { 'class': 'th' }, _('Filesystem')),
E('th', { 'class': 'th' }, _('Options')), E('th', { 'class': 'th' }, _('Actions'))
])
];

mounts.forEach(function(sec) {
var sid = sec['.name'];
rows.push(E('tr', { 'class': 'tr' }, [
E('td', { 'class': 'td' }, sec.enabled === '0' ? _('No') : _('Yes')),
E('td', { 'class': 'td' }, sec.uuid ? ('UUID=' + sec.uuid) : (sec.device || '—')),
E('td', { 'class': 'td' }, sec.target || '—'),
E('td', { 'class': 'td' }, sec.fstype || 'auto'),
E('td', { 'class': 'td' }, sec.options || 'defaults'),
E('td', { 'class': 'td' }, [
E('button', { 'class': 'btn cbi-button-negative', 'click': function() {
uci.remove('fstab', sid);
uci.save().then(function() { return uci.apply(); }).then(function() { self.refreshAll(); });
} }, _('Delete'))
])
]));
});

var openAddMount = function() {
var devSel = E('select', { 'class': 'cbi-input-select' }, allParts.map(function(p) {
return E('option', { 'value': p.uuid }, '/dev/%s (%s · %s · UUID=%s)'.format(p.name, p.fstype || 'auto', fmtBytes(p.size), p.uuid));
}));
var tgtIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': '/mnt/storage' });
var optIn = E('input', { 'type': 'text', 'class': 'cbi-input-text', 'value': 'defaults,noatime,nofail' });

ui.showModal(_('Add Persistent Mount Point (/etc/config/fstab)'), [
E('div', { 'class': 'cbi-value' }, [ E('label', { 'class': 'cbi-value-title' }, _('Partition (UUID)')), E('div', { 'class': 'cbi-value-field' }, [ devSel ]) ]),
E('div', { 'class': 'cbi-value' }, [ E('label', { 'class': 'cbi-value-title' }, _('Mount Point')), E('div', { 'class': 'cbi-value-field' }, [ tgtIn ]) ]),
E('div', { 'class': 'cbi-value' }, [ E('label', { 'class': 'cbi-value-title' }, _('Mount Options')), E('div', { 'class': 'cbi-value-field' }, [ optIn ]) ]),
E('div', { 'class': 'right' }, [
E('button', { 'class': 'btn', 'click': ui.hideModal }, _('Cancel')), ' ',
E('button', { 'class': 'btn cbi-button-apply important', 'click': function() {
var sid = uci.add('fstab', 'mount');
uci.set('fstab', sid, 'enabled', '1');
uci.set('fstab', sid, 'uuid', devSel.value);
uci.set('fstab', sid, 'target', tgtIn.value.trim());
uci.set('fstab', sid, 'options', optIn.value.trim());
ui.hideModal();
uci.save().then(function() { return uci.apply(); }).then(function() {
return callMountAct('block_mount', '', '');
}).then(function() { self.refreshAll(); });
} }, _('Save & Mount'))
])
]);
};

return E('div', {}, [
E('div', { 'style': 'display:flex; gap:8px; margin-bottom:12px;' }, [
E('button', { 'class': 'btn cbi-button-apply important', 'disabled': !allParts.length ? true : null, 'click': openAddMount }, _('Add Mount Point')),
E('button', { 'class': 'btn', 'click': function() { callMountAct('block_mount', '', '').then(function() { self.refreshAll(); }); } }, _('Mount All (fstab)'))
]),
E('table', { 'class': 'table cbi-section-table' }, rows)
]);
},

    smartAttrName: function(a) {
        var n = (a && a.name) || '';
        if (n && n.indexOf('Unknown_') !== 0) return n;
        var map = {
            171: 'Program_Fail_Count', 172: 'Erase_Fail_Count', 173: 'Ave_Block_Erase_Count',
            174: 'Unexpect_Power_Loss_Ct', 180: 'Unused_Rsvd_Blk_Cnt_Tot', 183: 'SATA_Interfac_Downshift',
            202: 'Percent_Lifetime_Remain', 206: 'Write_Error_Rate', 210: 'Success_RAIN_Recov_Cnt',
            231: 'SSD_Life_Left', 233: 'Media_Wearout_Indicator', 246: 'Total_LBAs_Written',
            247: 'Host_Program_Page_Count', 248: 'FTL_Program_Page_Count'
        };
        return (a && map[a.id]) || n || ('Attribute_' + (a ? a.id : '?'));
    },

    renderInfoTab: function() {
        if (!this.disks.length) return E('p', {}, _('No storage disks detected.'));
        var disk = this.getCurDisk();
        var sm = (this.smartInfo && this.smartInfo.smart) || {};
        var isSsd = (this.diskInfo.rotational === '0') || (sm.rotation_rate === 0);
        var rawSata = (sm.sata_version && sm.sata_version.current && sm.sata_version.current.string) || (this.diskInfo.sata_speed && this.diskInfo.sata_speed !== '<unknown>' ? this.diskInfo.sata_speed : '');
        var sataSpd = rawSata ? ('SATA (' + rawSata + ')') : '';
        var linkSpd = sataSpd || this.diskInfo.usb_speed || (disk.tran || 'Standard').toUpperCase();
        var attrs = (sm.ata_smart_attributes && sm.ata_smart_attributes.table) || [];
        var wearAttr = attrs.find(function(a) { return a.id === 202 || a.id === 231 || a.id === 233 || a.id === 177; });
        var wearPct = (sm.nvme_smart_health_information_log && sm.nvme_smart_health_information_log.percentage_used != null)
            ? (100 - sm.nvme_smart_health_information_log.percentage_used) + '% remaining'
            : (wearAttr ? (wearAttr.value + '% remaining') : 'See S.M.A.R.T. table below');

        var cards = [
            { k: 'Model', v: sm.model_name || disk.model || 'Unknown' },
            { k: 'Serial Number', v: sm.serial_number || disk.serial || 'N/A' },
            { k: 'Firmware', v: sm.firmware_version || 'N/A' },
            { k: 'Capacity', v: fmtBytes(disk.size) },
            { k: 'Media Type', v: isSsd ? 'Solid State Drive (SSD)' : 'Rotational HDD' },
            { k: 'Interface & Speed', v: linkSpd },
            { k: 'Sector Size (Log/Phys)', v: (this.diskInfo.logical_bs || 512) + ' / ' + (this.diskInfo.physical_bs || 512) + ' B' },
            { k: 'S.M.A.R.T. Health', v: sm.smart_status ? (sm.smart_status.passed ? 'PASSED' : 'FAILED') : (this.smartInfo.installed ? 'Unavailable' : 'smartmontools not installed') },
            { k: 'Power-On Hours', v: (sm.power_on_time && sm.power_on_time.hours != null) ? (sm.power_on_time.hours + ' hrs') : 'N/A' },
            { k: 'SSD Wear / Health', v: isSsd ? wearPct : 'N/A (HDD)' }
        ];

        var summaryCard = E('div', {
            'style': 'display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:16px;'
        }, cards.map(function(c) {
            return E('div', {
                'style': 'padding:10px 12px; border-radius:6px; background:var(--background-color-medium, rgba(255,255,255,0.03)); border:1px solid var(--border-color-medium, rgba(128,128,128,0.25));'
            }, [
                E('div', { 'style': 'font-size:11px; opacity:0.75;' }, _(c.k)),
                E('div', { 'style': 'font-size:14px; font-weight:600; margin-top:2px;' }, String(c.v))
            ]);
        }));

        var attrTbl = attrs.length ? E('table', { 'class': 'table cbi-section-table' }, [
            E('tr', { 'class': 'tr table-titles' }, [
                E('th', { 'class': 'th' }, 'ID'), E('th', { 'class': 'th' }, _('Attribute')),
                E('th', { 'class': 'th' }, _('Value')), E('th', { 'class': 'th' }, _('Worst')),
                E('th', { 'class': 'th' }, _('Thresh')), E('th', { 'class': 'th' }, _('Raw Value'))
            ])
        ].concat(attrs.map(function(a) {
            return E('tr', { 'class': 'tr' }, [
                E('td', { 'class': 'td' }, String(a.id)), E('td', { 'class': 'td' }, a.name || ''),
                E('td', { 'class': 'td' }, String(a.value)), E('td', { 'class': 'td' }, String(a.worst)),
                E('td', { 'class': 'td' }, String(a.thresh)),
                E('td', { 'class': 'td' }, (a.raw && a.raw.string) ? a.raw.string : String((a.raw && a.raw.value) || 0))
            ]);
        }))) : E('p', { 'style': 'opacity:0.8;' }, _('No detailed ATA S.M.A.R.T. attribute table reported.'));

        return E('div', {}, [ this.renderDiskSelector(), summaryCard, attrTbl ]);
    },

    isInstalled: function(pkgName) {
        var kfs = (this.kfsList || '').split(/\s+/);
        if (pkgName === 'kmod-fs-ext4' && kfs.indexOf('ext4') !== -1) return true;
        if (pkgName === 'kmod-fs-btrfs' && kfs.indexOf('btrfs') !== -1) return true;
        if (pkgName === 'kmod-fs-f2fs' && kfs.indexOf('f2fs') !== -1) return true;
        if (pkgName === 'kmod-fs-ntfs3' && (kfs.indexOf('ntfs3') !== -1 || kfs.indexOf('fuse') !== -1)) return true;
        if (pkgName === 'kmod-fs-exfat' && kfs.indexOf('exfat') !== -1) return true;
        if (pkgName === 'kmod-fs-vfat' && kfs.indexOf('vfat') !== -1) return true;
        if ((pkgName === 'kmod-ata-core' || pkgName === 'kmod-ata-ahci') && (this.kbusList || '').length > 0) return true;
        if (pkgName === 'kmod-usb-storage' && (this.kbusList || '').length > 0) return true;
        var lines = (this.installedList || '').split('\n');
        return lines.some(function(l) { return l === pkgName || l.indexOf(pkgName + '-') === 0; });
    },

        canFormat: function(fs) {
        if (fs === 'none') return true;
        if (fs === 'ext4' || fs === 'ext3' || fs === 'ext2') return this.isInstalled('e2fsprogs');
        if (fs === 'btrfs') return this.isInstalled('btrfs-progs');
        if (fs === 'f2fs') return this.isInstalled('f2fs-tools');
        if (fs === 'ntfs') return this.isInstalled('ntfs-3g');
        if (fs === 'exfat') return this.isInstalled('exfat-mkfs');
        if (fs === 'vfat') return this.isInstalled('dosfstools');
        if (fs === 'swap') return this.isInstalled('swap-utils');
        return false;
    },

    canResize: function(fs) {
        if (fs === 'ext4' || fs === 'ext3' || fs === 'ext2') return this.isInstalled('resize2fs');
        if (fs === 'btrfs') return this.isInstalled('btrfs-progs');
        if (fs === 'f2fs') return this.isInstalled('f2fs-tools');
        if (fs === 'ntfs') return this.isInstalled('ntfs-3g');
        return false;
    },

    buildFsSelect: function(includeNone) {
        var self = this;
        var items = [
            { v: 'ext4', l: 'ext4 (Linux)' },
            { v: 'ext2', l: 'ext2 (Linux /boot)' },
            { v: 'btrfs', l: 'btrfs (Linux CoW)' },
            { v: 'f2fs', l: 'f2fs (Flash-Friendly)' },
            { v: 'ntfs', l: 'ntfs (Windows)' },
            { v: 'exfat', l: 'exfat (Cross-Platform)' },
            { v: 'vfat', l: 'vfat / FAT32' },
            { v: 'swap', l: 'swap (Linux Swap)' }
        ];
        if (includeNone) items.push({ v: 'none', l: _('Unformatted') });
        var firstReady = null;
        var opts = items.map(function(it) {
            var ok = self.canFormat(it.v);
            if (ok && !firstReady) firstReady = it.v;
            return E('option', { 'value': it.v, 'disabled': !ok ? true : null }, ok ? it.l : (it.l + ' — ' + _('install in Config tab')));
        });
        var sel = E('select', { 'class': 'cbi-input-select' }, opts);
        if (firstReady) sel.value = firstReady;
        return sel;
    },

    renderConfigTab: function() {
var self = this;
var groups = [
{
title: 'Filesystems (Format & Mount)',
desc: 'Kernel drivers and userspace tools for formatting, checking, and mounting filesystems.',
items: [
{ label: 'Ext4 / Resize2fs', pkgs: 'kmod-fs-ext4 e2fsprogs resize2fs' },
{ label: 'Btrfs', pkgs: 'kmod-fs-btrfs btrfs-progs' },
{ label: 'F2FS', pkgs: 'kmod-fs-f2fs f2fs-tools' },
{ label: 'NTFS', pkgs: 'kmod-fs-ntfs3 ntfs-3g ntfs-3g-utils' },
{ label: 'exFAT', pkgs: 'kmod-fs-exfat exfat-mkfs exfat-fsck' },
{ label: 'FAT16 / FAT32', pkgs: 'kmod-fs-vfat dosfstools' },
{ label: 'Swap', pkgs: 'swap-utils' }
]
},
{
title: 'Storage Buses & Hardware Drivers',
desc: 'Kernel drivers for SATA, USB 3.0 / UASP, and NVMe storage.',
items: [
{ label: 'SATA / AHCI', pkgs: 'kmod-ata-core kmod-ata-ahci' },
{ label: 'USB Storage & UASP', pkgs: 'kmod-usb-storage kmod-usb-storage-uas' },
{ label: 'USB 3.0 (xHCI)', pkgs: 'kmod-usb3' },
{ label: 'NVMe', pkgs: 'kmod-nvme' }
]
},
{
title: 'Health & Diagnostics',
desc: 'S.M.A.R.T. wear telemetry, NVMe logs, and power management.',
items: [
{ label: 'S.M.A.R.T. Tools', pkgs: 'smartmontools' },
{ label: 'NVMe CLI', pkgs: 'nvme-cli' },
{ label: 'HDD Spin-Down (hd-idle)', pkgs: 'hd-idle luci-app-hd-idle' }
]
},
{
title: 'Advanced Storage & Replication',
desc: 'Packages for RAID, LVM, LUKS encryption, iSCSI, and rsync jobs.',
items: [
{ label: 'Software RAID (mdadm)', pkgs: 'mdadm' },
{ label: 'LVM2', pkgs: 'lvm2' },
{ label: 'LUKS Encryption', pkgs: 'cryptsetup' },
{ label: 'iSCSI Target', pkgs: 'tgt' }, { label: 'iSCSI Initiator', pkgs: 'open-iscsi' },
{ label: 'Rsync Backup', pkgs: 'rsync' }
]
}
];

var swatch = function(bg, text) {
            return E('span', { 'style': 'display:inline-flex; align-items:center; gap:6px;' }, [
                E('span', { 'style': 'display:inline-block; width:12px; height:12px; border-radius:3px; background:' + bg + ';' }),
                text
            ]);
        };
        var legend = E('div', {
            'style': 'display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; padding:8px 14px; margin-bottom:14px; border-radius:6px; background:var(--background-color-medium, rgba(255,255,255,0.03)); border:1px solid var(--border-color-medium, rgba(128,128,128,0.25)); font-size:12px;'
        }, [
            E('div', { 'style': 'display:flex; flex-wrap:wrap; gap:16px;' }, [
                swatch('#2e7d32', _('Full support (installed)')),
                swatch('#00695c', _('Partial / mount-only (click to add tools)')),
                swatch('rgba(128,128,128,0.35)', _('Not installed (click to install)'))
            ]),
            E('span', { 'style': 'opacity:0.75;' }, _('Click any badge to install or remove via apk'))
        ]);
        var grid = E('div', { 'style': 'display:grid; grid-template-columns:repeat(2, minmax(320px, 1fr)); gap:14px;' }, groups.map(function(g) {
return E('div', {
'style': 'padding:14px 16px; border-radius:6px; background:var(--background-color-medium, rgba(255,255,255,0.03)); border:1px solid var(--border-color-medium, rgba(128,128,128,0.25));'
}, [
E('h4', { 'style': 'margin:0 0 4px 0;' }, _(g.title)),
E('div', { 'style': 'font-size:12px; opacity:0.75; margin-bottom:12px;' }, _(g.desc)),
E('div', { 'style': 'display:flex; flex-wrap:wrap; gap:8px;' }, g.items.map(function(it) {
var pkgList = it.pkgs.split(' ');
var allOk = pkgList.every(function(p) { return self.isInstalled(p); });
var anyOk = pkgList.some(function(p) { return self.isInstalled(p); });
var btnStyle = allOk
    ? 'background:#2e7d32; color:#fff; border-color:#2e7d32; font-weight:600;'
    : (anyOk ? 'background:#00695c; color:#fff; border-color:#00695c; font-weight:600;' : 'background:rgba(128,128,128,0.12); color:inherit; opacity:0.65;');
return E('button', {
'type': 'button', 'class': 'btn',
'style': btnStyle,
'click': function() {
                        var btns = [ E('button', { 'class': 'btn', 'click': ui.hideModal }, _('Cancel')) ];
                        var bodyNodes = [
                            E('p', {}, _('Packages: ') + it.pkgs),
                            E('p', {}, allOk ? _('Status: Fully installed') : (anyOk ? _('Status: Partially installed (kernel driver active)') : _('Status: Not installed')))
                        ];
                        if (allOk) {
                            bodyNodes.push(E('p', { 'style': 'color:#e53935; font-weight:600;' }, _('Warning: Removing these packages will disable formatting and management for %s until reinstalled.').format(it.label)));
                        }
                        if (!allOk) {
                            btns.push(' ', E('button', { 'class': 'btn cbi-button-apply important', 'click': function() {
                                self.runWithProgress(_('Installing %s').format(it.label), callPkgAct('add', it.pkgs), function() { self.refreshAll(); });
                            } }, _('Install')));
                        }
                        if (anyOk) {
                            btns.push(' ', E('button', { 'class': 'btn cbi-button-negative', 'click': function() {
                                self.runWithProgress(_('Removing %s').format(it.label), callPkgAct('del', it.pkgs), function() { self.refreshAll(); });
                            } }, _('Confirm Remove')));
                        }
                        bodyNodes.push(E('div', { 'class': 'right' }, btns));
                        ui.showModal(it.label, bodyNodes);
                    }
                }, it.label);
}))
]);
}));
        return E('div', {}, [ legend, grid ]);
    },

    activeTab: 'disk',
rootNode: null,

renderMain: function() {
var self = this;
if (!this.rootNode) return;
var tabs = [
{ id: 'disk', title: _('Disk') },
{ id: 'mounts', title: _('Mounts') },
{ id: 'info', title: _('Info') },
{ id: 'volumes', title: _('Volumes (RAID / LVM / iSCSI)') },
{ id: 'backup', title: _('Backup (Rsync)') },
{ id: 'config', title: _('Config') }
];

var tabBar = E('ul', { 'class': 'cbi-tabmenu' }, tabs.map(function(t) {
return E('li', { 'class': (self.activeTab === t.id) ? 'cbi-tab' : 'cbi-tab-disabled' }, [
E('a', { 'href': '#', 'click': function(ev) { ev.preventDefault(); self.activeTab = t.id; self.renderMain(); } }, t.title)
]);
}));

var body;
if (this.activeTab === 'disk') body = this.renderDiskTab();
else if (this.activeTab === 'mounts') body = this.renderMountsTab();
else if (this.activeTab === 'info') body = this.renderInfoTab();
else if (this.activeTab === 'config') body = this.renderConfigTab();
else if (this.activeTab === 'volumes') body = buildVolumesTabView(this);
else body = E('div', { 'class': 'cbi-section' }, E('p', {}, _('Phase 3: Scheduled Rsync Mirror & Versioned Snapshot Jobs.')));

this.rootNode.innerHTML = '';
this.rootNode.appendChild(E('h2', {}, _('Volume Manager')));
this.rootNode.appendChild(tabBar);
this.rootNode.appendChild(E('div', { 'class': 'cbi-section' }, [ body ]));
},

render: function(data) {
this.disks = this.filterDisks(data.at(0));
this.installedList = (data.at(1) && data.at(1).installed) || ''; this.kfsList = (data.at(1) && data.at(1).kfs) || ''; this.kbusList = (data.at(1) && data.at(1).kbuses) || '';
this.selectedDisk = this.disks.length ? ('/dev/' + this.disks.at(0).name) : null;
this.rootNode = E('div', { 'class': 'cbi-map' });

if (this.selectedDisk) {
var self = this;
Promise.all([ callInfo(this.selectedDisk), callSmart(this.selectedDisk) ]).then(function(res) {
self.diskInfo = res.at(0) || {};
self.smartInfo = res.at(1) || {};
self.renderMain();
});
} else {
this.renderMain();
}
return this.rootNode;
},

handleSaveApply: null, handleSave: null, handleReset: null
});
