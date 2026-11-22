# ix4-lcd & luci-app-ix4-lcd

Userspace LCD daemon (`ix4-lcd`) and LuCI web interface (`luci-app-ix4-lcd`) for the **Lenovo Iomega ix4-300d** 128×64 ST7565R front-panel LCD (`8 rows × 21 characters`, `5×7` font).

---

## Hardware & Service Control

- **Display Controller:** Sitronix ST7565R (128×64 monochrome) driven via Linux GPIO character device v2 (`/dev/gpiochip0` lines `28..31`, `/dev/gpiochip1` lines `0..8`) and PWM backlight (`/sys/class/leds/ix4-300d:lcd:backlight`).
- **Front-Panel Buttons:**
  - **Select (`BTN_0`):** Short press advances to the next page (`SIGUSR1`); long press toggles **Cycle Pages** (`SIGUSR2`).
  - **Scroll (`BTN_1`):** Short press cycles backlight brightness `0 -> 1 -> 2 -> 3 -> 0` (`SIGALRM`); long press toggles display polarity (`SIGHUP`).
- **Service Commands:**
  ```sh
  /etc/init.d/ix4-lcd restart         # Reload UCI config and restart daemon
  /etc/init.d/ix4-lcd reset_default   # Restore factory /etc/config/ix4-lcd
  ```

---

## UCI Configuration (`/etc/config/ix4-lcd`)

### 1. `config general 'general'`

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enabled` | boolean | `1` | Enable (`1`) or disable (`0`) the `ix4-lcd` daemon. |
| `default_page` | integer | `0` | Startup page index (`1..N` in LuCI; `0` uses page 1). |
| `backlight` | integer | `3` | Backlight brightness level (`0` = Off, `1` = Low, `2` = Medium, `3` = High). |
| `invert` | boolean | `1` | Display polarity (`1` = Positive dark-on-bright, `0` = Negative bright-on-dark). |
| `contrast` | integer | `38` | ST7565R electronic volume contrast (`0..63`, default `38`). |
| `refresh` | integer | `5` | Sensor polling interval (seconds) and page advance interval when `auto_scroll='1'`. |
| `auto_scroll` | boolean | `0` | Automatically cycle through visible pages every `refresh` seconds (`1` = on, `0` = off). |
| `marquee_ms` | integer | `400` | Delay in milliseconds between marquee scroll steps (`>= 100` ms). |
| `pixel_scroll` | integer | `6` | Horizontal pixel step per tick (`1` = Ultra Smooth, `2` = Smooth, `4` = Medium, `6` = Fast / 1 char). |
| `save_buttons` | boolean | `1` | Persist front-panel button changes (backlight, polarity, cycle mode) back to UCI (`1` = yes). |

### 2. `config page` (1 to 16 pages)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `bmp` | string | *(none)* | Filename in `/etc/ix4-lcd/` (or full path) of a 128×64 1-bit monochrome `.bmp` background. |
| `bmp_invert` | boolean | `0` | Invert background bitmap pixels (`1` = invert). |
| `hide` | boolean | `0` | Hide page from rotation (`1` = hidden). |
| `row0` .. `row7` | string | *(empty)* | Text template for row `0` (top) through row `7` (bottom). |
| `row0_scroll` .. `row7_scroll` | string | `normal` | Per-row marquee style: `normal`, `none`, `once`, `pingpong`, `reverse`, or `reverse_once`. |

#### Marquee Scroll Styles
- **`normal`:** Continuous circular wrap with a 3-space gap when row width exceeds 128 px (21 chars).
- **`none`:** Static text clipped cleanly at 128 px (no scrolling).
- **`once`:** Pauses at start, scrolls through once, then holds at start.
- **`pingpong`:** Scrolls forward to the end, pauses, scrolls back to the start, and repeats.
- **`reverse`:** Continuous circular wrap in reverse direction.
- **`reverse_once`:** Scrolls once in reverse, then holds at start.
- **Static Prefix Pinning:** Any scrolling row containing `": "` (for example `RAID: {raid}`) automatically pins the `Label: ` prefix on the left while scrolling only the value portion.

### 3. `config token` (Custom Dynamic Tokens)

| Option | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Token identifier used as `{name}` inside any `row0`..`row7` template. |
| `file` | string | Optional sysfs/proc file path to read (used if set; otherwise `cmd` is executed). |
| `div` | integer | Optional integer divisor applied when reading numeric `file` values (e.g. `1000` for millidegrees). |
| `cmd` | string | Shell command executed via `sh -c` (with 2-second timeout) when `file` is empty. |
| `ttl` | integer | Cache lifetime in seconds (`0` = refresh every `refresh` interval). |

---

## Common UCI CLI Examples

```sh
# Inspect all ix4-lcd settings
uci show ix4-lcd

# Set smooth 2px marquee scrolling at 150ms per step
uci set ix4-lcd.general.pixel_scroll='2'
uci set ix4-lcd.general.marquee_ms='150'

# Set a row to ping-pong scroll
uci set ix4-lcd.@page[0].row1_scroll='pingpong'

# Commit changes and reload the LCD service
uci commit ix4-lcd
/etc/init.d/ix4-lcd reload
```

---

## Built-in Template Tokens

Rows also support inline shell commands via `$(command)` as well as the following `{token}` placeholders:

| Token | Output Example | Source / Meaning |
| :--- | :--- | :--- |
| `{page}` | `2/4` | Current page number and total visible pages |
| `{auto}` | `*` or ` ` | `*` when `auto_scroll` (Cycle Pages) is active, space otherwise |
| `{date}` | `2026-11-22` | Local date (`YYYY-MM-DD`) |
| `{time}` | `12:03` | Local time (`HH:MM`) |
| `{time_sec}` | `12:03:45` | Local time with seconds (`HH:MM:SS`) |
| `{hostname}` | `OpenWrt` | System hostname (`gethostname()`) |
| `{kernel}` | `6.18.10` | Running Linux kernel release (`uname -r`) |
| `{uptime}` | `1d 4h 12m` | System uptime (`sysinfo()`) |
| `{load}` | `0.12 0.08 0.05` | 1-, 5-, and 15-minute load averages (`/proc/loadavg`) |
| `{cpu_load}` | ` 12` | Instantaneous CPU busy percentage (`0..100`, 3 chars wide, `/proc/stat`) |
| `{ram}` | `48/512 MB` | Used / total RAM in MiB (`sysinfo()`) |
| `{soc_temp}` | `45` | Armada XP SoC thermal zone temperature in °C |
| `{cpu_temp}` | `43` | ADT7473 `temp1_input` (CPU temperature in °C) |
| `{board_temp}` | `33` | ADT7473 `temp2_input` (Board ambient temperature in °C) |
| `{bay_temp}` | `31` | ADT7473 `temp3_input` (Drive bay temperature in °C) |
| `{fan}` | ` 827` | ADT7473 `fan1_input` tachometer speed in RPM (4 chars wide) |
| `{ip}` | `192.168.5.12` | Primary IPv4 address on `br-lan` (`No IP` if unassigned) |
| `{eth0}` / `{eth1}` | `up` / `down` | Interface operational state (`/sys/class/net/ethX/operstate`) |
| `{eth0_ip}` / `{eth1_ip}` | `192.168.5.12` | IPv4 address assigned directly to `eth0` or `eth1` (`None` if unassigned) |
| `{eth0_speed}` / `{eth1_speed}` | `1000M` / `down` | Link speed in Mbps (`/sys/class/net/ethX/speed`) |
| `{rx_rate}` / `{tx_rate}` | `124K` | Aggregate `eth0`+`eth1` receive / transmit throughput (`B`, `K`, `M`) |
| `{sata}` | `12-4` | Present SATA drives across bays 1..4 (`/dev/sda`..`/dev/sdd`) |
| `{raid}` | `md0:active` | First Linux MD RAID array status from `/proc/mdstat` (`None` if inactive) |
| `{flash}` | `12.4M/980M (1%)` | Overlay UBIFS used / total space and percentage (`df -h /overlay`) |
| `{mnt_used}` | `1.2T/3.6T (33%)` | Storage volume used / total space and percentage (`df -h /mnt`) |
| `{mnt_free}` | `2.4T` | Storage volume free space (`df -h /mnt`) |
| `{hdd1_temp}` .. `{hdd4_temp}` | `34C` / `--` | SATA drive temperatures for `/dev/sda`..`/dev/sdd` (`drivetemp` hwmon) |
| `{smb_clients}` | `1` | Active Samba client session count (`smbstatus -b`) |
