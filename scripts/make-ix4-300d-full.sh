#!/bin/bash
set -e
cd /home/chief/openwrt
test "$(git branch --show-current)" = "lenovo-ix4-300d-release"
cp target/linux/mvebu/cortexa9/config-ix4-300d-full .config
make defconfig
make -j$(nproc) download
make -j$(nproc) || make -j1 V=s
cp -f bin/targets/mvebu/cortexa9/openwrt-mvebu-cortexa9-lenovo_ix4-300d-squashfs-sysupgrade.bin \
      bin/targets/mvebu/cortexa9/openwrt-mvebu-cortexa9-lenovo_ix4-300d-squashfs-sysupgrade-full.bin
ls -lh bin/targets/mvebu/cortexa9/*sysupgrade-full.bin
