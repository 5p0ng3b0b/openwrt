#!/bin/bash
set -e
cd /home/chief/openwrt
test "$(git branch --show-current)" = "lenovo-ix4-300d-release"
cp target/linux/mvebu/cortexa9/config-ix4-300d .config
make defconfig
make -j$(nproc) download
make -j$(nproc) || make -j1 V=s
find build_dir/target-* -path '*linux-mvebu_cortexa9/lenovo_ix4-300d-kernel.bin' -exec cp -f {} bin/targets/mvebu/cortexa9/kernel.bin \;
find build_dir/target-* -path '*linux-mvebu_cortexa9/zImage' -exec cp -f {} bin/targets/mvebu/cortexa9/zImage \;
find build_dir/target-* -path '*linux-mvebu_cortexa9/linux-*/arch/arm/boot/dts/marvell/armada-xp-lenovo-ix4-300d.dtb' -exec cp -f {} bin/targets/mvebu/cortexa9/armada-xp-lenovo-ix4-300d.dtb \;
find build_dir/target-* -path '*linux-mvebu_cortexa9/linux-*/.config' -exec cp -f {} bin/targets/mvebu/cortexa9/kernel-ix4-300d.config \;
ls -lh bin/targets/mvebu/cortexa9/
