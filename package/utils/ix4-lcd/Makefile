include $(TOPDIR)/rules.mk

PKG_NAME:=ix4-lcd
PKG_VERSION:=1.3
PKG_RELEASE:=1

PKG_LICENSE:=GPL-2.0-only
PKG_MAINTAINER:=Bob Sponge <myandroidiptvbox@gmail.com>

include $(INCLUDE_DIR)/package.mk

define Package/ix4-lcd
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=Lenovo Iomega ix4-300d 128x64 LCD status daemon
  DEPENDS:=@TARGET_mvebu_cortexa9
endef

define Package/ix4-lcd/description
  Configurable status daemon and front-panel button handler for the Lenovo
  Iomega ix4-300d 128x64 ST7565 LCD. Supports dynamic UCI page/row templates,
  1-bit 128x64 BMP graphics (file or base64), custom/NAS tokens, and marquee.
endef

define Package/ix4-lcd/conffiles
/etc/config/ix4-lcd
/etc/ix4-lcd/logo.bmp
endef

define Build/Compile
	$(TARGET_CC) $(TARGET_CFLAGS) -Wall -O2 -o $(PKG_BUILD_DIR)/ix4-lcd $(PKG_BUILD_DIR)/ix4-lcd.c
endef

define Package/ix4-lcd/install
	$(INSTALL_DIR) $(1)/usr/sbin $(1)/etc/init.d $(1)/etc/rc.button $(1)/etc/config $(1)/etc/ix4-lcd
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/ix4-lcd $(1)/usr/sbin/ix4-lcd
	$(INSTALL_BIN) ./files/ix4-lcd.init $(1)/etc/init.d/ix4-lcd
	$(INSTALL_BIN) ./files/BTN_0.button $(1)/etc/rc.button/BTN_0
	$(INSTALL_BIN) ./files/BTN_1.button $(1)/etc/rc.button/BTN_1
	$(INSTALL_CONF) ./files/ix4-lcd.config $(1)/etc/config/ix4-lcd
	$(INSTALL_DATA) ./files/bitmaps/logo.bmp $(1)/etc/ix4-lcd/logo.bmp
endef

$(eval $(call BuildPackage,ix4-lcd))
