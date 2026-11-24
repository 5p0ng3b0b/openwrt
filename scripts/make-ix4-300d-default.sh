#!/bin/bash
cd /home/chief/openwrt
test "$(git branch --show-current)" = "lenovo-ix4-300d-release"
cp target/linux/mvebu/cortexa9/config-ix4-300d .config
make defconfig
make -j$(nproc) || make -j1 V=s
ls -lh bin/targets/mvebu/cortexa9/*ix4-300d*
