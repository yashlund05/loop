// Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.

/**
 * LOOP Prototype Dashboard Application Logic
 * Pure vanilla JavaScript - no dependencies, no external network requests.
 * All data is simulated for mentor and architectural evaluation.
 */

(function () {
  "use strict";

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Global platform state
  const state = {
    currentScreen: "overview",
    correctionsCount: 42,
    theme: "auto",

    // Snap to list state
    snap: {
      scrubbed: true,
      showHeatmap: false,
      title: "Ergonomic Wooden Study Desk with Drawer",
      category: "furniture",
      subtype: "Study Desk",
      brand: "IKEA Micke (Extracted via vision & OCR)",
      condition: "good",
      price: 2600,
      priceLow: 2200,
      priceLikely: 2800,
      priceHigh: 3400,
      initialDraft: {
        title: "Ergonomic Wooden Study Desk with Drawer",
        category: "furniture",
        subtype: "Study Desk",
        brand: "IKEA Micke (Extracted via vision & OCR)",
        condition: "good",
        price: 2600,
      },
    },

    // Discover search state
    search: {
      query: "study table under 3000",
      mode: "semantic", // 'semantic' or 'fts'
      category: "all",
      priceCeiling: Infinity,
      condition: "all",
      maxDistance: Infinity,
      displayCount: 12,
    },

    // Chat and Handover state
    chat: {
      messages: [
        {
          sender: "buyer",
          text: "Hi! Is this desk still available at the hostel?",
          time: "10:14 AM",
        },
        {
          sender: "seller",
          text: "Yes, still available! Pick up from Hostel Block B.",
          time: "10:16 AM",
        },
        { sender: "buyer", text: "Would you take ₹2,000 for it today?", time: "10:18 AM" },
      ],
      buyerConfirmed: false,
      sellerConfirmed: false,
      handoverCompleted: false,
      reviewSubmitted: false,
    },

    // Swap engine state
    swap: {
      calculated: false,
      confirmed: {
        aarav: false,
        priya: false,
        rohan: false,
      },
    },

    // Trust calculator state
    trust: {
      verified: 1,
      trades: 14,
      responseTime: 0.85,
      rating: 4.6,
    },

    // Moderation queue state
    moderation: {
      flags: [
        {
          id: "flag-101",
          type: "duplicate",
          title: "MacBook Air M1 256GB",
          seller: "@freshman_deals",
          reason:
            "Perceptual Hash match (Hamming distance 2) and CLIP cosine similarity 0.94 vs existing listing #1082 by @campus_tech.",
          evidence: "Image matches 98.4% of existing listing in Hostel A. Possible copied image.",
          status: "pending",
        },
        {
          id: "flag-102",
          type: "price_anomaly",
          title: "Apple Magic Mouse 2",
          seller: "@quick_seller",
          reason:
            "Price anomaly: Listed at ₹150 (< 0.4 × predicted low of ₹1,800; residual z-score -3.4).",
          evidence:
            "Price is 91% below market median. Flagged for bait-and-switch or counterfeit review.",
          status: "pending",
        },
        {
          id: "flag-103",
          type: "scam_text",
          title: "Sony WH-1000XM4 Headphones",
          seller: "@audio_guy",
          reason: "Scam text pattern detected by classifier (Confidence: 0.94).",
          evidence:
            'Message text: "Send ₹500 advance via GPay to 98765-XXXXX before pickup, will courier."',
          status: "pending",
        },
      ],
      auditLog: [
        {
          time: "09:30 AM",
          mod: "Mod-System",
          action: "Auto-Flagged",
          target: "Flag #101 (Duplicate image)",
          note: "phash collision",
        },
        {
          time: "09:32 AM",
          mod: "Mod-System",
          action: "Auto-Flagged",
          target: "Flag #102 (Price anomaly)",
          note: "Residual z-score < -3.0",
        },
      ],
    },

    // Active learning state
    learning: {
      activeModel: { version: "v1.1.0", accuracy: 86.1, metric: "Top-1 Accuracy" },
      retrainingInProgress: false,
      lastCandidate: null,
    },

    // Simulator state
    simulator: {
      users: 2500,
      listingAge: 8,
      views: 46,
      currentAsk: 2600,
      priceFloor: 1800,
    },

    // Impact state
    impact: {
      replacementRate: 0.8, // 0.5, 0.8, 1.0
    },
  };

  // Utility: Show temporary toast notice
  function showToast(message) {
    let toast = document.getElementById("global-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "global-toast";
      toast.className = "toast-notice";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove("visible");
    }, 3200);
  }

  // Navigation controller
  function navigateTo(screenId) {
    closeEmailPreviewModal();
    closeListingDetailModal();
    if (window.LOOP && window.LOOP.closeDrawer) {
      window.LOOP.closeDrawer();
    }

    if (screenId === "login" || screenId === "signin") {
      setAuthGateVisible(true);
      window.location.hash = "login";
      return;
    }
    setAuthGateVisible(false);
    state.currentScreen = screenId;
    window.location.hash = screenId;

    // Update screen views
    document.querySelectorAll(".screen-view").forEach((view) => {
      view.classList.remove("active");
    });
    const targetView = document.getElementById("screen-" + screenId);
    if (targetView) {
      targetView.classList.add("active");
    }

    // Update desktop sidebar nav
    document.querySelectorAll(".sidebar .nav-item").forEach((item) => {
      if (item.getAttribute("data-screen") === screenId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Update mobile nav bar if present
    document.querySelectorAll(".mobile-nav-bar .mobile-nav-btn").forEach((btn) => {
      if (btn.getAttribute("data-screen") === screenId) {
        btn.classList.add("active");
        btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      } else {
        btn.classList.remove("active");
      }
    });

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  // Theme switcher
  function initTheme() {
    const toggleBtn = document.getElementById("theme-toggle-btn");
    const savedTheme = localStorage.getItem("loop_theme") || "auto";
    setTheme(savedTheme);

    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const nextTheme =
          state.theme === "light" ? "dark" : state.theme === "dark" ? "auto" : "light";
        setTheme(nextTheme);
      });
    }
  }

  function setTheme(t) {
    state.theme = t;
    localStorage.setItem("loop_theme", t);
    const label = document.getElementById("theme-toggle-label");
    if (t === "light") {
      document.documentElement.setAttribute("data-theme", "light");
      if (label) label.textContent = "☀️ Light";
    } else if (t === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      if (label) label.textContent = "🌙 Dark";
    } else {
      document.documentElement.removeAttribute("data-theme");
      if (label) label.textContent = "🌓 Auto";
    }
  }

  // Update corrections count everywhere
  function updateCorrectionsBadge(increment = 0, customReason = "") {
    if (increment > 0) {
      state.correctionsCount += increment;
      if (customReason) {
        showToast(`Correction logged: ${customReason} (Total: ${state.correctionsCount})`);
      }
    }
    const navBadge = document.getElementById("nav-corrections-count");
    if (navBadge) navBadge.textContent = state.correctionsCount;

    const learningBadge = document.getElementById("learning-corrections-count");
    if (learningBadge) learningBadge.textContent = state.correctionsCount;

    const overviewKpi = document.getElementById("overview-kpi-corrections");
    if (overviewKpi) overviewKpi.textContent = `${state.correctionsCount} logged`;
  }

  // ==========================================
  // Simulated Backend Datastore & Mail Outbox (apps/api)
  // ==========================================
  const backendStore = {
    users: [
      {
        id: "usr_1001",
        email: "aarav.s@adypu.edu.in",
        role: "Student Trader",
        domain: "adypu.edu.in",
        status: "Active (Verified)",
        createdAt: "2026-10-20 09:30 AM",
      },
      {
        id: "usr_1002",
        email: "priya.m@adypu.edu.in",
        role: "Student Trader",
        domain: "adypu.edu.in",
        status: "Active (Verified)",
        createdAt: "2026-10-21 11:15 AM",
      },
      {
        id: "usr_1003",
        email: "rohan.k@adypu.edu.in",
        role: "Student Trader",
        domain: "adypu.edu.in",
        status: "Active (Verified)",
        createdAt: "2026-10-21 02:45 PM",
      },
      {
        id: "usr_1004",
        email: "admin.moderator@adypu.edu.in",
        role: "Campus Moderator",
        domain: "adypu.edu.in",
        status: "Active (Staff)",
        createdAt: "2026-10-18 10:00 AM",
      },
    ],
    mails: [
      {
        id: "msg_801",
        time: "10:14 AM",
        recipient: "priya.m@adypu.edu.in",
        subject: "[LOOP] Handover Verification OTP: 7492",
        type: "Handover OTP",
        status: "DELIVERED (SES)",
        body: `
          <div style="font-family: sans-serif; line-height: 1.5;">
            <h3 style="color: #059669; margin-top: 0;">Safe Handover Protocol Initiated</h3>
            <p>Hi Priya,</p>
            <p>Your buyer (Aarav) has arrived at the meetup location: <strong>Central Library Cafe Quad</strong>.</p>
            <div style="background: #f1f5f9; padding: 14px; border-radius: 8px; text-align: center; margin: 16px 0;">
              <span style="font-size: 0.8rem; color: #64748b;">Verification OTP</span><br>
              <strong style="font-size: 1.8rem; letter-spacing: 4px; color: #0f172a;">7 4 9 2</strong>
            </div>
            <p style="font-size: 0.82rem; color: #64748b;">Never share advance money off-platform. Complete handover confirmation inside the app.</p>
          </div>
        `,
      },
      {
        id: "msg_802",
        time: "09:45 AM",
        recipient: "aarav.s@adypu.edu.in",
        subject: "[LOOP] Welcome to Campus Marketplace",
        type: "Welcome / Onboarding",
        status: "DELIVERED (SES)",
        body: `
          <div style="font-family: sans-serif; line-height: 1.5;">
            <h3 style="color: #059669; margin-top: 0;">Welcome to LOOP ADYPU</h3>
            <p>Hi Aarav,</p>
            <p>Your account is linked to the <strong>ADYPU Campus Community</strong>. You can now list pre-owned items, join circular swaps, and browse textbook/electronics deals.</p>
            <p>Campus trust rules apply: Coarse location only, strict meetup verification, and no off-platform prepayments.</p>
          </div>
        `,
      },
      {
        id: "msg_803",
        time: "Yesterday",
        recipient: "rohan.k@adypu.edu.in",
        subject: "[LOOP] Match Found in 3-Party Swap Cycle #14",
        type: "Swap Notification",
        status: "DELIVERED (SES)",
        body: `
          <div style="font-family: sans-serif; line-height: 1.5;">
            <h3 style="color: #059669; margin-top: 0;">3-Party Exchange Cycle Solved!</h3>
            <p>Hi Rohan,</p>
            <p>The CP-SAT matching engine found a zero-cash exchange cycle for your wanted <em>Scientific Calculator</em>. You give <em>CLRS Algorithms</em> to Priya, and receive <em>Casio FX-991EX</em> from Aarav.</p>
            <p>Open LOOP to confirm the trade cycle.</p>
          </div>
        `,
      },
    ],
  };

  function saveUserEmailToBackend(email, role = "Student Trader") {
    if (!email) return;
    const clean = email.trim();
    const domain = clean.includes("@") ? clean.split("@")[1] : "campus.internal";
    const existing = backendStore.users.find((u) => u.email.toLowerCase() === clean.toLowerCase());
    if (existing) {
      existing.status = "Active (Verified)";
      existing.createdAt = "Just now";
    } else {
      backendStore.users.unshift({
        id: "usr_" + Math.floor(1000 + Math.random() * 9000),
        email: clean,
        role: role,
        domain: domain,
        status: domain === "adypu.edu.in" ? "Active (Verified)" : "Active (Student)",
        createdAt: "Just now",
      });
    }
    renderBackendTables();
  }

  function sendOutboxMailToBackend(recipient, subject, type, bodyHtml) {
    if (!recipient) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMail = {
      id: "msg_" + Math.floor(100 + Math.random() * 900),
      time: timeStr,
      recipient: recipient.trim(),
      subject: subject,
      type: type,
      status: "DELIVERED (SES)",
      body: bodyHtml,
    };
    backendStore.mails.unshift(newMail);
    renderBackendTables();
    return newMail;
  }

  function renderBackendTables() {
    const mailsTbody = document.getElementById("backend-mails-tbody");
    const usersTbody = document.getElementById("backend-users-tbody");
    const mailCountBadge = document.getElementById("admin-mail-count");
    const userCountBadge = document.getElementById("admin-user-count");
    const headerMailCount = document.getElementById("header-mail-count");

    if (mailCountBadge) mailCountBadge.textContent = backendStore.mails.length;
    if (headerMailCount) headerMailCount.textContent = backendStore.mails.length;
    if (userCountBadge) userCountBadge.textContent = backendStore.users.length;

    if (mailsTbody) {
      mailsTbody.innerHTML = backendStore.mails
        .map(
          (m) => `
          <tr>
            <td>${m.time}</td>
            <td><strong>${m.recipient}</strong></td>
            <td>${m.subject} <span class="fair-badge fair" style="font-size: 0.72rem; margin-left: 4px;">${m.type}</span></td>
            <td><span class="fair-badge great">${m.status}</span></td>
            <td>
              <button type="button" class="btn btn-secondary btn-sm btn-view-mail-payload" data-mail-id="${m.id}">View Payload</button>
            </td>
          </tr>
        `
        )
        .join("");

      // Wire View Payload buttons
      mailsTbody.querySelectorAll(".btn-view-mail-payload").forEach((btn) => {
        btn.addEventListener("click", () => {
          const mailId = btn.getAttribute("data-mail-id");
          const found = backendStore.mails.find((x) => x.id === mailId);
          if (found) {
            openEmailPreviewModal(found);
          }
        });
      });
    }

    if (usersTbody) {
      usersTbody.innerHTML = backendStore.users
        .map(
          (u) => `
          <tr>
            <td><code>${u.id}</code></td>
            <td><strong>${u.email}</strong></td>
            <td>${u.domain}</td>
            <td><span class="fair-badge fair">${u.role}</span> <span class="fair-badge ${
              u.status.includes("Verified") ? "great" : "fair"
            }">${u.status}</span></td>
            <td>${u.createdAt}</td>
          </tr>
        `
        )
        .join("");
    }
  }

  function openEmailPreviewModal(mail) {
    const modal = document.getElementById("email-preview-modal");
    const subj = document.getElementById("email-modal-subject");
    const to = document.getElementById("email-modal-to");
    const time = document.getElementById("email-modal-time");
    const body = document.getElementById("email-modal-body");

    if (subj) subj.textContent = mail.subject;
    if (to) to.innerHTML = `<strong>${mail.recipient}</strong>`;
    if (time) time.innerHTML = `${mail.time} &bull; Status: <strong>${mail.status}</strong>`;
    if (body) body.innerHTML = mail.body;

    if (modal) modal.classList.remove("hidden");
  }

  function closeEmailPreviewModal() {
    const modal = document.getElementById("email-preview-modal");
    if (modal) modal.classList.add("hidden");
  }

  // ==========================================
  // Screen 1: Overview
  // ==========================================
  function initOverviewScreen() {
    // Feature card clicks navigate to corresponding screens
    document.querySelectorAll(".feature-card[data-target-screen]").forEach((card) => {
      card.addEventListener("click", () => {
        const target = card.getAttribute("data-target-screen");
        if (target) navigateTo(target);
      });
    });

    const listingsKpi = document.getElementById("overview-kpi-listings-card");
    if (listingsKpi) {
      listingsKpi.addEventListener("click", () => {
        if (window.LOOP && window.LOOP.navigateToDiscover) {
          window.LOOP.navigateToDiscover("all");
        } else {
          navigateTo("discover");
        }
      });
    }
  }

  // ==========================================
  // Screen 2: Snap-to-List
  // ==========================================
  function initSnapScreen() {
    const canvas = document.getElementById("snap-canvas");
    const scrubBox = document.getElementById("scrubber-draggable-box");
    const scrubToggle = document.getElementById("snap-scrub-toggle");
    const faceBox = document.getElementById("scrub-box-face");
    const phoneBox = document.getElementById("scrub-box-phone");
    const scrubWarning = document.getElementById("snap-scrub-warning");
    const scrubStatusText = document.getElementById("snap-scrub-status-text");
    const heatmapToggle = document.getElementById("snap-heatmap-toggle");
    const heatmapOverlay = document.getElementById("snap-heatmap-overlay");
    const photoContainer = document.getElementById("snap-photo-box");

    // Load real demo photo onto canvas
    const baseImg = new Image();
    let imgLoaded = false;
    baseImg.crossOrigin = "anonymous";
    baseImg.onload = function () {
      imgLoaded = true;
      renderCanvas();
    };
    baseImg.onerror = function () {
      if (baseImg.src.indexOf("assets/images/") !== -1) {
        baseImg.src = "images/item-01.jpg";
      }
    };
    baseImg.src = "assets/images/item-01.jpg";

    function renderCanvas() {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const cw = canvas.width;
      const ch = canvas.height;
      ctx.clearRect(0, 0, cw, ch);

      if (imgLoaded && baseImg.naturalWidth) {
        const imgRatio = baseImg.naturalWidth / baseImg.naturalHeight;
        const canvasRatio = cw / ch;
        let dw, dh, dx, dy;
        if (imgRatio > canvasRatio) {
          dw = cw;
          dh = cw / imgRatio;
          dx = 0;
          dy = (ch - dh) / 2;
        } else {
          dh = ch;
          dw = ch * imgRatio;
          dx = (cw - dw) / 2;
          dy = 0;
        }
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(baseImg, dx, dy, dw, dh);
      } else {
        ctx.fillStyle = "#334155";
        ctx.fillRect(0, 0, cw, ch);
      }

      if (state.snap.scrubbed && scrubBox && photoContainer) {
        const cRect = photoContainer.getBoundingClientRect();
        const bRect = scrubBox.getBoundingClientRect();
        const scaleX = cw / (cRect.width || cw);
        const scaleY = ch / (cRect.height || ch);

        let bx = Math.round((bRect.left - cRect.left) * scaleX);
        let by = Math.round((bRect.top - cRect.top) * scaleY);
        let bw = Math.round(bRect.width * scaleX);
        let bh = Math.round(bRect.height * scaleY);

        bx = Math.max(0, Math.min(cw - 10, bx));
        by = Math.max(0, Math.min(ch - 10, by));
        bw = Math.max(10, Math.min(cw - bx, bw));
        bh = Math.max(10, Math.min(ch - by, bh));

        if (bw > 0 && bh > 0) {
          pixelateRegion(ctx, bx, by, bw, bh, 14);
        }
      }
    }

    function pixelateRegion(ctx, x, y, width, height, blockSize) {
      try {
        const imgData = ctx.getImageData(x, y, width, height);
        const d = imgData.data;
        for (let py = 0; py < height; py += blockSize) {
          for (let px = 0; px < width; px += blockSize) {
            let r = 0,
              g = 0,
              b = 0,
              count = 0;
            const endY = Math.min(py + blockSize, height);
            const endX = Math.min(px + blockSize, width);

            for (let sy = py; sy < endY; sy++) {
              for (let sx = px; sx < endX; sx++) {
                const i = (sy * width + sx) * 4;
                r += d[i];
                g += d[i + 1];
                b += d[i + 2];
                count++;
              }
            }

            if (count > 0) {
              const avgR = Math.round(r / count);
              const avgG = Math.round(g / count);
              const avgB = Math.round(b / count);

              for (let sy = py; sy < endY; sy++) {
                for (let sx = px; sx < endX; sx++) {
                  const i = (sy * width + sx) * 4;
                  d[i] = avgR;
                  d[i + 1] = avgG;
                  d[i + 2] = avgB;
                }
              }
            }
          }
        }
        ctx.putImageData(imgData, x, y);
      } catch (_) {
        ctx.fillStyle = "rgba(100, 116, 139, 0.95)";
        ctx.fillRect(x, y, width, height);
      }
    }

    function applyScrubberUI() {
      if (state.snap.scrubbed) {
        if (scrubBox) scrubBox.style.display = "flex";
        if (faceBox) {
          faceBox.classList.add("blurred");
          const lbl = faceBox.querySelector(".scrub-label");
          if (lbl) lbl.textContent = "✓ Face: Blurred";
        }
        if (phoneBox) {
          phoneBox.classList.add("blurred");
          const lbl = phoneBox.querySelector(".scrub-label");
          if (lbl) lbl.textContent = "✓ Phone: Blurred";
        }
        if (scrubWarning) scrubWarning.style.display = "none";
        if (scrubStatusText) {
          scrubStatusText.textContent = "Client-side pixelation active (region draggable)";
          scrubStatusText.style.color = "var(--color-success)";
        }
      } else {
        if (scrubBox) scrubBox.style.display = "none";
        if (faceBox) {
          faceBox.classList.remove("blurred");
          const lbl = faceBox.querySelector(".scrub-label");
          if (lbl) lbl.textContent = "⚠️ Face: Exposed";
        }
        if (phoneBox) {
          phoneBox.classList.remove("blurred");
          const lbl = phoneBox.querySelector(".scrub-label");
          if (lbl) lbl.textContent = "⚠️ Phone: Exposed";
        }
        if (scrubWarning) scrubWarning.style.display = "flex";
        if (scrubStatusText) {
          scrubStatusText.textContent =
            "Scrubber OFF: Image cannot be published without scrubbing sensitive areas";
          scrubStatusText.style.color = "var(--color-danger)";
        }
      }
      renderCanvas();
    }

    // Draggable box pointer events
    if (scrubBox && photoContainer) {
      let isDragging = false;
      let startX = 0,
        startY = 0;
      let initialLeft = 0,
        initialTop = 0;

      scrubBox.addEventListener("pointerdown", (e) => {
        isDragging = true;
        try {
          scrubBox.setPointerCapture(e.pointerId);
        } catch (_) {}
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = scrubBox.offsetLeft;
        initialTop = scrubBox.offsetTop;
        e.preventDefault();
      });

      const onPointerMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const maxLeft = photoContainer.clientWidth - scrubBox.offsetWidth;
        const maxTop = photoContainer.clientHeight - scrubBox.offsetHeight;

        const newLeft = Math.max(0, Math.min(maxLeft, initialLeft + dx));
        const newTop = Math.max(0, Math.min(maxTop, initialTop + dy));

        scrubBox.style.left = `${newLeft}px`;
        scrubBox.style.top = `${newTop}px`;
        renderCanvas();
      };

      const onPointerUp = (e) => {
        if (isDragging) {
          isDragging = false;
          try {
            scrubBox.releasePointerCapture(e.pointerId);
          } catch (_) {}
          renderCanvas();
        }
      };

      scrubBox.addEventListener("pointermove", onPointerMove);
      scrubBox.addEventListener("pointerup", onPointerUp);
      scrubBox.addEventListener("pointercancel", onPointerUp);

      scrubBox.addEventListener("keydown", (e) => {
        const step = e.shiftKey ? 20 : 5;
        let moved = false;
        let curLeft = scrubBox.offsetLeft;
        let curTop = scrubBox.offsetTop;
        const maxLeft = photoContainer.clientWidth - scrubBox.offsetWidth;
        const maxTop = photoContainer.clientHeight - scrubBox.offsetHeight;

        if (e.key === "ArrowLeft") {
          curLeft = Math.max(0, curLeft - step);
          moved = true;
        } else if (e.key === "ArrowRight") {
          curLeft = Math.min(maxLeft, curLeft + step);
          moved = true;
        } else if (e.key === "ArrowUp") {
          curTop = Math.max(0, curTop - step);
          moved = true;
        } else if (e.key === "ArrowDown") {
          curTop = Math.min(maxTop, curTop + step);
          moved = true;
        }

        if (moved) {
          e.preventDefault();
          scrubBox.style.left = `${curLeft}px`;
          scrubBox.style.top = `${curTop}px`;
          renderCanvas();
        }
      });
    }

    if (scrubToggle) {
      scrubToggle.addEventListener("change", (e) => {
        state.snap.scrubbed = e.target.checked;
        applyScrubberUI();
      });
      applyScrubberUI();
    }

    // Heatmap toggle
    if (heatmapToggle && heatmapOverlay) {
      heatmapToggle.addEventListener("change", (e) => {
        state.snap.showHeatmap = e.target.checked;
        if (state.snap.showHeatmap) {
          heatmapOverlay.classList.remove("hidden");
        } else {
          heatmapOverlay.classList.add("hidden");
        }
      });
    }

    // Editable fields correction tracking
    const fieldsToTrack = [
      { id: "snap-title", key: "title", label: "Title" },
      { id: "snap-category", key: "category", label: "Category" },
      { id: "snap-subtype", key: "subtype", label: "Subtype" },
      { id: "snap-brand", key: "brand", label: "Brand/Model" },
      { id: "snap-condition", key: "condition", label: "Condition" },
    ];

    fieldsToTrack.forEach((field) => {
      const el = document.getElementById(field.id);
      if (el) {
        el.addEventListener("change", (e) => {
          const newVal = e.target.value;
          if (newVal !== state.snap.initialDraft[field.key]) {
            state.snap[field.key] = newVal;
            updateCorrectionsBadge(1, `${field.label} edited to "${newVal}"`);
          }
        });
      }
    });

    // Price Slider & Fair-deal badge
    const priceSlider = document.getElementById("snap-price-slider");
    const priceDisplay = document.getElementById("snap-price-display");
    const fairBadge = document.getElementById("snap-fair-badge");

    function updatePriceBadge(val) {
      val = parseInt(val, 10);
      state.snap.price = val;
      if (priceDisplay) priceDisplay.textContent = `₹${val.toLocaleString("en-IN")}`;

      if (val < state.snap.priceLow) {
        fairBadge.className = "fair-badge great";
        fairBadge.innerHTML = "🟢 Great Deal &bull; Below likely low (₹2,200)";
      } else if (val <= state.snap.priceHigh) {
        fairBadge.className = "fair-badge fair";
        fairBadge.innerHTML = "🔵 Fair Price &bull; Within 80% conformal range";
      } else {
        fairBadge.className = "fair-badge overpriced";
        fairBadge.innerHTML = "🟠 Overpriced &bull; Above predicted high (₹3,400)";
      }
    }

    if (priceSlider) {
      priceSlider.addEventListener("input", (e) => {
        updatePriceBadge(e.target.value);
      });
      priceSlider.addEventListener("change", (e) => {
        if (parseInt(e.target.value, 10) !== state.snap.initialDraft.price) {
          updateCorrectionsBadge(1, `Ask price adjusted to ₹${e.target.value}`);
        }
      });
      updatePriceBadge(priceSlider.value);
    }

    // Reset draft button
    const resetBtn = document.getElementById("snap-reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        document.getElementById("snap-title").value = state.snap.initialDraft.title;
        document.getElementById("snap-category").value = state.snap.initialDraft.category;
        document.getElementById("snap-subtype").value = state.snap.initialDraft.subtype;
        document.getElementById("snap-brand").value = state.snap.initialDraft.brand;
        document.getElementById("snap-condition").value = state.snap.initialDraft.condition;
        priceSlider.value = state.snap.initialDraft.price;
        updatePriceBadge(state.snap.initialDraft.price);
        showToast("Reset fields to AI initial draft");
      });
    }

    // Confirm & publish draft button
    const confirmBtn = document.getElementById("snap-confirm-btn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        if (!state.snap.scrubbed) {
          showToast("❌ Blocked by /scrub-verify: Enable privacy scrubber before publishing.");
          return;
        }
        showToast("✓ Listing confirmed and published to campus feed!");
      });
    }
  }

  // ==========================================
  // Screen 3: Discover & Search
  // ==========================================
  function initDiscoverScreen() {
    const searchInput = document.getElementById("discover-search-input");
    const searchBtn = document.getElementById("discover-search-btn");
    const semanticBtn = document.getElementById("search-mode-semantic");
    const ftsBtn = document.getElementById("search-mode-fts");
    const resultsContainer = document.getElementById("discover-results-container");
    const queryExplanation = document.getElementById("discover-query-explanation");

    // Simulated database of campus listings (loaded from prototype/data/catalogue.js)
    const mockListings =
      window.LOOP_CATALOGUE && window.LOOP_CATALOGUE.length > 0
        ? window.LOOP_CATALOGUE
        : [
            {
              id: "item-01",
              title: "GTRACING Ergonomic High-Back Gaming Chair (Red & Black)",
              category: "Furniture",
              subtype: "Study & Gaming Chairs",
              brand: "GTRACING",
              price: 4200,
              condition: "Good",
              ageYears: 1.2,
              areaName: "Lohegaon",
              distanceKm: 0.6,
              postedDaysAgo: 2,
              description: "Comfortable ergonomic racing chair.",
              sellerAlias: "Seller 14",
              aiPriceRange: { low: 3800, likely: 4500, high: 5200 },
              aiReasons: [
                "+12% premium for branded GTRACING steel frame",
                "-8% condition adjustment for armrest edge scuff",
                "High campus velocity in ADYPU hostel cluster",
              ],
              aiConfidence: 0.92,
              images: ["item-01.jpg"],
              wearHotspots: [{ x: "18%", y: "48%", r: "8%" }],
              badge: "Fair Price",
              badgeType: "fair",
              svgType: "chair",
            },
          ];

    function renderItemThumbnail(item) {
      if (item.images && item.images.length > 0) {
        const raw = item.images[0];
        const fileName = raw.includes("/") ? raw.split("/").pop() : raw;
        const assetSrc = "assets/images/" + fileName;
        const fallbackSrc = "images/" + fileName;
        return `<div class="item-thumb-box" style="aspect-ratio: 16/9; width: 100%; overflow: hidden; background-color: var(--color-bg); display: flex; align-items: center; justify-content: center;">
          <img src="${assetSrc}" alt="${escapeHtml(
            item.title
          )}" class="item-thumb-img" loading="lazy" style="width: 100%; height: 100%; object-fit: contain;" onerror="if(this.src.indexOf('assets/images/') !== -1){this.src='${fallbackSrc}';}else{this.onerror=null;this.parentElement.innerHTML=renderNeutralPendingTile('${escapeHtml(
            item.category || ""
          )}', false);}">
        </div>`;
      }
      return renderNeutralPendingTile(item.category, false);
    }

    function renderNeutralPendingTile(category, isModal) {
      const cat = (category || "").toLowerCase();
      let icon = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`;
      if (cat.includes("book")) {
        icon = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
      } else if (cat.includes("electr")) {
        icon = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`;
      } else if (cat.includes("furnit")) {
        icon = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`;
      } else if (cat.includes("hobbi") || cat.includes("sport") || cat.includes("recreat")) {
        icon = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`;
      }

      return `<div class="neutral-pending-tile ${
        isModal ? "modal-tile" : ""
      }" role="img" aria-label="Photo pending for ${escapeHtml(category || "item")}">
        <div class="pending-icon-wrap" aria-hidden="true">
          ${icon}
        </div>
        <div>
          <span class="photo-pending-label">Photo pending</span>
          <span class="photo-pending-sub">${escapeHtml(category || "Standard item")}</span>
        </div>
      </div>`;
    }

    function getThumbSvg(type) {
      return renderNeutralPendingTile(type, false);
    }

    function renderResults() {
      const q = (state.search.query || "").trim().toLowerCase();
      const mode = state.search.mode;
      const selectedCat = state.search.category || "all";
      const selectedPriceCeiling = state.search.priceCeiling || Infinity;
      const selectedCond = state.search.condition || "all";
      const maxDistance = state.search.maxDistance || Infinity;
      const catalogCounter = document.getElementById("discover-catalog-counter");
      const paginationStatus = document.getElementById("discover-pagination-status");
      const loadMoreBtn = document.getElementById("discover-load-more-btn");
      const activeCountBadge = document.getElementById("filter-active-count-badge");

      // Extract price ceiling heuristic (e.g. "under 3000", "< 2500")
      let queryCeiling = Infinity;
      const underMatch = q.match(/under\s*(\d+)/i) || q.match(/<\s*(\d+)/i);
      if (underMatch) {
        queryCeiling = parseInt(underMatch[1], 10);
      }
      const effectiveCeiling = Math.min(queryCeiling, selectedPriceCeiling);

      // Clean query tokens
      let coreQuery = q
        .replace(/under\s*\d+/i, "")
        .replace(/<\s*\d+/i, "")
        .trim();

      // Update active filter badge counter
      let activeFilterCount = 0;
      if (selectedCat !== "all") activeFilterCount++;
      if (selectedPriceCeiling !== Infinity) activeFilterCount++;
      if (selectedCond !== "all") activeFilterCount++;
      if (maxDistance !== Infinity) activeFilterCount++;

      if (activeCountBadge) {
        if (activeFilterCount === 0) {
          activeCountBadge.textContent = "All Listings";
        } else {
          activeCountBadge.textContent = `${activeFilterCount} Filter${
            activeFilterCount > 1 ? "s" : ""
          } Active`;
        }
      }

      // Pre-filter catalog pool by structured chip dimensions
      let pool = mockListings.filter((item) => {
        const itemCat = (item.category || "").toLowerCase();
        const selCat = selectedCat.toLowerCase();
        const catMatch =
          selectedCat === "all" ||
          itemCat === selCat ||
          itemCat.startsWith(selCat) ||
          (selCat === "hobbies" &&
            (itemCat.includes("hobbies") ||
              itemCat.includes("recreation") ||
              itemCat.includes("sport")));

        const condMatch =
          selectedCond === "all" || item.condition.toLowerCase() === selectedCond.toLowerCase();

        const distNum =
          item.distanceKm !== undefined ? item.distanceKm : parseFloat(item.distance) || 0.5;
        const distMatch = maxDistance === Infinity || distNum <= maxDistance;
        const priceMatch = item.price <= effectiveCeiling;
        return catMatch && condMatch && distMatch && priceMatch;
      });

      // Full text search baseline behavior
      if (mode === "fts") {
        // Postgres FTS baseline: exact keyword match on English dictionary
        // "mez" does not exist in standard English Postgres dictionary -> fails!
        if (coreQuery.includes("mez")) {
          if (queryExplanation) {
            queryExplanation.innerHTML = `
              <div style="background-color: var(--color-danger-bg); color: var(--color-danger); padding: 10px 14px; border-radius: var(--radius-md); font-size: 0.84rem;">
                <strong>❌ Full-Text Baseline Failed:</strong> Postgres <code>to_tsquery('english', '${coreQuery}')</code> returned <strong>0 hits</strong>.
                Postgres lexical stemming cannot map Hinglish/Hindi term <em>"mez"</em> to English term <em>"table / desk"</em>.
              </div>
            `;
          }
          if (resultsContainer) {
            resultsContainer.innerHTML = `
              <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--color-text-muted);">
                <p style="font-size: 1.1rem; font-weight: 600;">No matching items found via Postgres FTS.</p>
                <p style="font-size: 0.85rem; margin-top: 6px;">Try switching to <strong>Semantic Search</strong> to test multilingual vector matching across 1,248 campus listings.</p>
              </div>
            `;
          }
          if (paginationStatus)
            paginationStatus.textContent = "0 matches found from 1,248 simulated listings";
          if (loadMoreBtn) loadMoreBtn.style.display = "none";
          return;
        }

        // Standard token match
        const tokens = coreQuery.split(/\s+/).filter(Boolean);
        const filtered = pool.filter((item) => {
          return (
            tokens.length === 0 ||
            tokens.some(
              (t) =>
                item.title.toLowerCase().includes(t) || item.tags.some((tag) => tag.includes(t))
            )
          );
        });

        if (queryExplanation) {
          queryExplanation.innerHTML = `
            <div style="background-color: var(--color-bg); border: 1px solid var(--color-border); padding: 10px 14px; border-radius: var(--radius-md); font-size: 0.82rem;">
              <strong>Postgres FTS Baseline:</strong> Exact tsvector token matches for <code>[${tokens.join(
                ", "
              )}]</code> with SQL filter <code>price &le; ₹${
                effectiveCeiling === Infinity ? "any" : effectiveCeiling
              }</code>. (Found ${filtered.length} matches from 1,248 simulated listings).
            </div>
          `;
        }
        displayCards(filtered);
      } else {
        // Semantic search behavior: understands Hinglish (mez -> furniture, kursi -> gaming chairs, kitab -> textbooks)
        let mappedConcept = coreQuery;
        let hinglishMatched = false;
        let hinglishTerm = "";
        if (coreQuery.includes("mez")) {
          mappedConcept = coreQuery.replace("mez", "Study Desk / Furniture");
          hinglishMatched = true;
          hinglishTerm = "mez";
        } else if (coreQuery.includes("kursi")) {
          mappedConcept = coreQuery.replace("kursi", "Ergonomic Chairs / Seating");
          hinglishMatched = true;
          hinglishTerm = "kursi";
        } else if (coreQuery.includes("kitab") || coreQuery.includes("pustak")) {
          mappedConcept = coreQuery.replace("kitab", "Textbooks").replace("pustak", "Textbooks");
          hinglishMatched = true;
          hinglishTerm = "kitab";
        }

        const filtered = pool.filter((item) => {
          if (!coreQuery) return true;
          const itemCat = (item.category || "").toLowerCase();

          // Concept mappings
          if (
            coreQuery.includes("table") ||
            coreQuery.includes("desk") ||
            coreQuery.includes("mez")
          ) {
            return itemCat === "furniture";
          }
          if (coreQuery.includes("kursi") || coreQuery.includes("chair")) {
            return itemCat === "furniture";
          }
          if (
            coreQuery.includes("kitab") ||
            coreQuery.includes("pustak") ||
            coreQuery.includes("book") ||
            coreQuery.includes("clrs") ||
            coreQuery.includes("calculus") ||
            coreQuery.includes("algorithm") ||
            coreQuery.includes("tanenbaum") ||
            coreQuery.includes("maths")
          ) {
            return itemCat === "books";
          }
          if (
            coreQuery.includes("calc") ||
            coreQuery.includes("casio") ||
            coreQuery.includes("laptop") ||
            coreQuery.includes("headphone") ||
            coreQuery.includes("audio") ||
            coreQuery.includes("ti-84")
          ) {
            return itemCat === "electronics";
          }
          if (
            coreQuery.includes("cycle") ||
            coreQuery.includes("bike") ||
            coreQuery.includes("bat") ||
            coreQuery.includes("cricket") ||
            coreQuery.includes("badminton") ||
            coreQuery.includes("racket") ||
            coreQuery.includes("guitar") ||
            coreQuery.includes("drafter") ||
            coreQuery.includes("lab")
          ) {
            return (
              itemCat.includes("hobbies") ||
              itemCat.includes("recreation") ||
              itemCat.includes("sport")
            );
          }

          // General semantic match token fallback
          const tokens = coreQuery.split(/\s+/).filter(Boolean);
          const searchCorpus = (
            item.title +
            " " +
            (item.subtype || "") +
            " " +
            (item.brand || "") +
            " " +
            (item.tags || []).join(" ") +
            " " +
            (item.description || "") +
            " " +
            item.category
          ).toLowerCase();
          return tokens.some((t) => searchCorpus.includes(t));
        });

        if (queryExplanation) {
          queryExplanation.innerHTML = `
            <div style="background-color: var(--color-primary-light); border: 1px solid var(--color-primary-border); padding: 10px 14px; border-radius: var(--radius-md); font-size: 0.82rem; color: var(--color-text);">
              <strong>✨ Semantic Search (384-d pgvector + SQL Parser):</strong>
              ${
                hinglishMatched
                  ? `Mapped Hinglish token <code>"mez"</code> &rarr; <code>"Study Desk / Furniture"</code> (Cosine similarity: 0.89). `
                  : ""
              }
              Parsed price ceiling constraint: <code>price &le; ₹${
                effectiveCeiling === Infinity ? "None" : effectiveCeiling.toLocaleString("en-IN")
              }</code>. (Retrieved ${
                filtered.length
              } matching items across 1,248 simulated campus listings).
            </div>
          `;
        }
        displayCards(filtered);
      }
    }

    function displayCards(items) {
      const catalogCounter = document.getElementById("discover-catalog-counter");
      const paginationStatus = document.getElementById("discover-pagination-status");
      const loadMoreBtn = document.getElementById("discover-load-more-btn");

      if (items.length === 0) {
        resultsContainer.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--color-text-muted);">
            <p style="font-weight: 600;">No listings match this specific query and filter combination.</p>
            <p style="font-size: 0.84rem; margin-top: 6px;">Try clicking "Reset Filters" above to browse the full 1,248 simulated campus listings catalog.</p>
          </div>
        `;
        if (catalogCounter) {
          catalogCounter.innerHTML = `Catalog: <strong>1,248 Simulated Campus Listings</strong> (0 matches)`;
        }
        if (paginationStatus)
          paginationStatus.textContent = "0 matching listings from 1,248 catalog";
        if (loadMoreBtn) loadMoreBtn.style.display = "none";
        return;
      }

      const limit = state.search.displayCount || 12;
      const paged = items.slice(0, limit);

      resultsContainer.innerHTML = paged
        .map(
          (item) => `
        <div class="item-card" data-listing-id="${
          item.id
        }" role="button" tabindex="0" aria-label="View AI price details for ${item.title}">
          <div class="item-thumbnail">
            ${renderItemThumbnail(item)}
            <span style="position: absolute; top: 8px; right: 8px;" class="fair-badge ${
              item.badgeType
            }">${item.badge}</span>
          </div>
          <div class="item-body">
            <div>
              <h4 class="item-title">${item.title}</h4>
              <p class="item-meta">📍 ${
                item.distanceKm
                  ? item.distanceKm + " km • " + (item.areaName || "Campus")
                  : item.distance || "0.5 km • Campus"
              } &bull; Condition: <strong>${item.condition}</strong></p>
            </div>
            <div class="item-footer">
              <div class="item-price">₹${item.price.toLocaleString("en-IN")}</div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button type="button" class="btn btn-secondary btn-sm btn-item-msg" data-title="${encodeURIComponent(
                  item.title
                )}" data-price="${item.price}">Message</button>
              </div>
            </div>
          </div>
        </div>
      `
        )
        .join("");

      // Wire card click and keyboard navigation to open Detail View Modal
      resultsContainer.querySelectorAll(".item-card").forEach((card) => {
        const id = card.getAttribute("data-listing-id");
        const itemObj = mockListings.find((m) => m.id === id);
        if (!itemObj) return;

        card.addEventListener("click", (e) => {
          if (e.target.closest(".btn-item-msg")) return;
          openListingDetailModal(itemObj, card);
        });

        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            if (e.target.closest(".btn-item-msg")) return;
            e.preventDefault();
            openListingDetailModal(itemObj, card);
          }
        });
      });

      // Wire direct message button on cards
      resultsContainer.querySelectorAll(".btn-item-msg").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const title = decodeURIComponent(btn.getAttribute("data-title") || "");
          const price = parseInt(btn.getAttribute("data-price") || "0", 10);
          window.LOOP.openChatWithItem(title, price);
        });
      });

      if (catalogCounter) {
        catalogCounter.innerHTML = `Catalog: <strong>1,248 Simulated Campus Listings</strong> (${items.length} matched)`;
      }

      if (paginationStatus) {
        paginationStatus.textContent = `Showing ${paged.length} of ${items.length} matching listings (from 1,248 catalog)`;
      }

      if (loadMoreBtn) {
        if (paged.length < items.length) {
          loadMoreBtn.style.display = "inline-block";
          loadMoreBtn.disabled = false;
          loadMoreBtn.textContent = `Load More from Catalog (${
            items.length - paged.length
          } more available)`;
        } else {
          loadMoreBtn.style.display = "inline-block";
          loadMoreBtn.disabled = true;
          loadMoreBtn.textContent = `All ${items.length} Matching Listings Displayed (from 1,248 catalog)`;
        }
      }
    }

    // Filter Chips: Category, Price, Condition, Distance
    document.querySelectorAll(".discover-filter-card .filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const type = chip.getAttribute("data-filter");
        const val = chip.getAttribute("data-val");
        if (!type || !val) return;

        const container = chip.closest(".filter-chips-wrap");
        if (container) {
          container.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
          chip.classList.add("active");
        }

        if (type === "category") {
          state.search.category = val;
        } else if (type === "price") {
          state.search.priceCeiling = val === "all" ? Infinity : parseInt(val, 10);
        } else if (type === "condition") {
          state.search.condition = val;
        } else if (type === "distance") {
          state.search.maxDistance = val === "all" ? Infinity : parseFloat(val);
        }

        state.search.displayCount = 12;
        renderResults();
      });
    });

    // Reset Filters Button
    const resetFiltersBtn = document.getElementById("btn-reset-filters");
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener("click", () => {
        state.search.category = "all";
        state.search.priceCeiling = Infinity;
        state.search.condition = "all";
        state.search.maxDistance = Infinity;

        document.querySelectorAll(".discover-filter-card .filter-chip").forEach((chip) => {
          if (chip.getAttribute("data-val") === "all") {
            chip.classList.add("active");
          } else {
            chip.classList.remove("active");
          }
        });

        state.search.displayCount = 12;
        renderResults();
        showToast("All catalog filters reset.");
      });
    }

    // Load More button in Discover screen
    const loadMoreBtn = document.getElementById("discover-load-more-btn");
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => {
        state.search.displayCount = (state.search.displayCount || 12) + 12;
        renderResults();
      });
    }

    // Overview KPI card click jumps to Discover
    const overviewKpiCard = document.getElementById("overview-kpi-listings-card");
    if (overviewKpiCard) {
      overviewKpiCard.addEventListener("click", () => {
        if (window.LOOP && window.LOOP.navigateToDiscover) {
          window.LOOP.navigateToDiscover("all");
        }
      });
    }

    // Sticky Top Search Bar & In-Screen Search Input Handlers
    const topSearchInput = document.getElementById("top-search-input");
    const topSearchBtn = document.getElementById("top-search-btn");
    const topImgSearchBtn = document.getElementById("top-img-search-btn");

    function executeSearch(queryVal) {
      state.search.query = queryVal;
      if (searchInput) searchInput.value = queryVal;
      if (topSearchInput) topSearchInput.value = queryVal;
      state.search.displayCount = 12;
      if (state.currentScreen !== "discover") {
        navigateTo("discover");
      }
      renderResults();
    }

    if (searchBtn && searchInput) {
      searchBtn.addEventListener("click", () => {
        executeSearch(searchInput.value);
      });
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          executeSearch(searchInput.value);
        }
      });
    }

    if (topSearchBtn && topSearchInput) {
      topSearchBtn.addEventListener("click", () => {
        executeSearch(topSearchInput.value);
      });
      topSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          executeSearch(topSearchInput.value);
        }
      });
    }

    function triggerVisualSimilaritySearch() {
      if (state.currentScreen !== "discover") {
        navigateTo("discover");
      }
      const visBox = document.getElementById("visual-search-similar-box");
      const visGrid = document.getElementById("visual-similar-cards-grid");
      if (!visBox || !visGrid) return;

      visBox.classList.remove("hidden");

      const matches = [
        { id: "item-01", score: 94 },
        { id: "item-02", score: 89 },
        { id: "item-05", score: 76 },
      ];

      visGrid.innerHTML = matches
        .map((m) => {
          const it = (catalogueItems || []).find((c) => c.id === m.id);
          if (!it) return "";
          const raw = it.images && it.images.length > 0 ? it.images[0] : "";
          const fileName = raw.includes("/") ? raw.split("/").pop() : raw;
          const assetSrc = "assets/images/" + fileName;
          const fallbackSrc = "images/" + fileName;
          return `
            <div class="visual-similar-card" data-id="${
              it.id
            }" tabindex="0" role="button" aria-label="Visual match: ${escapeHtml(it.title)}">
              <span class="visual-similarity-pill">${m.score}% Visual Match</span>
              <div style="aspect-ratio: 16/9; width: 100%; overflow: hidden; background-color: var(--color-bg); display: flex; align-items: center; justify-content: center;">
                <img src="${assetSrc}" alt="${escapeHtml(
                  it.title
                )}" loading="lazy" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.onerror=null;this.src='${fallbackSrc}';">
              </div>
              <div style="padding: 10px;">
                <div style="font-weight: 700; font-size: 0.84rem; color: var(--color-text); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(
                  it.title
                )}</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 700; color: var(--color-primary); font-size: 0.88rem;">₹${it.price.toLocaleString(
                    "en-IN"
                  )}</span>
                  <span class="fair-badge ${
                    it.badgeType || "fair"
                  }" style="font-size: 0.68rem; padding: 2px 6px;">${
                    it.badge || "Fair Price"
                  }</span>
                </div>
              </div>
            </div>
          `;
        })
        .join("");

      visGrid.querySelectorAll(".visual-similar-card").forEach((card) => {
        const id = card.getAttribute("data-id");
        const found = (catalogueItems || []).find((c) => c.id === id);
        if (found) {
          card.addEventListener("click", () => openListingDetailModal(found, card));
          card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openListingDetailModal(found, card);
            }
          });
        }
      });

      visBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      showToast("📷 Visual embedding search: 3 preset matches found (cosine similarity ≥ 0.75).");
    }

    if (topImgSearchBtn) {
      topImgSearchBtn.addEventListener("click", triggerVisualSimilaritySearch);
    }

    const btnCloseVisual = document.getElementById("btn-close-visual-search");
    if (btnCloseVisual) {
      btnCloseVisual.addEventListener("click", () => {
        const visBox = document.getElementById("visual-search-similar-box");
        if (visBox) visBox.classList.add("hidden");
      });
    }

    // Preset pills for discover search
    document.querySelectorAll("#screen-discover .preset-pill[data-query]").forEach((pill) => {
      pill.addEventListener("click", () => {
        const text = pill.getAttribute("data-query");
        if (text) {
          executeSearch(text);
        }
      });
    });

    // Mode toggles
    if (semanticBtn && ftsBtn) {
      semanticBtn.addEventListener("click", () => {
        semanticBtn.classList.add("active");
        ftsBtn.classList.remove("active");
        state.search.mode = "semantic";
        renderResults();
      });
      ftsBtn.addEventListener("click", () => {
        ftsBtn.classList.add("active");
        semanticBtn.classList.remove("active");
        state.search.mode = "fts";
        renderResults();
      });
    }

    // Image search button (simulated inside discover)
    const imgSearchBtn = document.getElementById("discover-img-search-btn");
    if (imgSearchBtn) {
      imgSearchBtn.addEventListener("click", () => {
        showToast(
          "📷 Image search simulation: Extracted 512-d CLIP embedding and found 3 visually similar items in Campus."
        );
        executeSearch("study table");
      });
    }

    // Saved search alert button (simulated)
    const saveSearchBtn = document.getElementById("discover-save-search-btn");
    if (saveSearchBtn) {
      saveSearchBtn.addEventListener("click", () => {
        showToast(
          `🔔 Alert created for "${
            state.search.query || "study table"
          }". You will receive instant notifications when matching items are listed.`
        );
      });
    }

    // Initial render
    renderResults();
  }

  // ==========================================
  // Listing Detail Modal: AI Price Range & Reasons
  // ==========================================
  let activeDetailItem = null;
  let lastActiveCardElement = null;

  function openListingDetailModal(item, triggerEl) {
    activeDetailItem = item;
    lastActiveCardElement = triggerEl || document.activeElement;

    const modal = document.getElementById("listing-detail-modal");
    if (!modal) return;

    // Populate title & meta
    const titleEl = document.getElementById("modal-item-title");
    if (titleEl) titleEl.textContent = item.title;

    const photoEl = document.getElementById("modal-item-photo");
    if (photoEl) {
      if (item.images && item.images.length > 0) {
        const raw = item.images[0];
        const fileName = raw.includes("/") ? raw.split("/").pop() : raw;
        const assetSrc = "assets/images/" + fileName;
        const fallbackSrc = "images/" + fileName;
        const hotspotsHtml = (item.wearHotspots || [])
          .map(
            (h, i) => `
          <div class="wear-hotspot-pin" style="left: ${h.x}; top: ${h.y}; width: ${h.r}; height: ${
            h.r
          };" title="Wear Hotspot ${i + 1}: Surface inspection zone">
            <span class="wear-hotspot-pulse"></span>
          </div>
        `
          )
          .join("");
        photoEl.innerHTML = `
          <div class="modal-detail-img-wrap" style="aspect-ratio: 16/10; width: 100%; position: relative; overflow: hidden; background-color: var(--color-bg); display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md);">
            <img src="${assetSrc}" alt="${escapeHtml(
              item.title
            )}" class="modal-detail-img" loading="lazy" style="width: 100%; height: 100%; object-fit: contain;" onerror="if(this.src.indexOf('assets/images/') !== -1){this.src='${fallbackSrc}';}else{this.onerror=null;this.parentElement.innerHTML=renderNeutralPendingTile('${escapeHtml(
              item.category || ""
            )}', true);}">
            ${hotspotsHtml}
          </div>
        `;
      } else {
        photoEl.innerHTML = `<div class="modal-detail-img-wrap" style="width: 100%;">${renderNeutralPendingTile(
          item.category,
          true
        )}</div>`;
      }
    }

    const priceEl = document.getElementById("modal-item-price");
    if (priceEl) priceEl.textContent = `₹${item.price.toLocaleString("en-IN")}`;

    const fairBadgeEl = document.getElementById("modal-item-fair-badge");
    if (fairBadgeEl) {
      fairBadgeEl.className = `fair-badge ${item.badgeType || "fair"}`;
      fairBadgeEl.textContent = item.badge || "Fair Price";
    }

    const condEl = document.getElementById("modal-item-condition");
    if (condEl) condEl.textContent = `Condition: ${item.condition}`;

    const distEl = document.getElementById("modal-item-distance");
    if (distEl) {
      distEl.textContent = `📍 ${
        item.distanceKm
          ? item.distanceKm + " km • " + (item.areaName || "Campus")
          : item.distance || "0.5 km • Campus"
      }`;
    }

    const catEl = document.getElementById("modal-item-category");
    if (catEl) {
      catEl.textContent = `Category: ${item.category} • ${item.subtype || "General"}`;
    }

    // Conformal AI price interval calculation
    const low = item.aiPriceRange
      ? item.aiPriceRange.low
      : Math.max(100, Math.round((item.price * 0.84) / 50) * 50);
    const median = item.aiPriceRange ? item.aiPriceRange.likely : item.price;
    const high = item.aiPriceRange
      ? item.aiPriceRange.high
      : Math.round((item.price * 1.16) / 50) * 50;

    const rangeMinEl = document.getElementById("modal-range-min");
    if (rangeMinEl) rangeMinEl.textContent = `₹${low.toLocaleString("en-IN")}`;

    const rangeMedianEl = document.getElementById("modal-range-median");
    if (rangeMedianEl) rangeMedianEl.textContent = `Median: ₹${median.toLocaleString("en-IN")}`;

    const rangeMaxEl = document.getElementById("modal-range-max");
    if (rangeMaxEl) rangeMaxEl.textContent = `₹${high.toLocaleString("en-IN")}`;

    const statusTextEl = document.getElementById("modal-conformal-status-text");
    if (statusTextEl) {
      if (item.badgeType === "great") {
        statusTextEl.textContent = `Listed price ₹${item.price.toLocaleString(
          "en-IN"
        )} is below the conformal lower bound (₹${low.toLocaleString("en-IN")}) — Great Deal!`;
      } else if (item.badgeType === "overpriced") {
        statusTextEl.textContent = `Listed price ₹${item.price.toLocaleString(
          "en-IN"
        )} exceeds the 80% conformal upper bound (₹${high.toLocaleString("en-IN")}) by ₹${(
          item.price - high
        ).toLocaleString("en-IN")} — Overpriced`;
      } else {
        statusTextEl.textContent = `Listed price ₹${item.price.toLocaleString(
          "en-IN"
        )} satisfies 80% conformal coverage [₹${low.toLocaleString(
          "en-IN"
        )} — ₹${high.toLocaleString("en-IN")}]`;
      }
    }

    // Set conformal bar pin & fill
    const fillEl = document.getElementById("modal-conformal-fill");
    const pinEl = document.getElementById("modal-conformal-pin");
    const minScale = Math.min(low, item.price) * 0.85;
    const maxScale = Math.max(high, item.price) * 1.15;
    const fillLeft = Math.max(
      2,
      Math.min(90, Math.round(((low - minScale) / (maxScale - minScale)) * 100))
    );
    const fillRight = Math.max(
      10,
      Math.min(98, Math.round(((high - minScale) / (maxScale - minScale)) * 100))
    );
    const pinPos = Math.max(
      2,
      Math.min(98, Math.round(((item.price - minScale) / (maxScale - minScale)) * 100))
    );

    if (fillEl) {
      fillEl.style.left = fillLeft + "%";
      fillEl.style.width = Math.max(8, fillRight - fillLeft) + "%";
    }
    if (pinEl) {
      pinEl.style.left = pinPos + "%";
    }

    // Populate SHAP / Explainable AI drivers
    const driversListEl = document.getElementById("modal-ai-drivers-list");
    if (driversListEl) {
      const icons = ["🔍", "📈", "📍"];
      const reasons =
        item.aiReasons && item.aiReasons.length > 0
          ? item.aiReasons
          : [
              `Condition Assessment: Verified ${item.condition} student equipment.`,
              `Campus Category Velocity: Active student demand in ${item.category}.`,
              `Hyperlocal Proximity: Located at ${
                item.areaName || "Campus"
              } with zero shipping friction.`,
            ];

      const reasonsHtml = reasons
        .map(
          (reason, idx) => `
        <div class="ai-driver-item">
          <span class="ai-driver-icon" aria-hidden="true">${icons[idx % icons.length]}</span>
          <div>${reason}</div>
        </div>
      `
        )
        .join("");

      driversListEl.innerHTML = `
        ${reasonsHtml}
        <div class="ai-driver-item">
          <span class="ai-driver-icon" aria-hidden="true">🛡️</span>
          <div>
            <strong>Conformal Deal Calibration:</strong> Model guarantees 80% coverage interval [₹${low.toLocaleString(
              "en-IN"
            )} — ₹${high.toLocaleString("en-IN")}] with ${(
              (item.aiConfidence || 0.92) * 100
            ).toFixed(0)}% model confidence.
          </div>
        </div>
      `;
    }

    modal.classList.remove("hidden");
    const closeBtn = document.getElementById("btn-close-detail-modal");
    if (closeBtn) closeBtn.focus();
  }

  function closeListingDetailModal() {
    const modal = document.getElementById("listing-detail-modal");
    if (modal && !modal.classList.contains("hidden")) {
      modal.classList.add("hidden");
      if (lastActiveCardElement && typeof lastActiveCardElement.focus === "function") {
        lastActiveCardElement.focus();
      }
    }
  }

  function initListingDetailModalEvents() {
    const modal = document.getElementById("listing-detail-modal");
    const closeBtn = document.getElementById("btn-close-detail-modal");
    const msgBtn = document.getElementById("btn-modal-message-seller");
    const swapBtn = document.getElementById("btn-modal-offer-swap");

    if (closeBtn) {
      closeBtn.addEventListener("click", closeListingDetailModal);
    }

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          closeListingDetailModal();
        }
      });
    }

    if (msgBtn) {
      msgBtn.addEventListener("click", () => {
        if (activeDetailItem) {
          const title = activeDetailItem.title;
          const price = activeDetailItem.price;
          closeListingDetailModal();
          window.LOOP.openChatWithItem(title, price);
        }
      });
    }

    if (swapBtn) {
      swapBtn.addEventListener("click", () => {
        if (activeDetailItem) {
          const title = activeDetailItem.title;
          closeListingDetailModal();
          navigateTo("swap");
          showToast(`Swap Engine active: Target item set to "${title}"`);
        }
      });
    }

    // Modal trap focus and escape key
    document.addEventListener("keydown", (e) => {
      if (!modal || modal.classList.contains("hidden")) return;

      if (e.key === "Escape") {
        e.preventDefault();
        closeListingDetailModal();
        return;
      }

      if (e.key === "Tab") {
        const focusables = modal.querySelectorAll(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    });
  }

  // ==========================================
  // Drawer Navigation Controller (Mobile slide-in drawer at 360px+)
  // ==========================================
  function initDrawerNav() {
    const menuBtn = document.getElementById("menu-drawer-btn");
    const sidebar = document.getElementById("app-sidebar");
    const backdrop = document.getElementById("sidebar-drawer-backdrop");
    const closeBtn = document.getElementById("drawer-close-btn");

    function openDrawer() {
      if (!sidebar) return;
      sidebar.classList.add("drawer-open");
      if (backdrop) backdrop.classList.remove("hidden");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
      if (closeBtn) closeBtn.focus();
    }

    function closeDrawer() {
      if (!sidebar) return;
      sidebar.classList.remove("drawer-open");
      if (backdrop) backdrop.classList.add("hidden");
      if (menuBtn) {
        menuBtn.setAttribute("aria-expanded", "false");
        if (document.activeElement && sidebar.contains(document.activeElement)) {
          menuBtn.focus();
        }
      }
    }

    if (menuBtn) {
      menuBtn.addEventListener("click", () => {
        const isOpen = sidebar && sidebar.classList.contains("drawer-open");
        if (isOpen) closeDrawer();
        else openDrawer();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", closeDrawer);
    }

    if (backdrop) {
      backdrop.addEventListener("click", closeDrawer);
    }

    // Escape key and focus trap inside drawer
    document.addEventListener("keydown", (e) => {
      if (!sidebar || !sidebar.classList.contains("drawer-open")) return;

      if (e.key === "Escape") {
        e.preventDefault();
        closeDrawer();
        return;
      }

      if (e.key === "Tab") {
        const focusables = sidebar.querySelectorAll(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    });

    // Close drawer when a navigation item is clicked on mobile viewports
    sidebar.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
          closeDrawer();
        }
      });
    });

    window.LOOP = window.LOOP || {};
    window.LOOP.openDrawer = openDrawer;
    window.LOOP.closeDrawer = closeDrawer;
  }

  // ==========================================
  // Screen 4: Chat & Handover
  // ==========================================
  function initChatScreen() {
    const chatInput = document.getElementById("chat-input-text");
    const sendBtn = document.getElementById("chat-send-btn");
    const messagesBox = document.getElementById("chat-messages-box");
    const scamBanner = document.getElementById("chat-scam-banner");
    const counterOfferBtn = document.getElementById("chat-counter-offer-btn");
    const buyerConfirmBtn = document.getElementById("handover-buyer-confirm-btn");
    const sellerConfirmBtn = document.getElementById("handover-seller-confirm-btn");
    const handoverStatusText = document.getElementById("handover-status-text");
    const reviewCard = document.getElementById("handover-review-card");

    const scamKeywords = ["advance", "gpay", "paytm", "whatsapp", "courier", "deposit", "upfront"];

    function checkForScam(text) {
      const lower = text.toLowerCase();
      const detected = scamKeywords.some((word) => lower.includes(word));
      if (detected) {
        scamBanner.style.display = "flex";
        scamBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      return detected;
    }

    function appendMessage(sender, text) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const bubble = document.createElement("div");
      bubble.className = `chat-bubble ${sender}`;
      bubble.innerHTML = `
        <div>${text}</div>
        <span class="bubble-meta">${
          sender === "buyer" ? "Buyer (Aarav)" : "Seller (Priya)"
        } &bull; ${timeStr}</span>
      `;
      messagesBox.appendChild(bubble);
      messagesBox.scrollTop = messagesBox.scrollHeight;
      checkForScam(text);
    }

    if (sendBtn && chatInput) {
      sendBtn.addEventListener("click", () => {
        const val = chatInput.value.trim();
        if (val) {
          appendMessage("buyer", val);
          chatInput.value = "";
        }
      });
      chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const val = chatInput.value.trim();
          if (val) {
            appendMessage("buyer", val);
            chatInput.value = "";
          }
        }
      });
    }

    // Scam simulation preset chips
    document.querySelectorAll(".scam-test-pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        const msg = pill.getAttribute("data-msg");
        appendMessage("buyer", msg);
      });
    });

    // Negotiation helper button
    if (counterOfferBtn) {
      counterOfferBtn.addEventListener("click", () => {
        const counterMsg =
          "I can do ₹2,400 for a quick handover at the Library Gate today. Fair deal for both!";
        appendMessage("seller", counterMsg);
        showToast("Negotiation Helper: Sent suggested counter-offer ₹2,400");
      });
    }

    // Handover dual confirmation
    function updateHandoverState() {
      const buyer = state.chat.buyerConfirmed;
      const seller = state.chat.sellerConfirmed;

      if (buyer && seller) {
        state.chat.handoverCompleted = true;
        handoverStatusText.innerHTML =
          "<strong>✅ Handover Verified & Completed! (2/2 Confirmed)</strong>";
        handoverStatusText.style.color = "var(--color-success)";
        if (reviewCard) reviewCard.style.display = "block";
        showToast("🎉 Handover confirmed by both parties! Listing status set to Completed.");
      } else if (buyer || seller) {
        handoverStatusText.innerHTML = `<strong>⏳ Waiting for confirmation (${
          buyer ? "Buyer confirmed" : "Seller confirmed"
        }, 1/2)</strong>`;
        handoverStatusText.style.color = "var(--color-warning)";
      } else {
        handoverStatusText.innerHTML =
          "Waiting for both parties to confirm at meetup (0/2 confirmed)";
        handoverStatusText.style.color = "var(--color-text-muted)";
      }
    }

    if (buyerConfirmBtn) {
      buyerConfirmBtn.addEventListener("click", () => {
        state.chat.buyerConfirmed = true;
        buyerConfirmBtn.disabled = true;
        buyerConfirmBtn.textContent = "✓ Buyer Confirmed Item Received";
        buyerConfirmBtn.classList.remove("btn-secondary");
        buyerConfirmBtn.classList.add("btn-primary");
        updateHandoverState();
      });
    }

    if (sellerConfirmBtn) {
      sellerConfirmBtn.addEventListener("click", () => {
        state.chat.sellerConfirmed = true;
        sellerConfirmBtn.disabled = true;
        sellerConfirmBtn.textContent = "✓ Seller Confirmed Handover";
        sellerConfirmBtn.classList.remove("btn-secondary");
        sellerConfirmBtn.classList.add("btn-primary");
        updateHandoverState();
      });
    }

    // Interactive Star Rating
    let selectedRating = 5;
    const starBtns = document.querySelectorAll(".star-rating-btn");
    const starText = document.getElementById("handover-star-text");

    function updateStarsUI(rating) {
      selectedRating = rating;
      starBtns.forEach((btn) => {
        const r = parseInt(btn.getAttribute("data-rating"), 10);
        if (r <= rating) {
          btn.classList.add("active");
          btn.classList.remove("dimmed");
        } else {
          btn.classList.remove("active");
          btn.classList.add("dimmed");
        }
      });
      if (starText) starText.textContent = `${rating}.0 / 5.0`;
    }

    starBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const r = parseInt(btn.getAttribute("data-rating"), 10);
        updateStarsUI(r);
      });
    });

    // Review submission
    const submitReviewBtn = document.getElementById("submit-review-btn");
    if (submitReviewBtn) {
      submitReviewBtn.addEventListener("click", () => {
        if (!state.chat.handoverCompleted) {
          showToast(
            "❌ Review rejected: Reviews can only be submitted after a verified handover (Anti-review-fraud rule)."
          );
          return;
        }
        state.chat.reviewSubmitted = true;
        reviewCard.innerHTML = `
          <div style="background-color: var(--color-success-bg); color: var(--color-success); padding: 14px; border-radius: var(--radius-md); text-align: center;">
            <strong>✓ Review Verified & Published!</strong>
            <p style="font-size: 0.8rem; margin-top: 4px;">Rating (${selectedRating}/5) recorded. Seller trust score updated in realtime.</p>
          </div>
        `;
        showToast("Verified review submitted successfully!");
      });
    }
  }

  // ==========================================
  // Screen 5: Swap Engine
  // ==========================================
  function initSwapScreen() {
    const solveBtn = document.getElementById("swap-solve-btn");
    const diagramBox = document.getElementById("swap-diagram-container");
    const swapStatusBadge = document.getElementById("swap-status-badge");
    const confirmBtnA = document.getElementById("swap-confirm-btn-a");
    const confirmBtnB = document.getElementById("swap-confirm-btn-b");
    const confirmBtnC = document.getElementById("swap-confirm-btn-c");

    function checkAllConfirmed() {
      const { aarav, priya, rohan } = state.swap.confirmed;
      const count = (aarav ? 1 : 0) + (priya ? 1 : 0) + (rohan ? 1 : 0);

      if (count === 3) {
        swapStatusBadge.className = "fair-badge great";
        swapStatusBadge.innerHTML = "🎉 3-Party Swap Confirmed & Locked (3/3 Confirmed)";
        showToast("All 3 parties confirmed! Handover schedules created for Library Gate.");
      } else if (count > 0) {
        swapStatusBadge.className = "fair-badge fair";
        swapStatusBadge.innerHTML = `⏳ Swap Pending (${count}/3 Confirmed)`;
      } else {
        swapStatusBadge.className = "fair-badge fair";
        swapStatusBadge.innerHTML = "Ready to confirm (0/3)";
      }
    }

    if (solveBtn) {
      solveBtn.addEventListener("click", () => {
        state.swap.calculated = true;
        diagramBox.innerHTML = `
          <svg viewBox="0 0 540 280" width="100%" height="100%" style="display:block;">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
              </marker>
            </defs>

            <!-- Background cycle circle -->
            <circle cx="270" cy="140" r="95" fill="none" stroke="var(--color-primary-border)" stroke-width="2" stroke-dasharray="6,4"/>

            <!-- Connecting directional arrows -->
            <!-- A -> B -->
            <path d="M 230 65 Q 340 75 365 140" fill="none" stroke="#059669" stroke-width="3" marker-end="url(#arrow)"/>
            <!-- B -> C -->
            <path d="M 365 185 Q 285 245 190 215" fill="none" stroke="#059669" stroke-width="3" marker-end="url(#arrow)"/>
            <!-- C -> A -->
            <path d="M 160 170 Q 155 100 230 65" fill="none" stroke="#059669" stroke-width="3" marker-end="url(#arrow)"/>

            <!-- Node A: Aarav (Top) -->
            <g transform="translate(270, 50)">
              <circle cx="0" cy="0" r="34" fill="var(--color-surface)" stroke="#059669" stroke-width="3"/>
              <text x="0" y="-8" text-anchor="middle" font-size="11" font-weight="700" fill="var(--color-text)">User A: Aarav</text>
              <text x="0" y="8" text-anchor="middle" font-size="9" fill="var(--color-text-muted)">Gives: Calculator</text>
              <text x="0" y="20" text-anchor="middle" font-size="9" fill="#059669" font-weight="600">Gets: Lamp</text>
            </g>

            <!-- Node B: Priya (Right) -->
            <g transform="translate(390, 175)">
              <circle cx="0" cy="0" r="34" fill="var(--color-surface)" stroke="#059669" stroke-width="3"/>
              <text x="0" y="-8" text-anchor="middle" font-size="11" font-weight="700" fill="var(--color-text)">User B: Priya</text>
              <text x="0" y="8" text-anchor="middle" font-size="9" fill="var(--color-text-muted)">Gives: Desk Lamp</text>
              <text x="0" y="20" text-anchor="middle" font-size="9" fill="#059669" font-weight="600">Gets: CLRS Book</text>
            </g>

            <!-- Node C: Rohan (Left) -->
            <g transform="translate(150, 175)">
              <circle cx="0" cy="0" r="34" fill="var(--color-surface)" stroke="#059669" stroke-width="3"/>
              <text x="0" y="-8" text-anchor="middle" font-size="11" font-weight="700" fill="var(--color-text)">User C: Rohan</text>
              <text x="0" y="8" text-anchor="middle" font-size="9" fill="var(--color-text-muted)">Gives: CLRS Book</text>
              <text x="0" y="20" text-anchor="middle" font-size="9" fill="#059669" font-weight="600">Gets: Calculator</text>
            </g>

            <!-- Center Solution Badge -->
            <g transform="translate(270, 140)">
              <rect x="-65" y="-14" width="130" height="28" rx="14" fill="#059669"/>
              <text x="0" y="4" text-anchor="middle" font-size="10" font-weight="700" fill="#ffffff">CP-SAT Cycle #14 (14ms)</text>
            </g>
          </svg>
        `;
        showToast(
          "✓ Solved optimal 3-party swap cycle! Value disparity: ₹150 (within 15% tolerance threshold)."
        );
      });
    }

    if (confirmBtnA) {
      confirmBtnA.addEventListener("click", () => {
        state.swap.confirmed.aarav = true;
        confirmBtnA.textContent = "✓ Aarav Confirmed";
        confirmBtnA.disabled = true;
        checkAllConfirmed();
      });
    }

    if (confirmBtnB) {
      confirmBtnB.addEventListener("click", () => {
        state.swap.confirmed.priya = true;
        confirmBtnB.textContent = "✓ Priya Confirmed";
        confirmBtnB.disabled = true;
        checkAllConfirmed();
      });
    }

    if (confirmBtnC) {
      confirmBtnC.addEventListener("click", () => {
        state.swap.confirmed.rohan = true;
        confirmBtnC.textContent = "✓ Rohan Confirmed";
        confirmBtnC.disabled = true;
        checkAllConfirmed();
      });
    }
  }

  // ==========================================
  // Screen 6: Trust & Safety
  // ==========================================
  function initTrustScreen() {
    const verifiedToggle = document.getElementById("trust-slider-verified");
    const tradesSlider = document.getElementById("trust-slider-trades");
    const responseSlider = document.getElementById("trust-slider-response");
    const ratingSlider = document.getElementById("trust-slider-rating");

    const totalScoreDisplay = document.getElementById("trust-total-score");
    const trustTierBadge = document.getElementById("trust-tier-badge");

    const ptsVerified = document.getElementById("trust-pts-verified");
    const ptsTrades = document.getElementById("trust-pts-trades");
    const ptsResponse = document.getElementById("trust-pts-response");
    const ptsRating = document.getElementById("trust-pts-rating");

    function calculateTrust() {
      const V = verifiedToggle.checked ? 1 : 0;
      const trades = parseInt(tradesSlider.value, 10);
      const R = parseFloat(responseSlider.value);
      const rating = parseFloat(ratingSlider.value);

      // Formula from PRD §5.1 / ML_SPEC §8:
      // T = 100 * (0.25*V + 0.30*ln(1+trades)/ln(51) + 0.15*R + 0.30*rating/5)
      const partV = 0.25 * V;
      const partTrades = 0.3 * (Math.log(1 + trades) / Math.log(51));
      const partR = 0.15 * R;
      const partRating = 0.3 * (rating / 5.0);

      const total = 100 * (partV + partTrades + partR + partRating);
      const roundedTotal = Math.min(100, Math.max(0, Math.round(total)));

      totalScoreDisplay.textContent = roundedTotal;

      ptsVerified.textContent = `+${(partV * 100).toFixed(1)} pts`;
      ptsTrades.textContent = `+${(partTrades * 100).toFixed(1)} pts`;
      ptsResponse.textContent = `+${(partR * 100).toFixed(1)} pts`;
      ptsRating.textContent = `+${(partRating * 100).toFixed(1)} pts`;

      document.getElementById("trust-trades-val").textContent = trades;
      document.getElementById("trust-response-val").textContent = `${(R * 100).toFixed(0)}%`;
      document.getElementById("trust-rating-val").textContent = rating.toFixed(1);

      if (roundedTotal >= 85) {
        trustTierBadge.className = "fair-badge great";
        trustTierBadge.textContent = "🌟 Campus Champion (High Trust)";
      } else if (roundedTotal >= 65) {
        trustTierBadge.className = "fair-badge fair";
        trustTierBadge.textContent = "🛡️ Trusted Member";
      } else if (roundedTotal >= 40) {
        trustTierBadge.className = "fair-badge fair";
        trustTierBadge.textContent = "🌱 Regular Trader";
      } else {
        trustTierBadge.className = "fair-badge overpriced";
        trustTierBadge.textContent = "⚠️ New Member / Low Data";
      }
    }

    if (verifiedToggle) verifiedToggle.addEventListener("change", calculateTrust);
    if (tradesSlider) tradesSlider.addEventListener("input", calculateTrust);
    if (responseSlider) responseSlider.addEventListener("input", calculateTrust);
    if (ratingSlider) ratingSlider.addEventListener("input", calculateTrust);

    calculateTrust();

    // Moderation queue buttons
    function appendAuditRow(action, flagId, reason) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const tableBody = document.getElementById("moderation-audit-tbody");
      if (tableBody) {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${timeStr}</td>
          <td><strong>Human Moderator</strong></td>
          <td><span class="fair-badge ${
            action === "Dismissed" ? "fair" : "overpriced"
          }">${action}</span></td>
          <td>${flagId}</td>
          <td>${reason}</td>
        `;
        tableBody.insertBefore(row, tableBody.firstChild);
      }
    }

    document.querySelectorAll(".mod-action-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const flagCard = btn.closest(".mod-flag-card");
        const flagId = flagCard.getAttribute("data-flag-id");
        const action = btn.getAttribute("data-action");
        flagCard.style.opacity = "0.5";
        flagCard.style.pointerEvents = "none";

        appendAuditRow(action, flagId, `Moderator clicked ${action}`);
        showToast(`Moderation: ${flagId} marked as ${action} (Audit log updated)`);
      });
    });
  }

  // ==========================================
  // Screen 7: Active Learning Loop
  // ==========================================
  function initLearningScreen() {
    const retrainBtn = document.getElementById("learning-retrain-btn");
    const simulationStatus = document.getElementById("learning-retrain-status");
    const activeModelBadge = document.getElementById("learning-active-model-badge");
    const simulateNoiseToggle = document.getElementById("learning-simulate-noise");

    if (retrainBtn) {
      retrainBtn.addEventListener("click", () => {
        retrainBtn.disabled = true;
        retrainBtn.textContent = "⚙️ Training Candidate Model...";
        simulationStatus.innerHTML = `
          <div style="background-color: var(--color-bg); padding: 12px; border-radius: var(--radius-md); font-size: 0.82rem; border: 1px solid var(--color-border);">
            <p>1. Ingested <strong>${state.correctionsCount} verified seller corrections</strong>.</p>
            <p>2. Fine-tuning linear probe on frozen backbone embeddings...</p>
            <p>3. Evaluating on frozen test set (<code>test_manifest_v1_frozen.parquet</code>, 300 items)...</p>
          </div>
        `;

        setTimeout(() => {
          const withNoise = simulateNoiseToggle && simulateNoiseToggle.checked;
          const candidateAcc = withNoise ? 84.8 : 88.4;
          const activeAcc = state.learning.activeModel.accuracy;

          if (candidateAcc > activeAcc) {
            state.learning.activeModel.version = "v1.2.0";
            state.learning.activeModel.accuracy = candidateAcc;
            activeModelBadge.textContent = "v1.2.0 (88.4% Top-1 Acc)";
            simulationStatus.innerHTML = `
              <div style="background-color: var(--color-success-bg); color: var(--color-success); padding: 12px; border-radius: var(--radius-md); font-size: 0.84rem;">
                <strong>🎉 Gated Evaluation PASSED: Candidate Promoted!</strong>
                <p style="margin-top: 4px;">Candidate accuracy <strong>${candidateAcc}%</strong> beats active model <strong>${activeAcc}%</strong> by +${(
                  candidateAcc - activeAcc
                ).toFixed(1)}%.</p>
                <p style="font-size: 0.78rem; margin-top: 4px; color: var(--color-text);">Exported ONNX runtime artifact: <code>loop_cat_v1.2.0.onnx</code>. Rollback snapshot saved.</p>
              </div>
            `;
            showToast("✓ Retraining complete: Model promoted to v1.2.0!");
          } else {
            simulationStatus.innerHTML = `
              <div style="background-color: var(--color-danger-bg); color: var(--color-danger); padding: 12px; border-radius: var(--radius-md); font-size: 0.84rem;">
                <strong>❌ Gated Evaluation FAILED: Candidate REJECTED</strong>
                <p style="margin-top: 4px;">Candidate accuracy <strong>${candidateAcc}%</strong> failed to beat active model <strong>${activeAcc}%</strong> on frozen test set.</p>
                <p style="font-size: 0.78rem; margin-top: 4px; color: var(--color-text);">Active model <code>v1.1.0</code> retained in production without regression.</p>
              </div>
            `;
            showToast("Candidate rejected: Failed frozen test set threshold.");
          }

          retrainBtn.disabled = false;
          retrainBtn.textContent = "Run Candidate Retraining Simulation";
        }, 1200);
      });
    }

    // Add simulated corrections button
    const addCorrectionsBtn = document.getElementById("learning-add-corrections-btn");
    if (addCorrectionsBtn) {
      addCorrectionsBtn.addEventListener("click", () => {
        updateCorrectionsBadge(5, "Batch of 5 verified seller corrections ingested");
      });
    }
  }

  // ==========================================
  // Screen 8: Simulator & Price-Drop
  // ==========================================
  function initSimulatorScreen() {
    const userSlider = document.getElementById("sim-users-slider");
    const userDisplay = document.getElementById("sim-users-display");
    const listingsDisplay = document.getElementById("sim-metric-listings");
    const swapRateDisplay = document.getElementById("sim-metric-swap-rate");
    const solveTimeDisplay = document.getElementById("sim-metric-solve-time");
    const fraudRateDisplay = document.getElementById("sim-metric-fraud");

    function updateSim() {
      const u = parseInt(userSlider.value, 10);
      state.simulator.users = u;
      userDisplay.textContent = u.toLocaleString("en-IN");

      const listings = Math.round(u * 1.25);
      listingsDisplay.textContent = listings.toLocaleString("en-IN");

      // Swap matching rate scales with density: ~18% at 100 users, up to ~44% at 10,000 users
      const matchRate = (18 + (26 * (Math.log10(u) - 2)) / 2).toFixed(1);
      swapRateDisplay.textContent = `${matchRate}%`;

      // Solve time in ms: ~12ms at 100 users, ~340ms at 10,000 users
      const solveMs = Math.round(10 + 0.033 * u);
      solveTimeDisplay.textContent = `${solveMs} ms`;

      fraudRateDisplay.textContent = "93.4%";
    }

    if (userSlider) {
      userSlider.addEventListener("input", updateSim);
      updateSim();
    }

    // Price-drop suggestion card logic
    const ageSlider = document.getElementById("price-drop-age-slider");
    const viewsSlider = document.getElementById("price-drop-views-slider");
    const ageDisplay = document.getElementById("price-drop-age-val");
    const viewsDisplay = document.getElementById("price-drop-views-val");
    const adviceBox = document.getElementById("price-drop-advice-box");
    const applyDropBtn = document.getElementById("price-drop-apply-btn");

    function updatePriceDropLogic() {
      const age = parseInt(ageSlider.value, 10);
      const views = parseInt(viewsSlider.value, 10);
      ageDisplay.textContent = `${age} days`;
      viewsDisplay.textContent = views;

      if (age < 7) {
        adviceBox.innerHTML = `
          <div style="background-color: var(--color-bg); padding: 12px; border-radius: var(--radius-md); font-size: 0.84rem; border: 1px solid var(--color-border);">
            <strong>Listing is fresh (${age} days old).</strong>
            <p style="margin-top: 4px; color: var(--color-text-muted);">No price drop recommended yet. Standard discovery window is 7 days. Keep asking price at ₹${state.simulator.currentAsk}.</p>
          </div>
        `;
        applyDropBtn.disabled = true;
      } else {
        // Drop recommendation: 15% max per step, bounded by price floor of 1800
        const maxDrop = state.simulator.currentAsk * 0.15;
        const targetPrice = Math.max(
          state.simulator.priceFloor,
          Math.round((state.simulator.currentAsk - maxDrop) / 50) * 50
        );
        const dropPct = Math.round(
          ((state.simulator.currentAsk - targetPrice) / state.simulator.currentAsk) * 100
        );

        adviceBox.innerHTML = `
          <div style="background-color: var(--color-warning-bg); color: #78350f; padding: 12px; border-radius: var(--radius-md); font-size: 0.84rem; border: 1px solid #fde047;">
            <strong>No offers in ${age} days (${views} views).</strong>
            <p style="margin-top: 4px;">Dropping ask price from <strong>₹${state.simulator.currentAsk}</strong> to <strong>₹${targetPrice}</strong> (-${dropPct}%, above ₹1,800 floor) raises the estimated chance of sale within 7 days by <strong>+38%</strong>.</p>
            <p style="font-size: 0.74rem; color: #92400e; margin-top: 4px;">Heuristic constraint: 15% cap per step strictly enforced.</p>
          </div>
        `;
        applyDropBtn.disabled = false;
        applyDropBtn._targetPrice = targetPrice;
      }
    }

    if (ageSlider && viewsSlider) {
      ageSlider.addEventListener("input", updatePriceDropLogic);
      viewsSlider.addEventListener("input", updatePriceDropLogic);
      updatePriceDropLogic();
    }

    if (applyDropBtn) {
      applyDropBtn.addEventListener("click", () => {
        if (applyDropBtn._targetPrice) {
          state.simulator.currentAsk = applyDropBtn._targetPrice;
          showToast(`✓ Price drop applied: Asking price updated to ₹${state.simulator.currentAsk}`);
          updatePriceDropLogic();
        }
      });
    }
  }

  // ==========================================
  // Screen 9: Impact Dashboard
  // ==========================================
  function initImpactScreen() {
    const coeffPills = document.querySelectorAll(".impact-coeff-pill");
    const totalCo2 = document.getElementById("impact-total-co2");
    const totalEwaste = document.getElementById("impact-total-ewaste");
    const co2Equiv = document.getElementById("impact-co2-equiv");

    function updateImpact() {
      const c = state.impact.replacementRate;
      // Base values at 1.0 replacement:
      // CO2: ~4,275 kg, E-waste: ~602 kg
      const co2 = Math.round(4275 * c);
      const ewaste = Math.round(602 * c);
      const carKm = Math.round(co2 * 4.15); // ~4.15 km per kg CO2 for average car

      if (totalCo2) totalCo2.textContent = `${co2.toLocaleString("en-IN")} kg eq`;
      if (totalEwaste) totalEwaste.textContent = `${ewaste.toLocaleString("en-IN")} kg`;
      if (co2Equiv)
        co2Equiv.textContent = `Equivalent to ~${carKm.toLocaleString(
          "en-IN"
        )} km driven in an average petrol car.`;
    }

    coeffPills.forEach((pill) => {
      pill.addEventListener("click", () => {
        coeffPills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        state.impact.replacementRate = parseFloat(pill.getAttribute("data-coeff"));
        updateImpact();
        showToast(
          `Sensitivity coefficient set to ${state.impact.replacementRate} replacement rate`
        );
      });
    });

    updateImpact();
  }

  // ==========================================
  // Screen 10: Admin & Model Health
  // ==========================================
  function initAdminScreen() {
    renderBackendTables();

    // Tab switching between Mails and Users
    const tabMails = document.getElementById("btn-tab-backend-mails");
    const tabUsers = document.getElementById("btn-tab-backend-users");
    const viewMails = document.getElementById("view-backend-mails");
    const viewUsers = document.getElementById("view-backend-users");

    if (tabMails && tabUsers && viewMails && viewUsers) {
      tabMails.addEventListener("click", () => {
        tabMails.classList.add("active");
        tabUsers.classList.remove("active");
        viewMails.style.display = "block";
        viewUsers.style.display = "none";
      });

      tabUsers.addEventListener("click", () => {
        tabUsers.classList.add("active");
        tabMails.classList.remove("active");
        viewMails.style.display = "none";
        viewUsers.style.display = "block";
      });
    }

    // Quick Test Email button
    const btnPing = document.getElementById("btn-backend-quick-ping");
    if (btnPing) {
      btnPing.addEventListener("click", () => {
        sendOutboxMailToBackend(
          "student.demo@adypu.edu.in",
          "[LOOP Test] Live Backend SMTP Delivery Test",
          "Test Ping",
          `<div style="font-family: sans-serif; line-height: 1.5;">
            <h3 style="color: #059669; margin-top: 0;">Backend Mail Dispatch Successful</h3>
            <p>This email proves that transactional notifications, password reset links, and community verification tokens are correctly logged and queued in the backend outbox.</p>
            <p style="font-size: 0.8rem; color: #64748b;">Protocol: Simulated SMTP / SES TLS 1.3 &bull; Latency: 42ms</p>
          </div>`
        );
        showToast("Test email dispatched to backend outbox!");
      });
    }

    // Modal Close buttons
    const btnCloseModal = document.getElementById("btn-close-email-modal");
    const btnModalDone = document.getElementById("btn-modal-done");
    const modalBackdrop = document.getElementById("email-preview-modal");

    if (btnCloseModal) btnCloseModal.addEventListener("click", closeEmailPreviewModal);
    if (btnModalDone) btnModalDone.addEventListener("click", closeEmailPreviewModal);
    if (modalBackdrop) {
      modalBackdrop.addEventListener("click", (e) => {
        if (e.target === modalBackdrop) closeEmailPreviewModal();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modalBackdrop && !modalBackdrop.classList.contains("hidden")) {
        closeEmailPreviewModal();
      }
    });

    // Header Backend Button
    const headerBackendBtn = document.getElementById("header-backend-btn");
    if (headerBackendBtn) {
      headerBackendBtn.addEventListener("click", () => {
        navigateTo("admin");
        const sec = document.getElementById("admin-backend-section");
        if (sec) sec.scrollIntoView({ behavior: "smooth" });
        showToast("Inspecting live Backend Datastore & Mail Outbox");
      });
    }
  }

  // ==========================================
  // Authentication & Simulated Sign-In Gate
  // ==========================================
  const authFlow = {
    mode: "signin", // 'signin' or 'create'
    activeTab: "email", // 'email' or 'phone'
    pendingIdentifier: null,
    pendingVerified: false,
    otpCode: "482916",
    otpAttempts: 0,
    otpLockout: false,
    timerInterval: null,
    secondsLeft: 30,
  };

  function getDemoSession() {
    try {
      const data = sessionStorage.getItem("loop_demo_session");
      if (!data) {
        const defaultSession = {
          authenticated: true,
          identifier: "a***@adypu.edu.in",
          verified: true,
        };
        sessionStorage.setItem("loop_demo_session", JSON.stringify(defaultSession));
        return defaultSession;
      }
      return JSON.parse(data);
    } catch (e) {
      return {
        authenticated: true,
        identifier: "a***@adypu.edu.in",
        verified: true,
      };
    }
  }

  function setDemoSession(session) {
    try {
      sessionStorage.setItem("loop_demo_session", JSON.stringify(session));
    } catch (e) {}
  }

  function clearDemoSession() {
    try {
      sessionStorage.removeItem("loop_demo_session");
    } catch (e) {}
  }

  function maskEmail(email) {
    const parts = (email || "").trim().split("@");
    if (parts.length !== 2) return "u***@campus.internal";
    const name = parts[0];
    const domain = parts[1];
    const firstChar = name.length > 0 ? name[0] : "u";
    return `${firstChar}***@${domain}`;
  }

  function maskPhone(phone) {
    const digits = (phone || "").replace(/\D/g, "");
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 2)}****${digits.slice(-2)}`;
    }
    return "+91 98****10";
  }

  function updateDashboardUserChip(session) {
    const chipId = document.getElementById("user-chip-id");
    const chipBadge = document.getElementById("user-chip-badge");
    if (chipId) {
      chipId.textContent = session.identifier || "user@demo";
    }
    if (chipBadge) {
      if (session.verified) {
        chipBadge.className = "verify-badge verified";
        chipBadge.textContent = "Verified";
      } else {
        chipBadge.className = "verify-badge unverified";
        chipBadge.textContent = "Unverified";
      }
    }
  }

  function showAuthStep(stepName) {
    const stepLogin = document.getElementById("auth-step-login");
    const stepCommunity = document.getElementById("auth-step-community");
    const stepConsent = document.getElementById("auth-step-consent");

    if (stepLogin) stepLogin.style.display = stepName === "login" ? "block" : "none";
    if (stepCommunity) stepCommunity.style.display = stepName === "community" ? "block" : "none";
    if (stepConsent) stepConsent.style.display = stepName === "consent" ? "block" : "none";
  }

  function setAuthGateVisible(isAuthView) {
    const authView = document.getElementById("auth-view");
    const dashView = document.getElementById("dashboard-view");
    if (isAuthView) {
      if (authView) authView.classList.remove("hidden");
      if (dashView) dashView.classList.add("hidden");
      showAuthStep("login");
    } else {
      if (authView) authView.classList.add("hidden");
      if (dashView) dashView.classList.remove("hidden");
    }
  }

  function resetPlatformState() {
    closeEmailPreviewModal();

    // 1. Reset Snap-to-List
    state.snap.title = state.snap.initialDraft.title;
    state.snap.category = state.snap.initialDraft.category;
    state.snap.subtype = state.snap.initialDraft.subtype;
    state.snap.brand = state.snap.initialDraft.brand;
    state.snap.condition = state.snap.initialDraft.condition;
    state.snap.price = state.snap.initialDraft.price;
    state.snap.scrubbed = true;
    state.snap.showHeatmap = false;

    const snapTitle = document.getElementById("snap-title");
    if (snapTitle) snapTitle.value = state.snap.initialDraft.title;
    const snapCategory = document.getElementById("snap-category");
    if (snapCategory) snapCategory.value = state.snap.initialDraft.category;
    const snapSubtype = document.getElementById("snap-subtype");
    if (snapSubtype) snapSubtype.value = state.snap.initialDraft.subtype;
    const snapBrand = document.getElementById("snap-brand");
    if (snapBrand) snapBrand.value = state.snap.initialDraft.brand;
    const snapCondition = document.getElementById("snap-condition");
    if (snapCondition) snapCondition.value = state.snap.initialDraft.condition;
    const snapSlider = document.getElementById("snap-price-slider");
    if (snapSlider) {
      snapSlider.value = state.snap.initialDraft.price;
      const snapDisplay = document.getElementById("snap-price-display");
      if (snapDisplay)
        snapDisplay.textContent = `₹${state.snap.initialDraft.price.toLocaleString("en-IN")}`;
    }
    const snapScrubToggle = document.getElementById("snap-scrub-toggle");
    if (snapScrubToggle) {
      snapScrubToggle.checked = true;
      snapScrubToggle.dispatchEvent(new Event("change"));
    }
    const snapHeatmapToggle = document.getElementById("snap-heatmap-toggle");
    if (snapHeatmapToggle) {
      snapHeatmapToggle.checked = false;
      snapHeatmapToggle.dispatchEvent(new Event("change"));
    }

    const visBox = document.getElementById("visual-search-similar-box");
    if (visBox) visBox.classList.add("hidden");

    // 2. Reset Discover Search and Filters
    state.search.query = "study table under 3000";
    state.search.mode = "semantic";
    state.search.category = "all";
    state.search.priceCeiling = Infinity;
    state.search.condition = "all";
    state.search.maxDistance = Infinity;
    state.search.displayCount = 12;

    const discInput = document.getElementById("discover-search-input");
    if (discInput) discInput.value = "study table under 3000";
    const topSearchInput = document.getElementById("top-search-input");
    if (topSearchInput) topSearchInput.value = "study table under 3000";

    document.querySelectorAll(".discover-filter-card .filter-chip").forEach((chip) => {
      if (chip.getAttribute("data-val") === "all") {
        chip.classList.add("active");
      } else {
        chip.classList.remove("active");
      }
    });

    const sSemantic = document.getElementById("search-mode-semantic");
    const sFts = document.getElementById("search-mode-fts");
    if (sSemantic && sFts) {
      sSemantic.classList.add("active");
      sFts.classList.remove("active");
    }
    closeListingDetailModal();
    if (window.LOOP && window.LOOP.closeDrawer) {
      window.LOOP.closeDrawer();
    }
    const discBtn = document.getElementById("discover-search-btn");
    if (discBtn) discBtn.click();

    // 3. Reset Chat & Handover
    state.chat.buyerConfirmed = false;
    state.chat.sellerConfirmed = false;
    state.chat.handoverCompleted = false;
    state.chat.reviewSubmitted = false;

    const chatInput = document.getElementById("chat-input-text");
    if (chatInput) chatInput.value = "";
    const scamBanner = document.getElementById("chat-scam-banner");
    if (scamBanner) scamBanner.style.display = "none";

    const msgBox = document.getElementById("chat-messages-box");
    if (msgBox) {
      msgBox.innerHTML = `
        <div class="chat-bubble buyer">
          <div>Hi! Is this desk still available at the hostel?</div>
          <span class="bubble-meta">Buyer (Aarav) &bull; 10:14 AM</span>
        </div>
        <div class="chat-bubble seller">
          <div>Yes, still available! Pick up from Hostel Block B.</div>
          <span class="bubble-meta">Seller (Priya) &bull; 10:16 AM</span>
        </div>
        <div class="chat-bubble buyer">
          <div>Would you take ₹2,000 for it today?</div>
          <span class="bubble-meta">Buyer (Aarav) &bull; 10:18 AM</span>
        </div>
      `;
    }

    const bConfirm = document.getElementById("handover-buyer-confirm-btn");
    if (bConfirm) {
      bConfirm.disabled = false;
      bConfirm.textContent = "Buyer Confirm Item Received";
      bConfirm.className = "btn btn-secondary btn-sm";
    }
    const sConfirm = document.getElementById("handover-seller-confirm-btn");
    if (sConfirm) {
      sConfirm.disabled = false;
      sConfirm.textContent = "Seller Confirm Handover";
      sConfirm.className = "btn btn-secondary btn-sm";
    }
    const handoverText = document.getElementById("handover-status-text");
    if (handoverText) {
      handoverText.innerHTML = "Waiting for both parties to confirm at meetup (0/2 confirmed)";
      handoverText.style.color = "var(--color-text-muted)";
    }
    const revCard = document.getElementById("handover-review-card");
    if (revCard) {
      revCard.style.display = "none";
      revCard.innerHTML = `
        <div style="font-size: 0.82rem; font-weight: 700; margin-bottom: 6px;">Verified Post-Handover Review:</div>
        <div style="font-size: 0.74rem; color: var(--color-text-muted); margin-bottom: 8px;">Reviews can only be submitted after verified dual-confirmation.</div>
        <div id="handover-stars-wrap" role="radiogroup" aria-label="Rating" style="display: flex; gap: 6px; margin-bottom: 8px; font-size: 1.25rem; cursor: pointer;">
          <button type="button" class="star-rating-btn active" data-rating="1" aria-label="1 star" style="background: none; border: none; padding: 0; font-size: 1.25rem; cursor: pointer;">⭐</button>
          <button type="button" class="star-rating-btn active" data-rating="2" aria-label="2 stars" style="background: none; border: none; padding: 0; font-size: 1.25rem; cursor: pointer;">⭐</button>
          <button type="button" class="star-rating-btn active" data-rating="3" aria-label="3 stars" style="background: none; border: none; padding: 0; font-size: 1.25rem; cursor: pointer;">⭐</button>
          <button type="button" class="star-rating-btn active" data-rating="4" aria-label="4 stars" style="background: none; border: none; padding: 0; font-size: 1.25rem; cursor: pointer;">⭐</button>
          <button type="button" class="star-rating-btn active" data-rating="5" aria-label="5 stars" style="background: none; border: none; padding: 0; font-size: 1.25rem; cursor: pointer;">⭐</button>
          <span id="handover-star-text" style="font-size: 0.82rem; font-weight: 700; color: var(--color-primary); align-self: center; margin-left: 6px;">5.0 / 5.0</span>
        </div>
        <button class="btn btn-primary btn-sm" id="submit-review-btn">Publish Verified Review</button>
      `;
      // Re-bind review events
      const newRevBtn = revCard.querySelector("#submit-review-btn");
      if (newRevBtn) {
        newRevBtn.addEventListener("click", () => {
          if (!state.chat.handoverCompleted) {
            showToast(
              "❌ Review rejected: Reviews can only be submitted after a verified handover (Anti-review-fraud rule)."
            );
            return;
          }
          state.chat.reviewSubmitted = true;
          revCard.innerHTML = `<div style="background-color: var(--color-success-bg); color: var(--color-success); padding: 14px; border-radius: var(--radius-md); text-align: center;"><strong>✓ Review Verified & Published!</strong><p style="font-size: 0.8rem; margin-top: 4px;">Rating (5/5) recorded. Seller trust score updated in realtime.</p></div>`;
          showToast("Verified review submitted successfully!");
        });
      }
    }

    // 4. Reset Swap Screen
    state.swap.calculated = false;
    state.swap.confirmed = { aarav: false, priya: false, rohan: false };

    const swapDiagram = document.getElementById("swap-diagram-container");
    if (swapDiagram) {
      swapDiagram.innerHTML = `
        <div style="text-align: center; color: var(--color-text-muted); padding: 20px;">
          <p style="font-weight: 600;">Click "Find Exchange Cycles" above to solve candidate cycles via CP-SAT.</p>
        </div>
      `;
    }
    const swapStatusBadge = document.getElementById("swap-status-badge");
    if (swapStatusBadge) {
      swapStatusBadge.className = "fair-badge fair";
      swapStatusBadge.innerHTML = "Ready to confirm (0/3)";
    }
    const cA = document.getElementById("swap-confirm-btn-a");
    if (cA) {
      cA.disabled = false;
      cA.textContent = "Aarav: Confirm Swap";
    }
    const cB = document.getElementById("swap-confirm-btn-b");
    if (cB) {
      cB.disabled = false;
      cB.textContent = "Priya: Confirm Swap";
    }
    const cC = document.getElementById("swap-confirm-btn-c");
    if (cC) {
      cC.disabled = false;
      cC.textContent = "Rohan: Confirm Swap";
    }

    // 5. Reset Trust & Safety
    const vt = document.getElementById("trust-slider-verified");
    if (vt) vt.checked = true;
    const tr = document.getElementById("trust-slider-trades");
    if (tr) tr.value = 14;
    const rs = document.getElementById("trust-slider-response");
    if (rs) rs.value = 0.85;
    const rt = document.getElementById("trust-slider-rating");
    if (rt) rt.value = 4.6;
    if (vt) vt.dispatchEvent(new Event("change"));

    document.querySelectorAll(".mod-flag-card").forEach((card) => {
      card.style.opacity = "1";
      card.style.pointerEvents = "auto";
    });

    // 6. Reset Active Learning
    state.learning.activeModel.version = "v1.1.0";
    state.learning.activeModel.accuracy = 86.1;
    const lBadge = document.getElementById("learning-active-model-badge");
    if (lBadge) lBadge.textContent = "v1.1.0 (86.1% Top-1 Acc)";
    const lStatus = document.getElementById("learning-retrain-status");
    if (lStatus) lStatus.innerHTML = "";
    const noiseToggle = document.getElementById("learning-simulate-noise");
    if (noiseToggle) noiseToggle.checked = false;

    // 7. Reset Simulator
    state.simulator.users = 2500;
    state.simulator.listingAge = 8;
    state.simulator.views = 46;
    state.simulator.currentAsk = 2600;
    state.simulator.priceFloor = 1800;

    const simUsers = document.getElementById("sim-users-slider");
    if (simUsers) {
      simUsers.value = 2500;
      simUsers.dispatchEvent(new Event("input"));
    }
    const dropAge = document.getElementById("price-drop-age-slider");
    if (dropAge) {
      dropAge.value = 8;
      dropAge.dispatchEvent(new Event("input"));
    }
    const dropViews = document.getElementById("price-drop-views-slider");
    if (dropViews) {
      dropViews.value = 46;
      dropViews.dispatchEvent(new Event("input"));
    }

    // 8. Reset Impact
    state.impact.replacementRate = 0.8;
    document.querySelectorAll(".impact-coeff-pill").forEach((pill) => {
      if (pill.getAttribute("data-coeff") === "0.8") pill.classList.add("active");
      else pill.classList.remove("active");
    });
    const c1 = document.querySelector(".impact-coeff-pill[data-coeff='0.8']");
    if (c1) c1.click();

    // 9. Reset Corrections count
    state.correctionsCount = 42;
    const cBadge = document.getElementById("nav-corrections-count");
    if (cBadge) cBadge.textContent = "42";
    const kpiCorrections = document.getElementById("overview-kpi-corrections");
    if (kpiCorrections) kpiCorrections.textContent = "42 logged";

    // 10. Reset view to discover
    navigateTo("discover");
  }

  function resetAuthForms() {
    authFlow.mode = "signin";
    authFlow.pendingIdentifier = null;
    authFlow.pendingVerified = false;
    authFlow.otpAttempts = 0;
    authFlow.otpLockout = false;
    clearInterval(authFlow.timerInterval);

    // Reset email fields
    const loginEmail = document.getElementById("login-email");
    const loginPassword = document.getElementById("login-password");
    const loginPasswordConfirm = document.getElementById("login-password-confirm");
    const loginName = document.getElementById("login-name");
    if (loginEmail) loginEmail.value = "";
    if (loginPassword) loginPassword.value = "";
    if (loginPasswordConfirm) loginPasswordConfirm.value = "";
    if (loginName) loginName.value = "";

    // Reset phone fields
    const loginPhone = document.getElementById("login-phone");
    if (loginPhone) {
      loginPhone.value = "";
      loginPhone.disabled = false;
    }
    const sendOtpBtn = document.getElementById("btn-send-otp");
    if (sendOtpBtn) sendOtpBtn.disabled = false;
    const phoneOtpSection = document.getElementById("phone-otp-section");
    if (phoneOtpSection) phoneOtpSection.style.display = "none";
    const lockoutAlert = document.getElementById("otp-lockout-alert");
    if (lockoutAlert) lockoutAlert.style.display = "none";

    const otpBoxes = document.querySelectorAll(".otp-box");
    otpBoxes.forEach((box) => {
      box.value = "";
      box.disabled = false;
    });

    const verifyOtpBtn = document.getElementById("btn-verify-otp");
    if (verifyOtpBtn) verifyOtpBtn.disabled = false;

    // Reset community input
    const communityInput = document.getElementById("community-input");
    if (communityInput) communityInput.value = "";

    // Reset consent checkbox
    const consentCb = document.getElementById("consent-checkbox");
    if (consentCb) consentCb.checked = false;
    const consentBtn = document.getElementById("btn-consent-continue");
    if (consentBtn) consentBtn.disabled = true;

    // Clear all error messages
    document.querySelectorAll(".field-error").forEach((el) => {
      el.textContent = "";
      el.classList.remove("visible");
    });

    // Reset mode UI
    const groupDisplayName = document.getElementById("group-display-name");
    const groupConfirmPassword = document.getElementById("group-confirm-password");
    const btnEmailSubmit = document.getElementById("btn-email-submit");
    const authModePrompt = document.getElementById("auth-mode-prompt");
    const btnToggleAuthMode = document.getElementById("btn-toggle-auth-mode");
    const forgotWrap = document.getElementById("forgot-password-wrap");

    if (groupDisplayName) groupDisplayName.style.display = "none";
    if (groupConfirmPassword) groupConfirmPassword.style.display = "none";
    if (btnEmailSubmit) btnEmailSubmit.textContent = "Sign in";
    if (authModePrompt) authModePrompt.textContent = "Don't have an account?";
    if (btnToggleAuthMode) btnToggleAuthMode.textContent = "Create account";
    if (forgotWrap) forgotWrap.style.display = "block";
  }

  function initAuthGate() {
    const tabEmail = document.getElementById("tab-email");
    const tabPhone = document.getElementById("tab-phone");
    const panelEmail = document.getElementById("panel-email");
    const panelPhone = document.getElementById("panel-phone");

    function switchAuthTab(targetTab) {
      authFlow.activeTab = targetTab;
      if (targetTab === "email") {
        tabEmail.setAttribute("aria-selected", "true");
        tabEmail.tabIndex = 0;
        tabPhone.setAttribute("aria-selected", "false");
        tabPhone.tabIndex = -1;
        panelEmail.classList.remove("hidden");
        panelPhone.classList.add("hidden");
      } else {
        tabPhone.setAttribute("aria-selected", "true");
        tabPhone.tabIndex = 0;
        tabEmail.setAttribute("aria-selected", "false");
        tabEmail.tabIndex = -1;
        panelPhone.classList.remove("hidden");
        panelEmail.classList.add("hidden");
      }
    }

    if (tabEmail && tabPhone) {
      tabEmail.addEventListener("click", () => switchAuthTab("email"));
      tabPhone.addEventListener("click", () => switchAuthTab("phone"));

      // Keyboard navigation between tabs
      [tabEmail, tabPhone].forEach((tab) => {
        tab.addEventListener("keydown", (e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const nextTab = tab === tabEmail ? "phone" : "email";
            switchAuthTab(nextTab);
            const targetEl = nextTab === "email" ? tabEmail : tabPhone;
            targetEl.focus();
          } else if (e.key === "Home") {
            e.preventDefault();
            switchAuthTab("email");
            tabEmail.focus();
          } else if (e.key === "End") {
            e.preventDefault();
            switchAuthTab("phone");
            tabPhone.focus();
          }
        });
      });
    }

    // Toggle between Sign In and Create Account
    const btnToggleAuthMode = document.getElementById("btn-toggle-auth-mode");
    const groupDisplayName = document.getElementById("group-display-name");
    const groupConfirmPassword = document.getElementById("group-confirm-password");
    const btnEmailSubmit = document.getElementById("btn-email-submit");
    const authModePrompt = document.getElementById("auth-mode-prompt");
    const forgotWrap = document.getElementById("forgot-password-wrap");

    if (btnToggleAuthMode) {
      btnToggleAuthMode.addEventListener("click", () => {
        if (authFlow.mode === "signin") {
          authFlow.mode = "create";
          groupDisplayName.style.display = "block";
          groupConfirmPassword.style.display = "block";
          btnEmailSubmit.textContent = "Create account";
          authModePrompt.textContent = "Already have an account?";
          btnToggleAuthMode.textContent = "Sign in";
          if (forgotWrap) forgotWrap.style.display = "none";
        } else {
          authFlow.mode = "signin";
          groupDisplayName.style.display = "none";
          groupConfirmPassword.style.display = "none";
          btnEmailSubmit.textContent = "Sign in";
          authModePrompt.textContent = "Don't have an account?";
          btnToggleAuthMode.textContent = "Create account";
          if (forgotWrap) forgotWrap.style.display = "block";
        }
      });
    }

    // Password Show/Hide toggle
    const btnTogglePassword = document.getElementById("btn-toggle-password");
    const loginPassword = document.getElementById("login-password");
    const loginPasswordConfirm = document.getElementById("login-password-confirm");

    if (btnTogglePassword && loginPassword) {
      btnTogglePassword.addEventListener("click", () => {
        const isPassword = loginPassword.type === "password";
        loginPassword.type = isPassword ? "text" : "password";
        if (loginPasswordConfirm) loginPasswordConfirm.type = isPassword ? "text" : "password";
        btnTogglePassword.textContent = isPassword ? "🙈 Hide" : "👁️ Show";
        btnTogglePassword.setAttribute(
          "aria-label",
          isPassword ? "Hide password" : "Show password"
        );
        btnTogglePassword.setAttribute("aria-pressed", isPassword ? "true" : "false");
      });
    }

    // Forgot password link
    const btnForgotPassword = document.getElementById("btn-forgot-password");
    const forgotNotice = document.getElementById("forgot-password-notice");
    if (btnForgotPassword && forgotNotice) {
      btnForgotPassword.addEventListener("click", () => {
        const emailVal =
          document.getElementById("login-email").value.trim() || "student@adypu.edu.in";
        forgotNotice.textContent = `✓ Simulated reset link sent to ${emailVal}. Check your inbox.`;
        forgotNotice.classList.add("visible");

        saveUserEmailToBackend(emailVal, "Password Recovery");
        sendOutboxMailToBackend(
          emailVal,
          "[LOOP Security] Reset Your Password",
          "Password Reset",
          `<div style="font-family: sans-serif; line-height: 1.5;">
            <h3 style="color: #059669; margin-top: 0;">Password Reset Request</h3>
            <p>Hi,</p>
            <p>A password reset was requested for your LOOP account associated with <strong>${emailVal}</strong>.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin: 16px 0; word-break: break-all;">
              <span style="font-size: 0.78rem; color: #64748b;">Security Reset Token Link:</span><br>
              <code style="color: #0284c7; font-size: 0.85rem;">https://loop.campus.internal/auth/reset?token=tok_sec_${Date.now().toString(
                36
              )}</code>
            </div>
            <p style="font-size: 0.8rem; color: #64748b;">If you did not request this, please disregard this email. The link expires in 15 minutes.</p>
          </div>`
        );
        showToast(`Password reset link saved to backend outbox for ${emailVal}`);
      });
    }

    // Email Form Submission
    const formEmail = document.getElementById("form-email-auth");
    if (formEmail) {
      formEmail.addEventListener("submit", (e) => {
        e.preventDefault();
        const emailInput = document.getElementById("login-email");
        const passInput = document.getElementById("login-password");
        const emailErr = document.getElementById("login-email-error");
        const passErr = document.getElementById("login-password-error");
        const nameErr = document.getElementById("login-name-error");
        const confirmErr = document.getElementById("login-confirm-error");

        let isValid = true;
        emailErr.textContent = "";
        emailErr.classList.remove("visible");
        passErr.textContent = "";
        passErr.classList.remove("visible");
        if (nameErr) {
          nameErr.textContent = "";
          nameErr.classList.remove("visible");
        }
        if (confirmErr) {
          confirmErr.textContent = "";
          confirmErr.classList.remove("visible");
        }

        const email = emailInput.value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          emailErr.textContent = "Please enter a valid email address (e.g. name@adypu.edu.in).";
          emailErr.classList.add("visible");
          isValid = false;
        }

        const password = passInput.value;
        if (!password || password.length < 8) {
          passErr.textContent = "Password must be at least 8 characters.";
          passErr.classList.add("visible");
          isValid = false;
        }

        if (authFlow.mode === "create") {
          const name = document.getElementById("login-name").value.trim();
          if (!name) {
            nameErr.textContent = "Please enter your name.";
            nameErr.classList.add("visible");
            isValid = false;
          }

          const confirmPass = document.getElementById("login-password-confirm").value;
          if (confirmPass !== password) {
            confirmErr.textContent = "Passwords do not match.";
            confirmErr.classList.add("visible");
            isValid = false;
          }
        }

        if (isValid) {
          authFlow.pendingIdentifier = maskEmail(email);
          const isNew = authFlow.mode === "create";
          saveUserEmailToBackend(email, isNew ? "Student Trader (New)" : "Student Trader");

          if (isNew) {
            sendOutboxMailToBackend(
              email,
              "[LOOP] Welcome to Campus Marketplace & Verify Account",
              "Account Verification",
              `<div style="font-family: sans-serif; line-height: 1.5;">
                <h3 style="color: #059669; margin-top: 0;">Welcome to LOOP, ${email}!</h3>
                <p>Your campus trading account has been registered on the <strong>ADYPU Campus Network</strong>.</p>
                <p>To finish setting up your verified trust badge, please confirm your college email below:</p>
                <div style="margin: 18px 0;">
                  <span style="background: #059669; color: white; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 0.85rem;">Verify College Email</span>
                </div>
                <p style="font-size: 0.8rem; color: #64748b;">Token: <code>sec_usr_${Date.now().toString(
                  36
                )}</code> &bull; Valid for 24 hours</p>
              </div>`
            );
            showToast("Account saved to backend! Verification email queued in outbox.");
          } else {
            showToast("Signed in! Email registered in backend store.");
          }

          showAuthStep("community");
        }
      });
    }

    // Phone OTP Flow
    const btnSendOtp = document.getElementById("btn-send-otp");
    const loginPhone = document.getElementById("login-phone");
    const phoneErr = document.getElementById("login-phone-error");
    const phoneOtpSection = document.getElementById("phone-otp-section");
    const otpTimerText = document.getElementById("otp-timer-text");
    const btnResendOtp = document.getElementById("btn-resend-otp");
    const otpBoxes = document.querySelectorAll(".otp-box");
    const otpErr = document.getElementById("login-otp-error");
    const btnVerifyOtp = document.getElementById("btn-verify-otp");
    const otpLockoutAlert = document.getElementById("otp-lockout-alert");

    function startOtpTimer() {
      clearInterval(authFlow.timerInterval);
      authFlow.secondsLeft = 30;
      if (btnResendOtp) btnResendOtp.disabled = true;
      if (otpTimerText) otpTimerText.textContent = `Resend in ${authFlow.secondsLeft}s`;

      authFlow.timerInterval = setInterval(() => {
        authFlow.secondsLeft--;
        if (authFlow.secondsLeft <= 0) {
          clearInterval(authFlow.timerInterval);
          if (otpTimerText) otpTimerText.textContent = "You can now resend OTP";
          if (btnResendOtp && !authFlow.otpLockout) btnResendOtp.disabled = false;
        } else {
          if (otpTimerText) otpTimerText.textContent = `Resend in ${authFlow.secondsLeft}s`;
        }
      }, 1000);
    }

    if (btnSendOtp && loginPhone) {
      btnSendOtp.addEventListener("click", () => {
        phoneErr.textContent = "";
        phoneErr.classList.remove("visible");

        const phoneVal = loginPhone.value.trim();
        if (!/^[6-9]\d{9}$/.test(phoneVal)) {
          phoneErr.textContent =
            "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.";
          phoneErr.classList.add("visible");
          return;
        }

        loginPhone.disabled = true;
        btnSendOtp.disabled = true;
        phoneOtpSection.style.display = "block";
        otpBoxes.forEach((b) => (b.value = ""));
        if (otpBoxes[0]) otpBoxes[0].focus();
        startOtpTimer();
      });
    }

    // OTP Input Boxes: Auto-advance, backspace navigation, paste support
    otpBoxes.forEach((box, index) => {
      box.addEventListener("input", (e) => {
        const val = e.target.value.replace(/\D/g, "");
        box.value = val ? val[0] : "";
        if (box.value && index < otpBoxes.length - 1) {
          otpBoxes[index + 1].focus();
        }
      });

      box.addEventListener("keydown", (e) => {
        if (e.key === "Backspace") {
          if (!box.value && index > 0) {
            otpBoxes[index - 1].focus();
          }
        }
      });

      box.addEventListener("paste", (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData("text");
        const digits = pasted.replace(/\D/g, "").slice(0, 6);
        digits.split("").forEach((d, idx) => {
          if (otpBoxes[idx]) otpBoxes[idx].value = d;
        });
        const focusIdx = Math.min(digits.length, otpBoxes.length - 1);
        if (otpBoxes[focusIdx]) otpBoxes[focusIdx].focus();
      });
    });

    if (btnResendOtp) {
      btnResendOtp.addEventListener("click", () => {
        if (authFlow.otpLockout) return;
        otpBoxes.forEach((b) => (b.value = ""));
        otpErr.textContent = "";
        otpErr.classList.remove("visible");
        startOtpTimer();
        if (otpBoxes[0]) otpBoxes[0].focus();
        showToast("Demo OTP resent: 482916");
      });
    }

    // Verify OTP Button
    if (btnVerifyOtp) {
      btnVerifyOtp.addEventListener("click", () => {
        if (authFlow.otpLockout) return;

        otpErr.textContent = "";
        otpErr.classList.remove("visible");

        let enteredOtp = "";
        otpBoxes.forEach((b) => (enteredOtp += b.value));

        if (enteredOtp.length !== 6) {
          otpErr.textContent = "Please enter all 6 digits of the OTP.";
          otpErr.classList.add("visible");
          return;
        }

        if (enteredOtp === authFlow.otpCode) {
          authFlow.pendingIdentifier = maskPhone(loginPhone.value);
          clearInterval(authFlow.timerInterval);
          showAuthStep("community");
        } else {
          authFlow.otpAttempts++;
          if (authFlow.otpAttempts >= 5) {
            authFlow.otpLockout = true;
            clearInterval(authFlow.timerInterval);
            otpBoxes.forEach((b) => (b.disabled = true));
            btnVerifyOtp.disabled = true;
            btnResendOtp.disabled = true;
            if (otpLockoutAlert) otpLockoutAlert.style.display = "block";
            otpErr.textContent = "";
            otpErr.classList.remove("visible");
          } else {
            otpErr.textContent = `Invalid OTP. Enter demo code 482916. (Attempt ${authFlow.otpAttempts}/5)`;
            otpErr.classList.add("visible");
          }
        }
      });
    }

    // Community Step
    const btnVerifyCommunity = document.getElementById("btn-verify-community");
    const btnSkipCommunity = document.getElementById("btn-skip-community");
    const communityInput = document.getElementById("community-input");
    const communityErr = document.getElementById("community-error");

    if (btnVerifyCommunity) {
      btnVerifyCommunity.addEventListener("click", () => {
        const val = (communityInput ? communityInput.value : "").trim().toLowerCase();
        if (val.endsWith("@adypu.edu.in") || val === "demo-2026") {
          authFlow.pendingVerified = true;
          communityErr.textContent = "";
          communityErr.classList.remove("visible");
          showToast("✓ Campus community verified! (Verified Badge Earned)");
          showAuthStep("consent");
        } else {
          communityErr.textContent =
            "Invalid code. Enter demo code DEMO-2026 or an @adypu.edu.in email, or click 'Skip for now'.";
          communityErr.classList.add("visible");
        }
      });
    }

    if (btnSkipCommunity) {
      btnSkipCommunity.addEventListener("click", () => {
        authFlow.pendingVerified = false;
        communityErr.textContent = "";
        communityErr.classList.remove("visible");
        showToast("Community verification skipped (Unverified status).");
        showAuthStep("consent");
      });
    }

    // Consent Step
    const consentCb = document.getElementById("consent-checkbox");
    const btnConsentContinue = document.getElementById("btn-consent-continue");

    if (consentCb && btnConsentContinue) {
      consentCb.addEventListener("change", () => {
        btnConsentContinue.disabled = !consentCb.checked;
      });

      btnConsentContinue.addEventListener("click", () => {
        if (!consentCb.checked) return;

        const session = {
          authenticated: true,
          identifier: authFlow.pendingIdentifier || "user@adypu.edu.in",
          verified: !!authFlow.pendingVerified,
        };

        setDemoSession(session);
        updateDashboardUserChip(session);
        setAuthGateVisible(false);
        navigateTo("discover");
        showToast(`Welcome to LOOP, ${session.identifier}!`);
      });
    }

    // Dashboard Sign-out Button
    const btnSignOut = document.getElementById("btn-sign-out");
    if (btnSignOut) {
      btnSignOut.addEventListener("click", () => {
        clearDemoSession();
        resetPlatformState();
        resetAuthForms();
        setAuthGateVisible(true);
        showToast("Signed out of demo session.");
      });
    }

    // Check existing demo session
    const existing = getDemoSession();
    if (existing && existing.authenticated) {
      updateDashboardUserChip(existing);
      setAuthGateVisible(false);
    } else {
      setAuthGateVisible(true);
    }
  }

  // Helper for cross-screen chat and discover opening
  window.LOOP = {
    navigateToDiscover: function (category) {
      navigateTo("discover");
      const searchInput = document.getElementById("discover-search-input");
      if (searchInput) searchInput.value = "";
      const topSearchInput = document.getElementById("top-search-input");
      if (topSearchInput) topSearchInput.value = "";
      state.search.query = "";
      state.search.category = category || "all";
      state.search.displayCount = 12;
      document.querySelectorAll(".discover-filter-card .filter-chip").forEach((chip) => {
        const type = chip.getAttribute("data-filter");
        const val = chip.getAttribute("data-val");
        if (type === "category") {
          if (val === (category || "all")) chip.classList.add("active");
          else chip.classList.remove("active");
        }
      });
      const sBtn = document.getElementById("discover-search-btn");
      if (sBtn) sBtn.click();
      showToast("Exploring full campus catalog (1,248 simulated listings)");
    },
    openChatWithItem: function (itemTitle, itemPrice) {
      navigateTo("chat");
      const headerItem = document.getElementById("chat-listing-title");
      if (headerItem)
        headerItem.textContent = `${itemTitle} (₹${itemPrice.toLocaleString("en-IN")})`;
      showToast(`Switched to active chat context for: ${itemTitle}`);
    },
  };

  // Document Ready Initialization
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();

    // Sidebar navigation clicks
    document.querySelectorAll(".sidebar .nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const screenId = item.getAttribute("data-screen");
        if (screenId) navigateTo(screenId);
      });
    });

    // Mobile nav bar clicks if present
    document.querySelectorAll(".mobile-nav-bar .mobile-nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const screenId = btn.getAttribute("data-screen");
        if (screenId) navigateTo(screenId);
      });
    });

    // Corrections counter header button click
    const headerCorrectionsBtn = document.getElementById("header-corrections-btn");
    if (headerCorrectionsBtn) {
      headerCorrectionsBtn.addEventListener("click", () => {
        navigateTo("learning");
      });
    }

    // Logo click navigates to Discover landing screen
    document.querySelectorAll(".brand-logo").forEach((logo) => {
      logo.addEventListener("click", (e) => {
        e.preventDefault();
        navigateTo("discover");
      });
    });

    window.addEventListener("hashchange", () => {
      const h = window.location.hash.replace("#", "");
      if (h && document.getElementById("screen-" + h)) {
        navigateTo(h);
      }
    });

    // Initialize all screens & interactions
    initOverviewScreen();
    initSnapScreen();
    initDiscoverScreen();
    initChatScreen();
    initSwapScreen();
    initTrustScreen();
    initLearningScreen();
    initSimulatorScreen();
    initImpactScreen();
    initAdminScreen();
    initAuthGate();
    initDrawerNav();
    initListingDetailModalEvents();

    // Check initial hash route (defaults to discover)
    const hash = window.location.hash.replace("#", "");
    if (hash && document.getElementById("screen-" + hash) && hash !== "overview") {
      navigateTo(hash);
    } else {
      navigateTo("discover");
    }
  });
})();
