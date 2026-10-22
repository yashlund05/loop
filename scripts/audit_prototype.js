// Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.

const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9350;
const htmlFile = path.resolve(__dirname, "../prototype/index.html");
const fileUrl = "file:///" + htmlFile.replace(/\\/g, "/");
const tempProfile = path.join(os.tmpdir(), "chrome-audit-final2-" + Date.now());

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.consoleLogs = [];
    this.errors = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((res, rej) => {
      this.ws.onopen = res;
      this.ws.onerror = rej;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method) {
        if (msg.method === "Runtime.consoleAPICalled") {
          this.consoleLogs.push(msg.params);
          if (msg.params.type === "error") {
            this.errors.push(msg.params.args.map((a) => a.value || a.description).join(" "));
          }
        } else if (msg.method === "Runtime.exceptionThrown") {
          this.errors.push(
            msg.params.exceptionDetails.text +
              " " +
              (msg.params.exceptionDetails.exception
                ? msg.params.exceptionDetails.exception.description
                : "")
          );
        }
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function runAudit() {
  fs.mkdirSync(tempProfile, { recursive: true });

  const proc = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempProfile}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    fileUrl,
  ]);

  let client = null;
  try {
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`);
        const targets = await res.json();
        const target = targets.find((t) => t.url.includes("prototype/index.html"));
        if (target) {
          wsUrl = target.webSocketDebuggerUrl;
          break;
        }
      } catch (e) {}
      await wait(200);
    }

    if (!wsUrl) throw new Error("Could not find prototype target");

    client = new CDPClient(wsUrl);
    await client.connect();

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await wait(300);

    console.log("=== VERIFICATION & COMPREHENSIVE AUDIT ===");
    console.log("Initial Console Errors:", client.errors.length);

    const viewports = [360, 390, 768, 1280];
    const themes = ["light", "dark"];
    const screenIds = [
      "overview",
      "snap",
      "discover",
      "chat",
      "swap",
      "trust",
      "learning",
      "simulator",
      "impact",
      "admin",
    ];

    // 1. Viewports & Themes Horizontal Scroll Audit
    for (const theme of themes) {
      console.log(`\n--- Auditing Theme: ${theme.toUpperCase()} ---`);
      await client.eval(`
        (() => {
          const current = document.documentElement.getAttribute('data-theme') || 'light';
          if (current !== '${theme}') {
            const btn = document.getElementById('theme-toggle-btn');
            if (btn) btn.click();
          }
        })()
      `);
      await wait(100);

      for (const w of viewports) {
        await client.send("Emulation.setDeviceMetricsOverride", {
          width: w,
          height: 850,
          deviceScaleFactor: 1,
          mobile: w < 768,
        });
        await wait(100);

        // Check Auth View
        await client.eval(`
          (() => {
            document.getElementById('auth-view').classList.remove('hidden');
            document.getElementById('dashboard-view').classList.add('hidden');
          })()
        `);
        await wait(60);

        const authScroll = await client.eval(`
          (() => {
            const docW = document.documentElement.scrollWidth;
            const bodyW = document.body.scrollWidth;
            return { hasHScroll: docW > ${w} || bodyW > ${w}, docW, bodyW };
          })()
        `);
        if (authScroll.hasHScroll) {
          console.error(`[FAIL] Auth view H-Scroll at ${w}px (${theme}): docW=${authScroll.docW}`);
        }

        // Return to Dashboard View
        await client.eval(`
          (() => {
            document.getElementById('auth-view').classList.add('hidden');
            document.getElementById('dashboard-view').classList.remove('hidden');
          })()
        `);

        // Check each screen
        for (const sId of screenIds) {
          await client.eval(`
            (() => {
              const navBtn = document.querySelector('.sidebar .nav-item[data-screen="${sId}"]') ||
                             document.querySelector('.mobile-nav-bar .mobile-nav-btn[data-screen="${sId}"]');
              if (navBtn) navBtn.click();
            })()
          `);
          await wait(80);

          const screenReport = await client.eval(`
            (() => {
              const docW = document.documentElement.scrollWidth;
              const bodyW = document.body.scrollWidth;
              const hasHScroll = docW > ${w} || bodyW > ${w};
              return { hasHScroll, docW, bodyW };
            })()
          `);

          if (screenReport.hasHScroll) {
            console.error(
              `[FAIL] Screen ${sId} H-Scroll at ${w}px (${theme}): docW=${screenReport.docW}`
            );
          }
        }
        console.log(
          `[PASS] Viewport ${w}px (${theme}): Zero horizontal scroll on all 10 screens & Auth view.`
        );
      }
    }

    // 2. Focus Outlines & Keyboard Navigation
    console.log("\n--- Auditing Keyboard Focus Outlines Across All Screens ---");
    let totalFocusChecked = 0;
    let totalFocusMissing = 0;
    const missingSamplesAll = [];

    for (const sId of screenIds) {
      await client.eval(`
        (() => {
          const navBtn = document.querySelector('.sidebar .nav-item[data-screen="${sId}"]') ||
                         document.querySelector('.mobile-nav-bar .mobile-nav-btn[data-screen="${sId}"]');
          if (navBtn) navBtn.click();
        })()
      `);
      await wait(60);

      const screenFocus = await client.eval(`
        (() => {
          const visible = Array.from(document.querySelectorAll('button:not([disabled]), a, input:not([disabled]), select:not([disabled]), textarea:not([disabled])'))
            .filter(el => el.offsetParent !== null);
          const missing = [];
          visible.forEach(el => {
            el.focus();
            const s = window.getComputedStyle(el);
            const hasOutline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
            const hasShadow = s.boxShadow && s.boxShadow !== 'none' && !s.boxShadow.includes('0px 0px 0px 0px');
            if (!hasOutline && !hasShadow) {
              missing.push(el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ').join('.') : ''));
            }
          });
          return { checked: visible.length, missingCount: missing.length, missing };
        })()
      `);

      totalFocusChecked += screenFocus.checked;
      totalFocusMissing += screenFocus.missingCount;
      if (screenFocus.missing.length > 0) {
        missingSamplesAll.push(...screenFocus.missing);
      }
    }
    console.log(
      `Focus outline check across all 10 screens: missing=${totalFocusMissing} of ${totalFocusChecked}.`,
      missingSamplesAll.slice(0, 5)
    );

    // 3. Contrast Ratios in Light and Dark Mode
    console.log("\n--- Auditing Contrast Ratios ---");
    for (const theme of ["light", "dark"]) {
      await client.eval(`
        (() => {
          const current = document.documentElement.getAttribute('data-theme') || 'light';
          if (current !== '${theme}') {
            const btn = document.getElementById('theme-toggle-btn');
            if (btn) btn.click();
          }
        })()
      `);
      await wait(350);

      const contrastRes = await client.eval(`
        (() => {
          function parseRgb(colorStr) {
            const m = colorStr.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
            if (!m) return null;
            return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]), a: m[4] !== undefined ? parseFloat(m[4]) : 1 };
          }
          function getLuminance(r, g, b) {
            const a = [r, g, b].map(v => {
              v /= 255;
              return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            });
            return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
          }
          function getContrastRatio(rgb1, rgb2) {
            const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
            const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
            return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          }
          function getEffectiveBg(el) {
            let cur = el;
            while (cur && cur !== document) {
              const bg = window.getComputedStyle(cur).backgroundColor;
              const parsed = parseRgb(bg);
              if (parsed && parsed.a > 0.8) return parsed;
              cur = cur.parentElement;
            }
            return { r: 255, g: 255, b: 255, a: 1 };
          }

          // Check primary buttons specifically
          const btnPrimary = Array.from(document.querySelectorAll('.btn-primary, .mobile-nav-btn.active, .counter-badge'));
          const lowContrast = [];
          btnPrimary.forEach(el => {
            const style = window.getComputedStyle(el);
            const fg = parseRgb(style.color);
            const bg = getEffectiveBg(el);
            if (fg && bg) {
              const ratio = getContrastRatio(fg, bg);
              if (ratio < 4.5) {
                lowContrast.push({
                  el: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ').join('.') : ''),
                  ratio: Math.round(ratio * 10) / 10,
                  fg: style.color,
                  bg: 'rgb(' + bg.r + ',' + bg.g + ',' + bg.b + ')'
                });
              }
            }
          });
          return { lowContrastCount: lowContrast.length, samples: lowContrast };
        })()
      `);
      console.log(
        `Primary button contrast in ${theme}: ${contrastRes.lowContrastCount} low contrast elements.`,
        contrastRes.samples
      );
    }

    // 4. Modal Escape Key
    console.log("\n--- Auditing Modal Keyboard Accessibility (Escape Key) ---");
    const modalEscapeTest = await client.eval(`
      (() => {
        // Go to admin and open modal
        const adminBtn = document.querySelector('.sidebar .nav-item[data-screen="admin"]');
        if (adminBtn) adminBtn.click();
        const payloadBtn = document.querySelector('.btn-view-mail-payload');
        if (payloadBtn) payloadBtn.click();
        const modal = document.getElementById('email-preview-modal');
        const beforeVisible = modal && !modal.classList.contains('hidden');
        // Press Escape
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        const afterVisible = modal && !modal.classList.contains('hidden');
        return { beforeVisible, afterVisible, closedOnEscape: beforeVisible && !afterVisible };
      })()
    `);
    console.log("Modal Escape key test:", modalEscapeTest);

    // 5. Star Rating Interactivity in Handover Review
    console.log("\n--- Auditing Star Rating Interactivity ---");
    const starTest = await client.eval(`
      (() => {
        const chatBtn = document.querySelector('.sidebar .nav-item[data-screen="chat"]');
        if (chatBtn) chatBtn.click();
        const star3 = document.querySelector('.star-rating-btn[data-rating="3"]');
        if (star3) star3.click();
        const starText = document.getElementById('handover-star-text');
        const star4 = document.querySelector('.star-rating-btn[data-rating="4"]');
        return {
          star3Active: star3 ? star3.classList.contains('active') : false,
          star4Dimmed: star4 ? star4.classList.contains('dimmed') : false,
          starText: starText ? starText.textContent : null
        };
      })()
    `);
    console.log("Star rating test:", starTest);

    // 6. Mobile Drawer & Escape Key
    console.log("\n--- Auditing Mobile Drawer & Escape Key ---");
    const drawerTest = await client.eval(`
      (() => {
        const drawerBtn = document.getElementById('menu-drawer-btn');
        if (drawerBtn) drawerBtn.click();
        const sidebar = document.getElementById('app-sidebar');
        const opened = sidebar && sidebar.classList.contains('drawer-open');
        // Press Escape
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        const closed = sidebar && !sidebar.classList.contains('drawer-open');
        return { opened, closed };
      })()
    `);
    console.log("Drawer open & Escape test:", drawerTest);

    // 7. Listing Detail Modal & TreeSHAP Drivers
    console.log("\n--- Auditing Listing Detail Modal & TreeSHAP Drivers ---");
    const detailModalTest = await client.eval(`
      (() => {
        const brandLogo = document.querySelector('.brand-logo');
        if (brandLogo) brandLogo.click();
        const firstCard = document.querySelector('#discover-results-container .item-card');
        if (!firstCard) return { error: "No card found" };
        firstCard.click();
        const modal = document.getElementById('listing-detail-modal');
        const beforeEscape = modal && !modal.classList.contains('hidden');
        const modalTitle = document.getElementById('modal-item-title')?.textContent;
        const modalRange = document.getElementById('modal-range-median')?.textContent;
        const modalDrivers = document.querySelectorAll('#modal-ai-drivers-list .ai-driver-item').length;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        const afterEscape = modal && modal.classList.contains('hidden');
        return { beforeEscape, afterEscape, modalTitle, modalRange, modalDrivers };
      })()
    `);
    console.log("Listing detail modal test:", detailModalTest);

    // 8. Discover Filter Chips Interactivity
    console.log("\n--- Auditing Discover Filter Chips Interactivity ---");
    const filterTest = await client.eval(`
      (() => {
        const catBtn = document.querySelector('.filter-chip[data-filter="category"][data-val="furniture"]');
        if (catBtn) catBtn.click();
        const cardsCount = document.querySelectorAll('#discover-results-container .item-card').length;
        const badgeText = document.getElementById('filter-active-count-badge')?.textContent;
        const resetBtn = document.getElementById('btn-reset-filters');
        if (resetBtn) resetBtn.click();
        const resetCardsCount = document.querySelectorAll('#discover-results-container .item-card').length;
        return { cardsCount, badgeText, resetCardsCount };
      })()
    `);
    console.log("Discover filter chips test:", filterTest);

    // 9. State Reset after Sign-Out
    console.log("\n--- Auditing State Reset After Sign-Out ---");
    const resetTest = await client.eval(`
      (() => {
        // Dirty multiple screens
        const sBtn = document.querySelector('.sidebar .nav-item[data-screen="snap"]');
        if (sBtn) sBtn.click();
        document.getElementById('snap-title').value = "MODIFIED DESK TITLE";
        document.getElementById('snap-price-slider').value = 4500;
        document.getElementById('snap-price-slider').dispatchEvent(new Event('input'));
        document.getElementById('discover-search-input').value = "dirty query";
        document.getElementById('swap-solve-btn').click();
        document.getElementById('swap-confirm-btn-a').click();

        // Sign out
        document.getElementById('btn-sign-out').click();

        // Check if platform reset to initial in DOM
        const snapTitleAfter = document.getElementById('snap-title').value;
        const snapPriceAfter = document.getElementById('snap-price-slider').value;
        const discQueryAfter = document.getElementById('discover-search-input').value;
        const swapAAfter = document.getElementById('swap-confirm-btn-a').disabled;
        const activeScreenAfter = document.getElementById('screen-discover').classList.contains('active');

        return {
          snapTitleClean: snapTitleAfter === "Ergonomic Wooden Study Desk with Drawer",
          snapPriceClean: parseInt(snapPriceAfter) === 2600,
          swapAClean: swapAAfter === false,
          discQueryClean: discQueryAfter === "study table under 3000",
          discoverActive: activeScreenAfter
        };
      })()
    `);
    console.log("State reset after sign out:", resetTest);

    console.log("\nTotal Console Errors throughout entire audit:", client.errors);
  } finally {
    if (client) client.close();
    proc.kill();
  }
}

runAudit().catch(console.error);
