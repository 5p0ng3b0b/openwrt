## OpenWrt for Lenovo Iomega ix4-300d

Custom OpenWrt build (Linux 6.18 / U-Boot 2026.10) for the **Lenovo Iomega ix4-300d** NAS (Marvell Armada XP MV78230), pre-bundled with LuCI, full front-panel LCD + button support (`ix4-lcd` & `luci-app-ix4-lcd`), and GParted-style disk/volume management (`luci-app-volume-manager`).

### Release Files

| File | Purpose |
| :--- | :--- |
| `openwrt-ix4-300d-squashfs-factory.img` | Full NAND image (U-Boot + kernel + rootfs UBI) for fresh installs. |
| `openwrt-ix4-300d-squashfs-sysupgrade.bin` | Standard upgrade image for systems already running OpenWrt (`sysupgrade`, includes `attendedsysupgrade`). |
| `openwrt-ix4-300d-squashfs-sysupgrade-full.bin` | All-in-one NAS upgrade image with all filesystems (`ext4`, `btrfs`, `f2fs`, `ntfs3`, `exfat`, `vfat`, `xfs`), tools (`e2fsprogs`, `resize2fs`, `tune2fs`, `btrfs-progs`, `smartmontools`, `mdadm` + RAID 0/1/5/6/10, `lvm2`, `cryptsetup`, `open-iscsi`, `tgt`, `rsync`), `ksmbd` + `wsdd2`, `tailscale`, `autossh`, `hd-idle`, `irqbalance`, `filemanager`, `acl`, `ttyd`, `wget-ssl`, `usbutils`, and `pciutils` preinstalled. |
| `openwrt-ix4-300d-initramfs-kernel.bin` | RAM-bootable OpenWrt image for TFTP/USB recovery or initial flashing. |
| `kernel-6.18.zip` | Standalone Linux kernel bundle (`kernel.bin` with appended DTB, raw `zImage`, `armada-xp-lenovo-ix4-300d.dtb`, `armada-xp-lenovo-ix4-300d.dts`, `kernel-ix4-300d.config`, and `README-KERNEL.txt`). |
| `uboot26.10.zip` | All U-Boot 2026.10 artifacts (`u-boot-with-spl.kwb`, `u-boot.bin`, `u-boot-armada-xp-lenovo-ix4-300d.dts`, `u-boot-armada-xp-lenovo-ix4-300d.dtb`, `u-boot-ix4-300d.config`, and `README-UBOOT.txt`). |
| `ix4-lcd.apk` | Front-panel ST7565R LCD daemon, marquee scroller, and button handler (`BTN_0` / `BTN_1`). |
| `luci-app-ix4-lcd.apk` | LuCI web interface for configuring LCD rows, scroll speeds, logo upload, and safe shutdown. |
| `luci-app-volume-manager.apk` | LuCI web interface for GParted-style partitioning, mounts, S.M.A.R.T. telemetry, Software RAID, LUKS2 encryption, LVM2, iSCSI, scheduled Rsync backups, and modular storage tools. |
| `SHA256SUMS` | SHA-256 checksums for verifying all downloaded files (`sha256sum -c SHA256SUMS`). |

---

### Installing or Upgrading U-Boot (From Stock `Marvell>>` U-Boot)

> **Warning:** Always test in RAM first (`u-boot.bin`) before writing `u-boot-with-spl.kwb` to NAND, and keep a `115200 8N1` serial console connected on UART header `CN9`.

Stock Lenovo/Iomega U-Boot (`U-Boot 2009.08`) defaults to:
* `ipaddr=192.168.1.2` (NAS IP)
* `serverip=192.168.1.100` (TFTP server IP)
* `loadaddr=0x02000000`

*(If your TFTP server uses a different subnet, update `ipaddr` and `serverip` with `setenv` before running `tftpboot`.)*

#### 1. Record Stock MAC Addresses (Recommended)
At the stock `Marvell>>` prompt, note your factory MAC addresses before upgrading:
```text
printenv ethaddr eth1addr
```

#### 2. Test New U-Boot in RAM First (Safe — Does Not Touch NAND)
Place `u-boot.bin` on your TFTP server (`192.168.1.100`) and boot it in RAM from the stock `Marvell>>` prompt:
```text
tftpboot 0x00800000 u-boot.bin
go 0x00800000
```
Verify you reach the `ix4-300d>` prompt (`U-Boot 2026.10`) with `NAND: 1024 MiB`.

#### 3. Flash New U-Boot Permanently to NAND (`0x0`)
Once RAM testing succeeds, place `u-boot-with-spl.kwb` (which includes the 2048-byte Marvell BootROM NAND header + SPL + U-Boot) on your TFTP server (`192.168.1.100`), reboot back to `Marvell>>`, and flash it to `0x0`: 
```text
tftpboot 0x02000000 u-boot-with-spl.kwb
nand erase 0x0 0xe0000
nand write 0x02000000 0x0 $filesize
reset
```

#### 4. Future Upgrades & Recovery (Once Running U-Boot 2026.10 `ix4-300d>`)
* **Test in RAM:** `dhcp && rubt`
* **Flash to NAND:** `dhcp && bubt u-boot-with-spl.kwb nand && reset`
* **Recovery Boot:** Hold the rear **Reset** pinhole during power-on to boot via USB or TFTP (`run boot_recovery`).
