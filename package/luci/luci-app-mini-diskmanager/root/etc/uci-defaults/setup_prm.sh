#!/bin/sh
chmod +x /usr/libexec/rpcd/minidiskmanager
[ -f /etc/config/fstab ] || touch /etc/config/fstab
rm -rf /tmp/luci-indexcache* /tmp/luci-modulecache/
/etc/init.d/rpcd reload >/dev/null 2>&1 || true
exit 0
