# luci-app-volume-manager

GParted-style disk partitioning, mount management, S.M.A.R.T. health telemetry, and modular NAS storage package manager for OpenWrt (`Services -> Volume Manager`).

---

## Screenshots

> *Place screenshots in `docs/` (or link GitHub release/issue assets) and update the paths below:*
>
> - **Disk & Partition Map:** `![Disk Tab](docs/volume-manager-disk.png)`
> - **Mounts (`fstab`):** `![Mounts Tab](docs/volume-manager-mounts.png)`
> - **Drive Info & S.M.A.R.T.:** `![Info Tab](docs/volume-manager-info.png)`
> - **Config & Modular Packages:** `![Config Tab](docs/volume-manager-config.png)`

---

## Overview & Features

`luci-app-volume-manager` provides an interactive LuCI frontend (`volume-manager.js`) backed by a root-privileged `rpcd` shell service (`/usr/libexec/rpcd/volmgr`) with live background job progress tracking (`/tmp/volmgr-job.json` & `/tmp/volmgr.log`).

### 1. Disk Tab (GParted-Style Partitioning)
- **Visual Partition Bar:** Color-coded layout bar showing existing partitions, filesystem types, labels, mount status, and unallocated gaps.
- **Partition Table Management:** Initialize fresh **GPT** or **MBR (DOS)** partition tables on unformatted drives, or infer and edit existing layouts automatically.
- **Create, Format, Resize, Move & Delete:**
  - Interactive draggable GParted-style resize/move bar with coupled numeric inputs and unit selectors (`MiB` / `GiB` / `TiB`) for **Free Space Preceding**, **New Size**, and **Free Space Following**.
  - Safe shrink ordering (checks and shrinks the filesystem before shrinking the partition boundary via `sfdisk`).
  - Data relocation (`sfdisk --move-data`) with live sector-progress and ETA reporting via `/proc/diskstats`.
  - Filesystem formatting (`ext4`, `ext2`, `btrfs`, `f2fs`, `ntfs`, `exfat`, `vfat`, `swap`) gated automatically on whether the required userspace `mkfs` tools are installed.
  - Edit partition labels, GPT/MBR partition type roles, and GPT flags (`LegacyBIOSBootable`, `hidden`, `noauto`).
- **One-Click Mount / Unmount:** Mounts partitions under `/mnt/<label-or-dev>` or unmounts active volumes directly from the action toolbar.

### 2. Mounts Tab (`uci fstab`)
- View all detected block partitions alongside active `/proc/mounts` status and `/etc/config/fstab` entries.
- Add, edit, enable/disable, or remove persistent UUID-based `fstab` mount points and reload `block mount`.

### 3. Info Tab (Hardware & S.M.A.R.T. Telemetry)
- Displays drive model, serial number, firmware version, capacity, rotational vs. SSD media type, negotiated SATA link speed (`/sys/class/ata_link`) or USB bus speed, logical/physical sector sizes, power-on hours, and SSD wear remaining.
- Surfaces a one-click **Install smartmontools** button whenever `smartmontools` is not yet installed, and renders the full ATA S.M.A.R.T. attribute table (`ID`, `Attribute`, `Value`, `Worst`, `Thresh`, `Raw Value`).

### 4. Volumes Tab (RAID / LVM2 / LUKS2 / iSCSI)
- **Software RAID (`mdadm`):** Assemble existing arrays or create new `RAID 0/1/5/6/10` arrays with live `/proc/mdstat` and `mdadm --detail` telemetry.
- **LUKS2 Encryption (`cryptsetup`):** Initialize LUKS2 encrypted partitions, unlock into `/dev/mapper/`, or lock active encrypted volumes.
- **LVM2 (`lvm2`):** Create Physical Volumes, Volume Groups (`vgcreate`), and Logical Volumes (`lvcreate`) with live `pvs`/`vgs`/`lvs` status.
- **iSCSI Target & Initiator (`tgt` / `open-iscsi`):** Discover and connect to remote iSCSI portals or export local block devices as iSCSI target LUNs.

### 5. Backup Tab (Rsync)
- Configure persistent `uci` backup jobs (`/etc/config/volmgr_backup`) in **Mirror (`--delete`)**, **Additive (`-aH`)**, or **Dated Snapshot** modes.
- Run jobs manually with a live progress modal or schedule hourly/daily/weekly `cron` runs with `/tmp/volmgr-backup.log` output.

### 6. Config Tab (Modular Package & Kernel Driver Manager)
- Organizes storage dependencies into four cards: **Filesystems**, **Storage Buses & Hardware Drivers**, **Health & Diagnostics**, and **Advanced Storage & Replication**.
- Color-coded status badges detect both installed `apk` packages and active/available kernel modules (`/proc/filesystems` and `/lib/modules/$(uname -r)/*.ko`):
  - **Green:** Fully installed (kernel driver + userspace tools).
  - **Teal:** Partial / kernel driver active (click to install missing userspace tools).
  - **Gray:** Not installed (click to install via `apk add` with live progress modal and automatic `modprobe`).

---

## Safety & Architecture

- **Root Filesystem Protection:** `is_safe_dev()` in `/usr/libexec/rpcd/volmgr` blocks all operations on `mtd*`, `ubi*`, `loop*`, `ram*`, `zram*`, `mmcblk0*`, and any device mounted on `/`, `/overlay`, or `/rom`.
- **ubus Interface (`volmgr`):**
  - **Read methods:** `list`, `info`, `smart`, `packages`, `job_status`
  - **Write methods:** `create_part`, `format_part`, `resize_part`, `move_part`, `delete_part`, `set_part_meta`, `mount_action`, `pkg_action`
- **Dependencies:** `luci-base`, `block-mount`, `sfdisk`, `fdisk`, `lsblk`, `blkid`, `partx-utils`, `wipefs` (optional filesystem, RAID, LVM, LUKS, iSCSI, and S.M.A.R.T. packages install on demand via `apk`).
