#!/bin/bash

# Set up variables
export profile="tplink_tl-mr3020-v1"
export ver="19.07.8"
export files="$HOME/$profile/files"
export fwdir="$HOME/$profile/firmware"
export source="$HOME/$profile/$ver"

# Trim base packages used in build
# Remove ip6, ppp, ssl and usb1
pkgs="-ppp -ppp-mod-pppoe "
pkgs+="-ip6tables -odhcp6c -kmod-ipv6 -kmod-ip6tables -odhcpd-ipv6only "
pkgs+="-luci-proto-ipv6 -luci-proto-ppp -luci-ssl -kmod-usb-ohci"
export pkgs

# luci addons
export luci="uhttpd uhttpd-mod-ubus libiwinfo-lua luci-base luci-app-firewall luci-mod-admin-full luci-theme-bootstrap"

# extroot addons
export extroot="block-mount kmod-fs-ext4 -e2fsprogs kmod-usb-storage"

# other addons
export other=""

# Get imagebuilder and unpack if not done already
download="https://downloads.openwrt.org/releases/19.07.8/targets/ath79/tiny/openwrt-imagebuilder-19.07.8-ath79-tiny.Linux-x86_64.tar.xz"
builder="$(echo "$download" | sed 's#.*/##')"
mkdir -p "$HOME/$profile" && cd "$HOME/$profile"; mkdir -p "$files/etc"; mkdir -p "$dir"
[ ! -f "$builder" ] && clear && echo "Downloading $builder" && wget -q --show-progress "$download"
[ ! -f "$source/Makefile" ] && rm -rf "$source" && echo "Unpacking $builder" && tar -xf "$builder" && mv "$(echo "$builder" | sed 's#.tar.xz##')" "$ver"
cd "$source"

# Create menu
DELAY=3
while true; do
  clear
  cat << _EOF_
Openwrt $ver imagebuilder

Please Select:

1. Create Luci Firmware for $profile
2. Create Extroot Firmware for $profile
0. Quit

_EOF_

  read -p "Enter selection [0-2] > "

  if [[ $REPLY =~ ^[0-2]$ ]]; then
    case $REPLY in
      1)
        echo "Building luci Firmware, please wait"
        extra="luci"
        make manifest PROFILE="$profile" FILES="$files" EXTRA_IMAGE_NAME="$extra" PACKAGES="$pkgs $luci $other" BIN_DIR="$fwdir" CONFIG_IPV6=n >"${fwdir}/openwrt-${ver}-${extra}-ath79-tiny-${profile}.manifest"
        make image PROFILE="$profile" FILES="$files" EXTRA_IMAGE_NAME="$extra" PACKAGES="$pkgs $luci $other" BIN_DIR="$fwdir" CONFIG_IPV6=n > /dev/null 2>&1
        break
        ;;
      2)
        echo "Building extroot firmware, please wait"
        extra="extroot"
        make manifest PROFILE="$profile" FILES="$files" EXTRA_IMAGE_NAME="$extra" PACKAGES="$pkgs $extroot $other" BIN_DIR="$fwdir" CONFIG_IPV6=n > "$fwdir/openwrt-$ver-$extra-ath79-tiny-$profile.manifest"
        make image PROFILE="$profile" FILES="$files" EXTRA_IMAGE_NAME="$extra" PACKAGES="$pkgs $extroot $other" BIN_DIR="$fwdir" CONFIG_IPV6=n > /dev/null 2>&1
        break
        ;;
      0)
        return 2>/dev/null
        exit
        ;;
    esac
  else
    echo "Invalid entry."
    sleep $DELAY
  fi
done
# Cleanup and show build summary
rm $(find $fwdir/* -not -name "*$profile*") 2>/dev/null
manifest=$(cat $(ls -d $fwdir/*.manifest | grep $extra) | awk '{print $1}')
echo "Packages included in build are:"
echo $manifest | fold -s
echo -------------------------------------------------------------------------------
echo "Firmwares with $extra packages have been created in $dir"
ls -lh $fwdir | awk '{print $5,$9}'
