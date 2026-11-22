#include <ctype.h>
#include <fcntl.h>
#include <glob.h>
#include <linux/gpio.h>
#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/sysinfo.h>
#include <sys/utsname.h>
#include <time.h>
#include <unistd.h>

#define MAX_PAGES 16
#define MAX_TOKENS 32
#define MAX_TPL 256
#define MAX_OUT 192

struct custom_tok { char name[24]; char file[128]; char cmd[256]; int div; int ttl; time_t last_ts; char cache[64]; };
static struct custom_tok ctoks[MAX_TOKENS];
static int num_ctoks = 0;
static const uint8_t font5x7[91][5] = {
{0x00,0x00,0x00,0x00,0x00},
{0x00,0x00,0x5f,0x00,0x00},
{0x00,0x07,0x00,0x07,0x00},
{0x14,0x7f,0x14,0x7f,0x14},
{0x24,0x2a,0x7f,0x2a,0x12},
{0x23,0x13,0x08,0x64,0x62},
{0x36,0x49,0x55,0x22,0x50},
{0x00,0x05,0x03,0x00,0x00},
{0x00,0x1c,0x22,0x41,0x00},
{0x00,0x41,0x22,0x1c,0x00},
{0x14,0x08,0x3e,0x08,0x14},
{0x08,0x08,0x3e,0x08,0x08},
{0x00,0x50,0x30,0x00,0x00},
{0x08,0x08,0x08,0x08,0x08},
{0x00,0x60,0x60,0x00,0x00},
{0x20,0x10,0x08,0x04,0x02},
{0x3e,0x51,0x49,0x45,0x3e},
{0x00,0x42,0x7f,0x40,0x00},
{0x42,0x61,0x51,0x49,0x46},
{0x21,0x41,0x45,0x4b,0x31},
{0x18,0x14,0x12,0x7f,0x10},
{0x27,0x45,0x45,0x45,0x39},
{0x3c,0x4a,0x49,0x49,0x30},
{0x01,0x71,0x09,0x05,0x03},
{0x36,0x49,0x49,0x49,0x36},
{0x06,0x49,0x49,0x29,0x1e},
{0x00,0x36,0x36,0x00,0x00},
{0x00,0x56,0x36,0x00,0x00},
{0x08,0x14,0x22,0x41,0x00},
{0x14,0x14,0x14,0x14,0x14},
{0x00,0x41,0x22,0x14,0x08},
{0x02,0x01,0x51,0x09,0x06},
{0x32,0x49,0x79,0x41,0x3e},
{0x7e,0x11,0x11,0x11,0x7e},
{0x7f,0x49,0x49,0x49,0x36},
{0x3e,0x41,0x41,0x41,0x22},
{0x7f,0x41,0x41,0x22,0x1c},
{0x7f,0x49,0x49,0x49,0x41},
{0x7f,0x09,0x09,0x09,0x01},
{0x3e,0x41,0x49,0x49,0x7a},
{0x7f,0x08,0x08,0x08,0x7f},
{0x00,0x41,0x7f,0x41,0x00},
{0x20,0x40,0x41,0x3f,0x01},
{0x7f,0x08,0x14,0x22,0x41},
{0x7f,0x40,0x40,0x40,0x40},
{0x7f,0x02,0x0c,0x02,0x7f},
{0x7f,0x04,0x08,0x10,0x7f},
{0x3e,0x41,0x41,0x41,0x3e},
{0x7f,0x09,0x09,0x09,0x06},
{0x3e,0x41,0x51,0x21,0x5e},
{0x7f,0x09,0x19,0x29,0x46},
{0x46,0x49,0x49,0x49,0x31},
{0x01,0x01,0x7f,0x01,0x01},
{0x3f,0x40,0x40,0x40,0x3f},
{0x1f,0x20,0x40,0x20,0x1f},
{0x3f,0x40,0x38,0x40,0x3f},
{0x63,0x14,0x08,0x14,0x63},
{0x07,0x08,0x70,0x08,0x07},
{0x61,0x51,0x49,0x45,0x43},
{0x00,0x7f,0x41,0x41,0x00},
{0x02,0x04,0x08,0x10,0x20},
{0x00,0x41,0x41,0x7f,0x00},
{0x04,0x02,0x01,0x02,0x04},
{0x40,0x40,0x40,0x40,0x40},
{0x00,0x01,0x02,0x04,0x00},
{0x20,0x54,0x54,0x54,0x78},
{0x7f,0x48,0x44,0x44,0x38},
{0x38,0x44,0x44,0x44,0x20},
{0x38,0x44,0x44,0x48,0x7f},
{0x38,0x54,0x54,0x54,0x18},
{0x08,0x7e,0x09,0x01,0x02},
{0x0c,0x52,0x52,0x52,0x3e},
{0x7f,0x08,0x04,0x04,0x78},
{0x00,0x44,0x7d,0x40,0x00},
{0x20,0x40,0x44,0x3d,0x00},
{0x7f,0x10,0x28,0x44,0x00},
{0x00,0x41,0x7f,0x40,0x00},
{0x7c,0x04,0x18,0x04,0x78},
{0x7c,0x08,0x04,0x04,0x78},
{0x38,0x44,0x44,0x44,0x38},
{0x7c,0x14,0x14,0x14,0x08},
{0x08,0x14,0x14,0x18,0x7c},
{0x7c,0x08,0x04,0x04,0x08},
{0x48,0x54,0x54,0x54,0x20},
{0x04,0x3f,0x44,0x40,0x20},
{0x3c,0x40,0x40,0x20,0x7c},
{0x1c,0x20,0x40,0x20,0x1c},
{0x3c,0x40,0x30,0x40,0x3c},
{0x44,0x28,0x10,0x28,0x44},
{0x0c,0x50,0x50,0x50,0x3c},
{0x44,0x64,0x54,0x4c,0x44}
};
static int fd0 = -1, fd1 = -1;
static uint64_t b0 = 0, b1 = 0;
static uint8_t fb[8][128];
static char pages[MAX_PAGES][8][MAX_TPL];
static char page_bmp[MAX_PAGES][128];
static char page_b64[MAX_PAGES][1600];
static int page_bmp_inv[MAX_PAGES];
static char rendered[8][MAX_OUT];
static int num_pages = 0, cfg_def_pg = 1, cfg_bl = 3, cfg_inv = 1, cfg_con = 38, cfg_ref = 5, cfg_auto = 0, cfg_ms = 400, cfg_save = 1, cfg_err = 0, err_sleep = 0;
static uint64_t prev_rx = 0, prev_tx = 0, prev_ns = 0, cur_rx_bps = 0, cur_tx_bps = 0;
static uint64_t prev_cpu_busy = 0, prev_cpu_tot = 0;

static int read_cpu_load(void) {
 FILE *f = fopen("/proc/stat", "r");
 unsigned long long u = 0, n = 0, s = 0, id = 0, io = 0, irq = 0, sirq = 0, st = 0;
 int pct = 0;
 if (!f) return 0;
 if (fscanf(f, "cpu %llu %llu %llu %llu %llu %llu %llu %llu", &u, &n, &s, &id, &io, &irq, &sirq, &st) >= 4) {
  uint64_t busy = u + n + s + irq + sirq + st;
  uint64_t tot = busy + id + io;
  if (prev_cpu_tot > 0 && tot > prev_cpu_tot) {
   pct = (int)(((busy - prev_cpu_busy) * 100ULL) / (tot - prev_cpu_tot));
  } else if (tot > 0) {
   pct = (int)((busy * 100ULL) / tot);
  }
  prev_cpu_busy = busy;
  prev_cpu_tot = tot;
 }
 fclose(f);
 if (pct < 0) pct = 0; if (pct > 100) pct = 100;
 return pct;
}
static volatile sig_atomic_t running = 1, next_pg = 0, next_bl = 0, tog_inv = 0, tog_auto = 0;

static void on_sig(int s) { if (s == SIGUSR1) next_pg = 1; else if (s == SIGUSR2) next_bl = 1; else if (s == SIGHUP) tog_inv = 1; else if (s == SIGALRM) tog_auto = 1; else running = 0; }

static void sync_io(void) {
 struct gpio_v2_line_values v0 = { .bits = b0, .mask = 0x0fULL }, v1 = { .bits = b1, .mask = 0x1ffULL };
 ioctl(fd0, GPIO_V2_LINE_SET_VALUES_IOCTL, &v0); ioctl(fd1, GPIO_V2_LINE_SET_VALUES_IOCTL, &v1);
}

static void wr(int data, uint8_t val) {
 struct timespec ts = {0, 2000};
 b0 = (data ? 4ULL : 0ULL) | 2ULL; b1 = (b1 & ~0x1feULL) | (((uint64_t)val) << 1) | 1ULL;
 sync_io(); nanosleep(&ts, NULL); b1 &= ~1ULL; sync_io(); nanosleep(&ts, NULL); b0 |= 1ULL; sync_io();
}

static void lcd_init(uint8_t c, int inv) {
 b0 = 1ULL; b1 = 0ULL; sync_io(); usleep(20000); b0 = 3ULL; sync_io(); usleep(20000);
 wr(0, 0xA2); wr(0, 0xA0); wr(0, 0xC8); wr(0, 0x40);
 wr(0, 0x2C); usleep(5000); wr(0, 0x2E); usleep(5000); wr(0, 0x2F); usleep(5000);
 wr(0, 0x24); wr(0, 0x81); wr(0, c & 0x3F); wr(0, 0xA4); wr(0, inv ? 0xA7 : 0xA6); wr(0, 0xAF);
}

static void set_bl_level(int lvl) {
 static const int pv[4] = { 0, 96, 180, 255 }; int v = pv[lvl & 3]; glob_t g;
 if (glob("/sys/bus/i2c/devices/0-002e/hwmon/hwmon*", 0, NULL, &g) == 0 && g.gl_pathc > 0) {
  char p[128]; FILE *f;
  snprintf(p, sizeof(p), "%s/pwm3_min", g.gl_pathv[0]); if ((f = fopen(p, "w"))) { fputs("0\n", f); fclose(f); }
  snprintf(p, sizeof(p), "%s/pwm3_enable", g.gl_pathv[0]); if ((f = fopen(p, "w"))) { fputs(v >= 255 ? "0\n" : "1\n", f); fclose(f); }
  snprintf(p, sizeof(p), "%s/pwm3", g.gl_pathv[0]); if ((f = fopen(p, "w"))) { fprintf(f, "%d\n", v); fclose(f); }
 } globfree(&g);
}

static void save_uci_opt(const char *opt, int val) {
 if (!cfg_save) return;
 char cmd[128]; snprintf(cmd, sizeof(cmd), "uci -q set ix4-lcd.general.%s=%d && uci -q commit ix4-lcd &", opt, val);
 if (system(cmd) < 0) {}
}

static void puts_fb(int pg, int col, const char *s) {
 while (*s && col <= 122) {
  int k = (*s >= 32 && *s <= 122) ? (*s - 32) : 0, i; s++;
  for (i = 0; i < 5; i++) fb[pg][col++] = font5x7[k][i];
  if (col < 128) fb[pg][col++] = 0;
 }
}

static void flush_fb(void) {
 int p, x; for (p = 0; p < 8; p++) { wr(0, 0xB0 | p); wr(0, 0x10); wr(0, 0x00); for (x = 0; x < 128; x++) wr(1, fb[p][x]); }
}

static void cmd_str(const char *cmd, char *out, size_t n, const char *def) {
 char wcmd[300]; const char *run = cmd;
 if (!strchr(cmd, '\'')) { snprintf(wcmd, sizeof(wcmd), "timeout 2 sh -c '%s'", cmd); run = wcmd; }
 FILE *f = popen(run, "r");
 if (f && fgets(out, n, f)) out[strcspn(out, "\r\n")] = 0;
 else snprintf(out, n, "%s", def);
 if (f) pclose(f);
}

static void file_str(const char *path, int div, char *out, size_t n) {
 FILE *f = fopen(path, "r"); if (!f) { snprintf(out, n, "N/A"); return; }
 if (div > 0) { long v = 0; if (fscanf(f, "%ld", &v) == 1) snprintf(out, n, "%ld", v / div); else snprintf(out, n, "0"); }
 else if (fgets(out, n, f)) out[strcspn(out, "\r\n")] = 0;
 else out[0] = 0;
 fclose(f);
}

static int read_i(const char *p) { FILE *f = fopen(p, "r"); int v = -1; if (f) { if (fscanf(f, "%d", &v) != 1) v = -1; fclose(f); } return v; }
static uint64_t read_u64(const char *p) { FILE *f = fopen(p, "r"); uint64_t v = 0; if (f) { if (fscanf(f, "%llu", &v) != 1) v = 0; fclose(f); } return v; }

static void update_net_rates(void) {
 struct timespec ts; clock_gettime(CLOCK_MONOTONIC, &ts);
 uint64_t now = (uint64_t)ts.tv_sec * 1000000000ULL + (uint64_t)ts.tv_nsec;
 uint64_t rx = read_u64("/sys/class/net/br-lan/statistics/rx_bytes"), tx = read_u64("/sys/class/net/br-lan/statistics/tx_bytes");
 if (prev_ns > 0 && now > prev_ns) {
  uint64_t dt_ms = (now - prev_ns) / 1000000ULL;
  if (dt_ms > 0) { cur_rx_bps = (rx >= prev_rx) ? ((rx - prev_rx) * 1000ULL / dt_ms) : 0; cur_tx_bps = (tx >= prev_tx) ? ((tx - prev_tx) * 1000ULL / dt_ms) : 0; }
 }
 prev_ns = now; prev_rx = rx; prev_tx = tx;
}

static void fmt_rate(uint64_t bps, char *out, size_t n) {
 if (bps >= 1048576ULL) snprintf(out, n, "%llu.%lluM", bps >> 20, ((bps % 1048576ULL) * 10ULL) >> 20);
 else snprintf(out, n, "%lluK", bps >> 10);
}

static void load_defaults(void) {
 num_pages = 3;
 snprintf(pages[0][0], MAX_TPL, "{hostname} {page}{auto}");
 snprintf(pages[0][2], MAX_TPL, "IP: {ip}");
 snprintf(pages[0][3], MAX_TPL, "Up: {uptime}");
 snprintf(pages[0][4], MAX_TPL, "RAM: {ram}");
 snprintf(pages[0][5], MAX_TPL, "CPU:{cpu_temp}C Fan:{fan}");
 snprintf(pages[0][7], MAX_TPL, "{date}       {time}");
 snprintf(pages[1][0], MAX_TPL, "Storage & RAID  {page}{auto}");
 snprintf(pages[1][2], MAX_TPL, "SATA Bays: {sata}");
 snprintf(pages[1][4], MAX_TPL, "RAID: {raid}");
 snprintf(pages[1][6], MAX_TPL, "Flash: {flash}");
 snprintf(pages[2][0], MAX_TPL, "Network & Load  {page}{auto}");
 snprintf(pages[2][2], MAX_TPL, "eth0:{eth0_speed} eth1:{eth1_speed}");
 snprintf(pages[2][3], MAX_TPL, "RX:{rx_rate} TX:{tx_rate}");
 snprintf(pages[2][5], MAX_TPL, "Load: {load}");
}

static void load_conf(const char *path) {
 FILE *f = fopen(path, "r"); char line[2048]; int sec = 0, cur_p = -1, cur_t = -1;
 memset(pages, 0, sizeof(pages)); memset(page_bmp, 0, sizeof(page_bmp)); memset(page_b64, 0, sizeof(page_b64)); memset(page_bmp_inv, 0, sizeof(page_bmp_inv));
 memset(ctoks, 0, sizeof(ctoks)); num_ctoks = 0; num_pages = 0; cfg_err = 0; err_sleep = 0;
 if (!f) { load_defaults(); return; }
 while (fgets(line, sizeof(line), f)) {
  if (!strchr(line, '\n')) { int ch; while ((ch = fgetc(f)) != '\n' && ch != EOF); }
  line[strcspn(line, "\r\n")] = 0;
  char *p = line; while (*p && isspace((unsigned char)*p)) p++;
  if (!*p || *p == '#') continue;
  if (strcmp(p, "[token]") == 0) { if (cur_t + 1 < MAX_TOKENS) { cur_t++; num_ctoks = cur_t + 1; sec = 1; } else sec = 0; continue; }
  if (strcmp(p, "[page]") == 0) { if (cur_p + 1 < MAX_PAGES) { cur_p++; num_pages = cur_p + 1; sec = 2; } else sec = 0; continue; }
  char *eq = strchr(p, '='); if (!eq) continue; *eq++ = 0;
  if (sec == 0) {
   if (!strcmp(p, "default_page")) cfg_def_pg = atoi(eq);
   else if (!strcmp(p, "backlight")) cfg_bl = atoi(eq) & 3;
   else if (!strcmp(p, "invert")) cfg_inv = atoi(eq) ? 1 : 0;
   else if (!strcmp(p, "contrast")) cfg_con = atoi(eq) & 63;
   else if (!strcmp(p, "refresh")) { cfg_ref = atoi(eq); if (cfg_ref < 1) cfg_ref = 1; }
   else if (!strcmp(p, "auto_scroll")) cfg_auto = atoi(eq) ? 1 : 0;
   else if (!strcmp(p, "marquee_ms")) { cfg_ms = atoi(eq); if (cfg_ms < 100) cfg_ms = 100; }
   else if (!strcmp(p, "save_buttons")) cfg_save = atoi(eq) ? 1 : 0;
   else if (!strcmp(p, "error")) {
    cfg_err = 1;
    load_defaults();
    memmove(&pages[1], &pages[0], sizeof(pages[0]) * 3);
    memset(&pages[0], 0, sizeof(pages[0]));
    num_pages = 4;
    snprintf(pages[0][0], MAX_TPL, "CONFIG ERROR!   {page}{auto}");
    snprintf(pages[0][2], MAX_TPL, "%s", eq);
    snprintf(pages[0][5], MAX_TPL, "Hold Top: Reset Cfg");
    snprintf(pages[0][7], MAX_TPL, "Hold Bot: Screen Off");
   }
  } else if (sec == 1 && cur_t >= 0) {
   if (!strcmp(p, "name")) snprintf(ctoks[cur_t].name, sizeof(ctoks[cur_t].name), "%s", eq);
   else if (!strcmp(p, "file")) snprintf(ctoks[cur_t].file, sizeof(ctoks[cur_t].file), "%s", eq);
   else if (!strcmp(p, "cmd")) snprintf(ctoks[cur_t].cmd, sizeof(ctoks[cur_t].cmd), "%s", eq);
   else if (!strcmp(p, "div")) ctoks[cur_t].div = atoi(eq);
   else if (!strcmp(p, "ttl")) ctoks[cur_t].ttl = atoi(eq);
  } else if (sec == 2 && cur_p >= 0 && !strcmp(p, "bmp")) {
   snprintf(page_bmp[cur_p], sizeof(page_bmp[cur_p]), "%s", eq);
  } else if (sec == 2 && cur_p >= 0 && !strcmp(p, "bmp_b64")) {
   snprintf(page_b64[cur_p], sizeof(page_b64[cur_p]), "%s", eq);
  } else if (sec == 2 && cur_p >= 0 && !strcmp(p, "bmp_invert")) {
   page_bmp_inv[cur_p] = atoi(eq) ? 1 : 0;
  } else if (sec == 2 && cur_p >= 0 && strncmp(p, "row", 3) == 0 && p[3] >= '0' && p[3] <= '7') {
   snprintf(pages[cur_p][p[3] - '0'], MAX_TPL, "%s", eq);
  }
 }
 fclose(f);
 if (num_pages <= 0) load_defaults();
}

static int eval_custom_tok(const char *tok, char *val, size_t n) {
 int i; struct timespec ts; clock_gettime(CLOCK_MONOTONIC, &ts);
 for (i = 0; i < num_ctoks; i++) {
  if (ctoks[i].name[0] && !strcmp(tok, ctoks[i].name)) {
   if (ctoks[i].ttl > 0 && ctoks[i].last_ts > 0 && (ts.tv_sec - ctoks[i].last_ts) < ctoks[i].ttl) {
    snprintf(val, n, "%s", ctoks[i].cache);
    return 1;
   }
   if (ctoks[i].file[0]) file_str(ctoks[i].file, ctoks[i].div, val, n);
   else if (ctoks[i].cmd[0]) cmd_str(ctoks[i].cmd, val, n, "");
   snprintf(ctoks[i].cache, sizeof(ctoks[i].cache), "%s", val);
   ctoks[i].last_ts = ts.tv_sec ? ts.tv_sec : 1;
   return 1;
  }
 }
 return 0;
}

static void expand_row(const char *tpl, char *out, size_t maxn, int pg, int auto_s) {
 size_t o = 0; const char *s = tpl;
 while (*s && o + 1 < maxn) {
  if (s[0] == '$' && s[1] == '(') {
   const char *end = strchr(s + 2, ')');
   if (end && (size_t)(end - (s + 2)) < 255) {
    char cmd[260], val[128];
    memcpy(cmd, s + 2, end - (s + 2)); cmd[end - (s + 2)] = 0;
    cmd_str(cmd, val, sizeof(val), ""); o += snprintf(out + o, maxn - o, "%s", val); s = end + 1; continue;
   }
  } else if (*s == '{') {
   const char *end = strchr(s + 1, '}');
   if (end && (size_t)(end - (s + 1)) < 24) {
    char tok[24], val[64];
    memcpy(tok, s + 1, end - (s + 1)); tok[end - (s + 1)] = 0; val[0] = 0;
    if (eval_custom_tok(tok, val, sizeof(val))) {}
    else if (!strcmp(tok, "page")) snprintf(val, sizeof(val), "%d/%d", pg + 1, num_pages);
    else if (!strcmp(tok, "auto")) snprintf(val, sizeof(val), "%c", auto_s ? '*' : ' ');
    else if (!strcmp(tok, "date")) { tzset(); time_t now = time(NULL); struct tm *tm = localtime(&now); if (tm) strftime(val, sizeof(val), "%Y-%m-%d", tm); }
    else if (!strcmp(tok, "time")) { tzset(); time_t now = time(NULL); struct tm *tm = localtime(&now); if (tm) strftime(val, sizeof(val), "%H:%M", tm); }
    else if (!strcmp(tok, "time_sec")) { tzset(); time_t now = time(NULL); struct tm *tm = localtime(&now); if (tm) strftime(val, sizeof(val), "%H:%M:%S", tm); }
    else if (!strcmp(tok, "hostname")) { if (gethostname(val, sizeof(val)) != 0) snprintf(val, sizeof(val), "ix4-300d"); val[sizeof(val)-1] = 0; }
    else if (!strcmp(tok, "kernel")) { struct utsname u; if (uname(&u) == 0) snprintf(val, sizeof(val), "%s", u.release); }
    else if (!strcmp(tok, "ip")) cmd_str("ip -4 -o addr show br-lan 2>/dev/null | awk '{print $4}' | cut -d/ -f1", val, sizeof(val), "No IP");
    else if (!strcmp(tok, "eth0_ip")) cmd_str("ip -4 -o addr show eth0 2>/dev/null | awk '{print $4}' | cut -d/ -f1", val, sizeof(val), "None");
    else if (!strcmp(tok, "eth1_ip")) cmd_str("ip -4 -o addr show eth1 2>/dev/null | awk '{print $4}' | cut -d/ -f1", val, sizeof(val), "None");
    else if (!strcmp(tok, "eth0_speed") || !strcmp(tok, "eth1_speed")) {
     char sp[64]; snprintf(sp, sizeof(sp), "/sys/class/net/%.4s/speed", tok);
     int spd = read_i(sp); if (spd > 0) snprintf(val, sizeof(val), "%dM", spd); else snprintf(val, sizeof(val), "down");
    } else if (!strcmp(tok, "rx_rate")) fmt_rate(cur_rx_bps, val, sizeof(val));
    else if (!strcmp(tok, "tx_rate")) fmt_rate(cur_tx_bps, val, sizeof(val));
    else if (!strcmp(tok, "uptime")) {
     struct sysinfo si; sysinfo(&si); long d = si.uptime / 86400, h = (si.uptime % 86400) / 3600, m = (si.uptime % 3600) / 60;
     if (d > 0) snprintf(val, sizeof(val), "%ldd %ldh %ldm", d, h, m); else snprintf(val, sizeof(val), "%ldh %ldm", h, m);
    } else if (!strcmp(tok, "ram")) { struct sysinfo si; sysinfo(&si); snprintf(val, sizeof(val), "%lu/%lu MB", (si.totalram - si.freeram) >> 20, si.totalram >> 20); }
    else if (!strcmp(tok, "soc_temp")) { int v = read_i("/sys/class/thermal/thermal_zone0/temp"); snprintf(val, sizeof(val), "%d", v > 0 ? v / 1000 : 0); }
    else if (!strcmp(tok, "cpu_temp") || !strcmp(tok, "board_temp") || !strcmp(tok, "bay_temp") || !strcmp(tok, "fan")) {
     glob_t g; int v = -1;
     if (glob("/sys/bus/i2c/devices/0-002e/hwmon/hwmon*", 0, NULL, &g) == 0 && g.gl_pathc > 0) {
      char p[128]; const char *fn = !strcmp(tok, "cpu_temp") ? "temp1_input" : (!strcmp(tok, "board_temp") ? "temp2_input" : (!strcmp(tok, "bay_temp") ? "temp3_input" : "fan1_input"));
      snprintf(p, sizeof(p), "%s/%s", g.gl_pathv[0], fn); v = read_i(p);
     } globfree(&g); if (!strcmp(tok, "fan")) snprintf(val, sizeof(val), "%4d", v > 0 ? v : 0);
     else snprintf(val, sizeof(val), "%d", v > 0 ? v / 1000 : 0);
    } else if (!strncmp(tok, "hdd", 3) && tok[3] >= '1' && tok[3] <= '4' && !strcmp(tok + 4, "_temp")) {
     glob_t g; char pat[80]; int v = -1;
     snprintf(pat, sizeof(pat), "/sys/block/sd%c/device/hwmon/hwmon*/temp1_input", 'a' + (tok[3] - '1'));
     if (glob(pat, 0, NULL, &g) == 0 && g.gl_pathc > 0) v = read_i(g.gl_pathv[0]);
     globfree(&g); if (v > 0) snprintf(val, sizeof(val), "%dC", v / 1000); else snprintf(val, sizeof(val), "--");
    } else if (!strcmp(tok, "sata")) {
     int i; char d[32];
     for (i = 0; i < 4; i++) { snprintf(d, sizeof(d), "/sys/block/sd%c", 'a' + i); val[i] = access(d, F_OK) == 0 ? ('1' + i) : '-'; }
     val[4] = 0;
    } else if (!strcmp(tok, "raid")) cmd_str("awk '/^md/{printf \"%s:%s\", $1, $4; exit}' /proc/mdstat 2>/dev/null", val, sizeof(val), "None");
    else if (!strcmp(tok, "flash")) cmd_str("df -h /overlay 2>/dev/null | awk 'NR==2{printf \"%s/%s (%s)\", $3, $2, $5}'", val, sizeof(val), "N/A");
    else if (!strcmp(tok, "mnt_used")) cmd_str("df -h /mnt 2>/dev/null | awk 'NR==2{printf \"%s/%s (%s)\", $3, $2, $5}'", val, sizeof(val), "N/A");
    else if (!strcmp(tok, "mnt_free")) cmd_str("df -h /mnt 2>/dev/null | awk 'NR==2{print $4}'", val, sizeof(val), "N/A");
    else if (!strcmp(tok, "smb_clients")) cmd_str("smbstatus -b 2>/dev/null | awk 'NR>4 && NF{c++} END{print c+0}'", val, sizeof(val), "0");
    else if (!strcmp(tok, "eth0")) cmd_str("cat /sys/class/net/eth0/operstate 2>/dev/null", val, sizeof(val), "down");
    else if (!strcmp(tok, "eth1")) cmd_str("cat /sys/class/net/eth1/operstate 2>/dev/null", val, sizeof(val), "down");
    else if (!strcmp(tok, "load")) cmd_str("awk '{print $1\" \"$2\" \"$3}' /proc/loadavg 2>/dev/null", val, sizeof(val), "0.00");
    else if (!strcmp(tok, "cpu_load")) snprintf(val, sizeof(val), "%3d", read_cpu_load());
    o += snprintf(out + o, maxn - o, "%s", val); s = end + 1; continue;
   }
  }
  out[o++] = *s++;
 }
 out[o] = 0;
}

static int refresh_page_data(int pg, int auto_s) {
 int r, need_marquee = 0; update_net_rates();
 for (r = 0; r < 8; r++) { expand_row(pages[pg][r], rendered[r], MAX_OUT, pg, auto_s); if ((int)strlen(rendered[r]) > 21) need_marquee = 1; }
 return need_marquee;
}

static int b64_val(char ch) { if (ch >= 'A' && ch <= 'Z') return ch - 'A'; if (ch >= 'a' && ch <= 'z') return ch - 'a' + 26; if (ch >= '0' && ch <= '9') return ch - '0' + 52; return (ch == '+') ? 62 : (ch == '/' ? 63 : -1); }

static void render_bmp_buf(const uint8_t *buf, size_t len, int inv) {
 if (len < 1086 || buf[0] != 'B' || buf[1] != 'M') return;
 uint32_t off = buf[10] | (buf[11] << 8) | (buf[12] << 16) | (buf[13] << 24);
 int32_t w = (int32_t)(buf[18] | (buf[19] << 8) | (buf[20] << 16) | (buf[21] << 24));
 int32_t h = (int32_t)(buf[22] | (buf[23] << 8) | (buf[24] << 16) | (buf[25] << 24));
 uint16_t bpp = buf[28] | (buf[29] << 8); int top_down = (h < 0); if (h < 0) h = -h;
 if (w == 128 && h == 64 && bpp == 1 && off >= 62 && off + 1024 <= len) {
  const uint8_t *raw = buf + off; int pal0_dark = ((buf[54] + buf[55] + buf[56]) < (buf[58] + buf[59] + buf[60])); int y, x;
  for (y = 0; y < 64; y++) { int sy = top_down ? y : (63 - y); for (x = 0; x < 128; x++) {
   int bit = (raw[sy * 16 + (x >> 3)] >> (7 - (x & 7))) & 1; int ink = pal0_dark ? !bit : bit; if (inv) ink = !ink;
   if (ink) fb[y >> 3][x] |= (1U << (y & 7));
  } }
 }
}

static void draw_bmp_bg(int pg) {
 if (pg < 0 || pg >= num_pages) return;
 if (page_b64[pg][0]) {
  uint8_t dec[1200]; size_t out_len = 0; const char *s = page_b64[pg];
  while (*s && out_len + 3 <= sizeof(dec)) {
   int v0 = b64_val(s[0]), v1 = s[1] ? b64_val(s[1]) : -1; if (v0 < 0 || v1 < 0) break;
   dec[out_len++] = (uint8_t)((v0 << 2) | (v1 >> 4));
   if (s[2] && s[2] != '=') { int v2 = b64_val(s[2]); if (v2 < 0) break; dec[out_len++] = (uint8_t)(((v1 & 0xf) << 4) | (v2 >> 2));
    if (s[3] && s[3] != '=') { int v3 = b64_val(s[3]); if (v3 < 0) break; dec[out_len++] = (uint8_t)(((v2 & 0x3) << 6) | v3); } }
   if (!s[1] || !s[2] || !s[3]) break; s += 4;
  } render_bmp_buf(dec, out_len, page_bmp_inv[pg]); return;
 }
 if (!page_bmp[pg][0]) return;
 char bpath[160];
 if (page_bmp[pg][0] == '/') snprintf(bpath, sizeof(bpath), "%s", page_bmp[pg]);
 else snprintf(bpath, sizeof(bpath), "/etc/ix4-lcd/%s", page_bmp[pg]);
 FILE *f = fopen(bpath, "rb"); if (!f) return;
 uint8_t buf[1200]; size_t n = fread(buf, 1, sizeof(buf), f); fclose(f);
 render_bmp_buf(buf, n, page_bmp_inv[pg]);
}

static void draw_frame(int cur_pg, int tick) {
 int r; memset(fb, 0, sizeof(fb)); draw_bmp_bg(cur_pg);
 for (r = 0; r < 8; r++) {
  int len = (int)strlen(rendered[r]); if (len == 0) continue;
  if (len <= 21) puts_fb(r, 0, rendered[r]);
  else { char wrap[MAX_OUT * 2 + 8]; int span = len + 3, off = (tick <= 3) ? 0 : ((tick - 3) % span);
   snprintf(wrap, sizeof(wrap), "%s   %s", rendered[r], rendered[r]); puts_fb(r, 0, wrap + off); }
 } flush_fb();
}

int main(int argc, char **argv) {
 int c0, c1, opt, i, pg = 0, tick = 0, need_mq = 0; const char *cfg_path = "/var/run/ix4-lcd.conf";
 struct gpio_v2_line_request r0, r1; struct sigaction sa = { .sa_handler = on_sig };
 sigaction(SIGTERM, &sa, NULL); sigaction(SIGINT, &sa, NULL); sigaction(SIGUSR1, &sa, NULL); sigaction(SIGUSR2, &sa, NULL); sigaction(SIGHUP, &sa, NULL); sigaction(SIGALRM, &sa, NULL);
 while ((opt = getopt(argc, argv, "c:v:")) != -1) { if (opt == 'c') cfg_path = optarg; else if (opt == 'v') cfg_con = (uint8_t)atoi(optarg); }
 load_conf(cfg_path);
 if (!cfg_err && cfg_def_pg >= 1 && cfg_def_pg <= num_pages) pg = cfg_def_pg - 1; else pg = 0;
 c0 = open("/dev/gpiochip0", O_RDONLY); c1 = open("/dev/gpiochip1", O_RDONLY); if (c0 < 0 || c1 < 0) return 1;
 memset(&r0, 0, sizeof(r0)); r0.num_lines = 4; for (i = 0; i < 4; i++) r0.offsets[i] = 28 + i;
 r0.config.flags = GPIO_V2_LINE_FLAG_OUTPUT; snprintf(r0.consumer, sizeof(r0.consumer), "ix4-lcd-c");
 memset(&r1, 0, sizeof(r1)); r1.num_lines = 9; for (i = 0; i < 9; i++) r1.offsets[i] = i;
 r1.config.flags = GPIO_V2_LINE_FLAG_OUTPUT; snprintf(r1.consumer, sizeof(r1.consumer), "ix4-lcd-d");
 if (ioctl(c0, GPIO_V2_GET_LINE_IOCTL, &r0) < 0 || ioctl(c1, GPIO_V2_GET_LINE_IOCTL, &r1) < 0) return 1;
 fd0 = r0.fd; fd1 = r1.fd; close(c0); close(c1);
 set_bl_level(cfg_bl); lcd_init((uint8_t)cfg_con, cfg_inv);
 need_mq = refresh_page_data(pg, cfg_auto); draw_frame(pg, tick);
 int elapsed_ms = 0;
 while (running) {
  int step_ms = need_mq ? cfg_ms : (cfg_ref * 1000);
  struct timespec req = { step_ms / 1000, (step_ms % 1000) * 1000000L }, rem = {0, 0};
  int interrupted = (nanosleep(&req, &rem) < 0); if (!running) break;
  int dirty_data = 0;
  if (next_pg) { next_pg = 0; if (cfg_auto) { cfg_auto = 0; save_uci_opt("auto_scroll", 0); } pg = (pg + 1) % num_pages; tick = 0; elapsed_ms = 0; dirty_data = 1; }
  if (tog_auto) { tog_auto = 0; if (cfg_err) { if (system("/etc/init.d/ix4-lcd reset_default &") < 0) {} } else { cfg_auto = !cfg_auto; save_uci_opt("auto_scroll", cfg_auto); if (cfg_auto) pg = (pg + 1) % num_pages; tick = 0; elapsed_ms = 0; dirty_data = 1; } }
  if (next_bl) { next_bl = 0; if (!err_sleep) { cfg_bl = (cfg_bl + 1) & 3; set_bl_level(cfg_bl); save_uci_opt("backlight", cfg_bl); } }
  if (tog_inv) { tog_inv = 0; if (cfg_err) { err_sleep = !err_sleep; if (err_sleep) { memset(fb, 0, sizeof(fb)); flush_fb(); wr(0, 0xAE); set_bl_level(0); } else { wr(0, 0xAF); set_bl_level(cfg_bl); dirty_data = 1; } } else { cfg_inv = !cfg_inv; wr(0, cfg_inv ? 0xA7 : 0xA6); save_uci_opt("invert", cfg_inv); } }
  if (!interrupted) { elapsed_ms += step_ms; if (need_mq) tick++; if (elapsed_ms >= cfg_ref * 1000) { elapsed_ms = 0; if (cfg_auto) { pg = (pg + 1) % num_pages; tick = 0; } dirty_data = 1; } }
  if (dirty_data) need_mq = refresh_page_data(pg, cfg_auto);
  if (!err_sleep && (dirty_data || need_mq)) draw_frame(pg, tick);
 }
 memset(fb, 0, sizeof(fb)); flush_fb(); wr(0, 0xAE); set_bl_level(0); return 0;
}
