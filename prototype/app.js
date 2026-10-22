// Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.

/**
 * LOOP Prototype Dashboard Application Logic
 * Pure vanilla JavaScript - no dependencies, no external network requests.
 * All data is simulated for mentor and architectural evaluation.
 */

(function () {
  "use strict";

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

    // Update mobile nav bar
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
  }

  // ==========================================
  // Screen 2: Snap-to-List
  // ==========================================
  function initSnapScreen() {
    const scrubToggle = document.getElementById("snap-scrub-toggle");
    const faceBox = document.getElementById("scrub-box-face");
    const phoneBox = document.getElementById("scrub-box-phone");
    const scrubWarning = document.getElementById("snap-scrub-warning");
    const scrubStatusText = document.getElementById("snap-scrub-status-text");

    function applyScrubberUI() {
      if (state.snap.scrubbed) {
        faceBox.classList.add("blurred");
        faceBox.querySelector(".scrub-label").textContent = "✓ Face: Blurred";
        phoneBox.classList.add("blurred");
        phoneBox.querySelector(".scrub-label").textContent = "✓ Phone: Blurred";
        if (scrubWarning) scrubWarning.style.display = "none";
        if (scrubStatusText) {
          scrubStatusText.textContent = "2 sensitive regions scrubbed client-side";
          scrubStatusText.style.color = "var(--color-success)";
        }
      } else {
        faceBox.classList.remove("blurred");
        faceBox.querySelector(".scrub-label").textContent = "⚠️ Face: Exposed";
        phoneBox.classList.remove("blurred");
        phoneBox.querySelector(".scrub-label").textContent = "⚠️ Phone: Exposed";
        if (scrubWarning) scrubWarning.style.display = "flex";
        if (scrubStatusText) {
          scrubStatusText.textContent = "Scrubber OFF: Image cannot be published";
          scrubStatusText.style.color = "var(--color-danger)";
        }
      }
    }

    if (scrubToggle) {
      scrubToggle.addEventListener("change", (e) => {
        state.snap.scrubbed = e.target.checked;
        applyScrubberUI();
      });
      applyScrubberUI();
    }

    // Heatmap toggle
    const heatmapToggle = document.getElementById("snap-heatmap-toggle");
    const heatmapOverlay = document.getElementById("snap-heatmap-overlay");
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

    // Simulated database of listings
    const mockListings = [
      {
        id: "desk-1",
        title: "Ergonomic Wooden Study Desk with Drawer",
        category: "furniture",
        tags: ["study table", "desk", "mez", "furniture", "drawer"],
        price: 2600,
        distance: "0.4 km - Hostel Block B",
        condition: "Good",
        badge: "Fair Price",
        badgeType: "fair",
        svgType: "table",
      },
      {
        id: "desk-2",
        title: "Compact Foldable Study Table",
        category: "furniture",
        tags: ["study table", "desk", "mez", "foldable", "table"],
        price: 1450,
        distance: "0.6 km - Hostel Block C",
        condition: "Like New",
        badge: "Great Deal",
        badgeType: "great",
        svgType: "table",
      },
      {
        id: "desk-3",
        title: "Solid Teak Wood Executive Desk",
        category: "furniture",
        tags: ["study table", "desk", "mez", "teak", "executive"],
        price: 3800,
        distance: "1.2 km - Faculty Quarters",
        condition: "Fair",
        badge: "Fair Price",
        badgeType: "fair",
        svgType: "table",
      },
      {
        id: "book-1",
        title: "Introduction to Algorithms (CLRS 3rd Edition)",
        category: "books",
        tags: ["clrs", "algorithms", "book", "computer science", "cormen"],
        price: 950,
        distance: "0.2 km - Library Quad",
        condition: "Good",
        badge: "Fair Price",
        badgeType: "fair",
        svgType: "book",
      },
      {
        id: "calc-1",
        title: "Casio FX-991EX ClassWiz Scientific Calculator",
        category: "electronics",
        tags: ["calculator", "scientific", "casio", "classwiz", "maths"],
        price: 1100,
        distance: "0.5 km - Engineering Dept",
        condition: "Like New",
        badge: "Great Deal",
        badgeType: "great",
        svgType: "calc",
      },
      {
        id: "cycle-1",
        title: "Hero Sprint 26T Campus Bicycle",
        category: "hobbies",
        tags: ["cycle", "bicycle", "campus", "bike", "sprint"],
        price: 3200,
        distance: "0.8 km - Sports Complex",
        condition: "Fair",
        badge: "Fair Price",
        badgeType: "fair",
        svgType: "cycle",
      },
    ];

    function getThumbSvg(type) {
      if (type === "table") {
        return `<svg viewBox="0 0 160 90" width="100%" height="100%">
          <rect width="160" height="90" fill="#f1f5f9"/>
          <rect x="25" y="32" width="110" height="10" rx="3" fill="#854d0e"/>
          <rect x="35" y="42" width="8" height="38" fill="#a16207"/>
          <rect x="117" y="42" width="8" height="38" fill="#a16207"/>
          <rect x="75" y="42" width="46" height="20" rx="2" fill="#78350f"/>
          <circle cx="98" cy="52" r="2.5" fill="#fef08a"/>
          <path d="M 40 32 L 50 15 L 60 15 L 50 32 Z" fill="#0284c7" opacity="0.8"/>
        </svg>`;
      } else if (type === "book") {
        return `<svg viewBox="0 0 160 90" width="100%" height="100%">
          <rect width="160" height="90" fill="#f1f5f9"/>
          <rect x="45" y="15" width="70" height="60" rx="4" fill="#0f766e"/>
          <rect x="48" y="18" width="6" height="54" fill="#14b8a6"/>
          <line x1="60" y1="28" x2="105" y2="28" stroke="#ffffff" stroke-width="2.5"/>
          <line x1="60" y1="36" x2="95" y2="36" stroke="#99f6e4" stroke-width="1.5"/>
          <line x1="60" y1="44" x2="85" y2="44" stroke="#99f6e4" stroke-width="1.5"/>
        </svg>`;
      } else if (type === "calc") {
        return `<svg viewBox="0 0 160 90" width="100%" height="100%">
          <rect width="160" height="90" fill="#f1f5f9"/>
          <rect x="55" y="10" width="50" height="70" rx="6" fill="#1e293b"/>
          <rect x="62" y="18" width="36" height="14" rx="2" fill="#84cc16"/>
          <circle cx="68" cy="42" r="3" fill="#cbd5e1"/>
          <circle cx="80" cy="42" r="3" fill="#cbd5e1"/>
          <circle cx="92" cy="42" r="3" fill="#cbd5e1"/>
          <circle cx="68" cy="54" r="3" fill="#cbd5e1"/>
          <circle cx="80" cy="54" r="3" fill="#cbd5e1"/>
          <circle cx="92" cy="54" r="3" fill="#cbd5e1"/>
          <circle cx="68" cy="66" r="3" fill="#f97316"/>
          <circle cx="80" cy="66" r="3" fill="#cbd5e1"/>
          <circle cx="92" cy="66" r="3" fill="#cbd5e1"/>
        </svg>`;
      } else {
        return `<svg viewBox="0 0 160 90" width="100%" height="100%">
          <rect width="160" height="90" fill="#f1f5f9"/>
          <circle cx="50" cy="55" r="18" fill="none" stroke="#334155" stroke-width="4"/>
          <circle cx="110" cy="55" r="18" fill="none" stroke="#334155" stroke-width="4"/>
          <polyline points="50,55 75,32 105,32 110,55" fill="none" stroke="#059669" stroke-width="4"/>
          <line x1="75" y1="32" x2="85" y2="55" stroke="#059669" stroke-width="3"/>
        </svg>`;
      }
    }

    function renderResults() {
      const q = (state.search.query || "").trim().toLowerCase();
      const mode = state.search.mode;

      // Extract price ceiling heuristic (e.g. "under 3000", "< 2500")
      let ceiling = Infinity;
      const underMatch = q.match(/under\s*(\d+)/i) || q.match(/<\s*(\d+)/i);
      if (underMatch) {
        ceiling = parseInt(underMatch[1], 10);
      }

      // Clean query tokens
      let coreQuery = q
        .replace(/under\s*\d+/i, "")
        .replace(/<\s*\d+/i, "")
        .trim();

      // Full text search baseline behavior
      if (mode === "fts") {
        // Postgres FTS baseline: exact keyword match on English dictionary
        // "mez" does not exist in standard English Postgres dictionary -> fails!
        if (coreQuery.includes("mez")) {
          queryExplanation.innerHTML = `
            <div style="background-color: var(--color-danger-bg); color: var(--color-danger); padding: 10px 14px; border-radius: var(--radius-md); font-size: 0.84rem;">
              <strong>❌ Full-Text Baseline Failed:</strong> Postgres <code>to_tsquery('english', '${coreQuery}')</code> returned <strong>0 hits</strong>.
              Postgres lexical stemming cannot map Hinglish/Hindi term <em>"mez"</em> to English term <em>"table / desk"</em>.
            </div>
          `;
          resultsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--color-text-muted);">
              <p style="font-size: 1.1rem; font-weight: 600;">No matching items found via Postgres FTS.</p>
              <p style="font-size: 0.85rem; margin-top: 6px;">Try switching to <strong>Semantic Search</strong> to test multilingual vector matching.</p>
            </div>
          `;
          return;
        }

        // Standard token match
        const tokens = coreQuery.split(/\s+/).filter(Boolean);
        const filtered = mockListings.filter((item) => {
          const matchToken =
            tokens.length === 0 || tokens.some((t) => item.title.toLowerCase().includes(t));
          const matchPrice = item.price <= ceiling;
          return matchToken && matchPrice;
        });

        queryExplanation.innerHTML = `
          <div style="background-color: var(--color-bg); border: 1px solid var(--color-border); padding: 10px 14px; border-radius: var(--radius-md); font-size: 0.82rem;">
            <strong>Postgres FTS Baseline:</strong> Exact tsvector token matches for <code>[${tokens.join(
              ", "
            )}]</code> with SQL filter <code>price &le; ₹${
              ceiling === Infinity ? "any" : ceiling
            }</code>. (Found ${filtered.length} matches).
          </div>
        `;
        displayCards(filtered);
      } else {
        // Semantic search behavior: understands Hinglish, maps "mez" -> "study desk / table"
        let mappedConcept = coreQuery;
        let hinglishMatched = false;
        if (coreQuery.includes("mez")) {
          mappedConcept = coreQuery.replace("mez", "study table/desk");
          hinglishMatched = true;
        }

        const filtered = mockListings.filter((item) => {
          // If searching table or mez
          if (
            coreQuery.includes("table") ||
            coreQuery.includes("desk") ||
            coreQuery.includes("mez")
          ) {
            return item.category === "furniture" && item.price <= ceiling;
          }
          if (
            coreQuery.includes("clrs") ||
            coreQuery.includes("algorithm") ||
            coreQuery.includes("book")
          ) {
            return item.category === "books" && item.price <= ceiling;
          }
          if (coreQuery.includes("calc") || coreQuery.includes("casio")) {
            return item.category === "electronics" && item.price <= ceiling;
          }
          if (coreQuery.includes("cycle") || coreQuery.includes("bike")) {
            return item.category === "hobbies" && item.price <= ceiling;
          }
          return item.price <= ceiling;
        });

        queryExplanation.innerHTML = `
          <div style="background-color: var(--color-primary-light); border: 1px solid var(--color-primary-border); padding: 10px 14px; border-radius: var(--radius-md); font-size: 0.82rem; color: var(--color-text);">
            <strong>✨ Semantic Search (384-d pgvector + SQL Parser):</strong>
            ${
              hinglishMatched
                ? `Mapped Hinglish token <code>"mez"</code> &rarr; <code>"Study Desk / Furniture"</code> (Cosine similarity: 0.89). `
                : ""
            }
            Parsed price ceiling constraint: <code>price &le; ₹${
              ceiling === Infinity ? "None" : ceiling.toLocaleString("en-IN")
            }</code>. (Retrieved ${filtered.length} items).
          </div>
        `;
        displayCards(filtered);
      }
    }

    function displayCards(items) {
      if (items.length === 0) {
        resultsContainer.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--color-text-muted);">
            <p style="font-weight: 600;">No listings match this specific query and price ceiling.</p>
          </div>
        `;
        return;
      }

      resultsContainer.innerHTML = items
        .map(
          (item) => `
        <div class="item-card">
          <div class="item-thumbnail">
            ${getThumbSvg(item.svgType)}
            <span style="position: absolute; top: 8px; right: 8px;" class="fair-badge ${
              item.badgeType
            }">${item.badge}</span>
          </div>
          <div class="item-body">
            <div>
              <h4 class="item-title">${item.title}</h4>
              <p class="item-meta">📍 ${item.distance} &bull; Condition: <strong>${
                item.condition
              }</strong></p>
            </div>
            <div class="item-footer">
              <div class="item-price">₹${item.price.toLocaleString("en-IN")}</div>
              <button class="btn btn-secondary btn-sm" onclick="window.LOOP.openChatWithItem('${
                item.title
              }', ${item.price})">Message</button>
            </div>
          </div>
        </div>
      `
        )
        .join("");
    }

    if (searchBtn && searchInput) {
      searchBtn.addEventListener("click", () => {
        state.search.query = searchInput.value;
        renderResults();
      });
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          state.search.query = searchInput.value;
          renderResults();
        }
      });
    }

    // Preset pills for discover search
    document.querySelectorAll("#screen-discover .preset-pill[data-query]").forEach((pill) => {
      pill.addEventListener("click", () => {
        const text = pill.getAttribute("data-query");
        if (text) {
          if (searchInput) searchInput.value = text;
          state.search.query = text;
          renderResults();
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

    // Image search button (simulated)
    const imgSearchBtn = document.getElementById("discover-img-search-btn");
    if (imgSearchBtn) {
      imgSearchBtn.addEventListener("click", () => {
        showToast(
          "📷 Image search simulation: Extracted 512-d CLIP embedding and found 3 visually similar items in Campus."
        );
        if (searchInput) searchInput.value = "study table";
        state.search.query = "study table";
        renderResults();
      });
    }

    // Saved search alert button (simulated)
    const saveSearchBtn = document.getElementById("discover-save-search-btn");
    if (saveSearchBtn) {
      saveSearchBtn.addEventListener("click", () => {
        showToast(
          `🔔 Alert created for "${
            searchInput.value || "study table"
          }". You will receive instant notifications when matching items are listed.`
        );
      });
    }

    // Initial render
    renderResults();
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
            <p style="font-size: 0.8rem; margin-top: 4px;">Rating (5/5) recorded. Seller trust score updated in realtime.</p>
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
    // Model health telemetry
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
        const emailVal = document.getElementById("login-email").value.trim();
        forgotNotice.textContent = `✓ Simulated reset link sent${
          emailVal ? " to " + emailVal : ""
        }. Check your inbox.`;
        forgotNotice.classList.add("visible");
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
        navigateTo("overview");
        showToast(`Welcome to LOOP, ${session.identifier}!`);
      });
    }

    // Dashboard Sign-out Button
    const btnSignOut = document.getElementById("btn-sign-out");
    if (btnSignOut) {
      btnSignOut.addEventListener("click", () => {
        clearDemoSession();
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

  // Helper for cross-screen chat opening
  window.LOOP = {
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

    // Mobile nav bar clicks
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

    // Initialize all screens
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

    // Check initial hash route
    const hash = window.location.hash.replace("#", "");
    if (hash && document.getElementById("screen-" + hash)) {
      navigateTo(hash);
    } else {
      navigateTo("overview");
    }
  });
})();
