// Make pymdownx.tasklist checkboxes interactive and persist state in localStorage.
// Each checkbox gets a stable ID based on page path + preceding heading + position.
// Works with Material's instant navigation by re-initializing on document$ updates.

(function () {
  const STORAGE_KEY = "ccaf-study-progress-v1";

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function checkboxId(cb) {
    const path = location.pathname.replace(/\/index\.html$/, "/");
    let heading = "top";
    let scan = cb.closest("li") || cb;
    while (scan) {
      let prev = scan.previousElementSibling;
      while (prev) {
        if (/^H[1-6]$/.test(prev.tagName) && prev.id) {
          heading = prev.id;
          scan = null;
          break;
        }
        prev = prev.previousElementSibling;
      }
      if (scan) scan = scan.parentElement;
      if (scan && scan.tagName === "ARTICLE") break;
    }
    const list = cb.closest("ul, ol");
    let index = 0;
    if (list) {
      const all = list.querySelectorAll('input[type="checkbox"]');
      index = Array.prototype.indexOf.call(all, cb);
    }
    const li = cb.closest("li");
    const label = (li ? li.textContent : "").trim().slice(0, 80);
    return path + "::" + heading + "::" + index + "::" + label;
  }

  function applyState(state, cb) {
    const id = checkboxId(cb);
    if (state[id] !== undefined) {
      cb.checked = state[id];
    }
    return id;
  }

  function init() {
    const state = loadState();
    const boxes = document.querySelectorAll(
      '.task-list-item input[type="checkbox"]'
    );
    boxes.forEach((cb) => {
      cb.disabled = false;
      cb.removeAttribute("disabled");
      const id = applyState(state, cb);
      if (cb.dataset.trackerBound === "1") return;
      cb.dataset.trackerBound = "1";
      cb.addEventListener("change", () => {
        const s = loadState();
        s[id] = cb.checked;
        saveState(s);
      });
    });

    addResetButton();
    updateProgressIndicators();
  }

  function addResetButton() {
    if (document.getElementById("ccaf-reset-progress")) return;
    const target = document.querySelector(".md-content article");
    if (!target) return;
    const total = target.querySelectorAll('input[type="checkbox"]').length;
    if (total === 0) return;

    const wrap = document.createElement("div");
    wrap.id = "ccaf-reset-progress";
    wrap.className = "ccaf-progress-wrap";

    const text = document.createElement("span");
    text.className = "ccaf-progress-text";
    wrap.appendChild(text);

    const bar = document.createElement("div");
    bar.className = "ccaf-progress-bar";
    const fill = document.createElement("div");
    fill.className = "ccaf-progress-fill";
    bar.appendChild(fill);
    wrap.appendChild(bar);

    const btn = document.createElement("button");
    btn.className = "ccaf-reset-btn";
    btn.type = "button";
    btn.title = "Clear all checkbox progress on this site";
    btn.textContent = "Reset progress";
    btn.addEventListener("click", () => {
      if (!confirm("Clear all saved checkbox progress across the entire site?")) return;
      localStorage.removeItem(STORAGE_KEY);
      document
        .querySelectorAll('input[type="checkbox"]')
        .forEach((cb) => (cb.checked = false));
      updateProgressIndicators();
    });
    wrap.appendChild(btn);

    target.insertBefore(wrap, target.firstChild);
  }

  function updateProgressIndicators() {
    const target = document.querySelector(".md-content article");
    if (!target) return;
    const boxes = target.querySelectorAll('input[type="checkbox"]');
    const checked = Array.from(boxes).filter((b) => b.checked).length;
    const text = document.querySelector(".ccaf-progress-text");
    if (text) {
      text.textContent =
        boxes.length === 0
          ? ""
          : "Progress " + checked + " / " + boxes.length;
    }
    const fill = document.querySelector(".ccaf-progress-fill");
    if (fill && boxes.length > 0) {
      const pct = Math.round((checked / boxes.length) * 100);
      fill.style.width = pct + "%";
    }
  }

  function bind() {
    init();
    document.addEventListener("change", (e) => {
      if (e.target && e.target.matches('input[type="checkbox"]')) {
        updateProgressIndicators();
      }
    });
  }

  // Material's instant navigation exposes document$. Re-init on each page load.
  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(bind);
  } else if (document.readyState !== "loading") {
    bind();
  } else {
    document.addEventListener("DOMContentLoaded", bind);
  }
})();
