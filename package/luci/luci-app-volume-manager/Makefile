include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-volume-manager
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

LUCI_TITLE:=LuCI Support for Volume & Disk Manager
LUCI_DESCRIPTION:=GParted-style disk partitioning, mounts, S.M.A.R.T. telemetry, and volume manager for OpenWrt.
LUCI_DEPENDS:=+luci-base +block-mount +sfdisk +fdisk +lsblk +blkid +partx-utils +wipefs
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
