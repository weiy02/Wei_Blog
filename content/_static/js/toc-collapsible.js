/**
 * Collapsible TOC — Make the right-side table of contents collapsible.
 *
 * Improvements over basic version:
 *   - Smooth height animation (CSS grid) on expand/collapse
 *   - Accordion behaviour: expanding one sibling collapses others at the same level
 *   - Clicking a parent heading scrolls to it AND toggles children
 *   - Auto-expands ancestors of the currently-visible section
 *   - Handles Material's instant navigation (no full reload)
 *   - Aligns all items by adding spacer to non-toggle items
 */

/* ── Initialise (runs on load and after instant navigation) ── */
function initCollapsibleToc() {
  var sidebar = document.querySelector(".md-sidebar--secondary");
  if (!sidebar) return;

  var tocList = sidebar.querySelector('[data-md-component="toc"]');
  if (!tocList) return;

  /* Reset any previous run: remove injected elements & classes */
  tocList
    .querySelectorAll(".md-nav__item--toc-sect")
    .forEach(function (item) {
      var toggle = item.querySelector(":scope > .md-nav__toggle");
      var label = item.querySelector(":scope > .md-nav__link--toc-label");
      if (toggle) toggle.remove();
      if (label) label.remove();
      item.classList.remove("md-nav__item--toc-sect");
    });

  /* Also clean up spacers from previous runs */
  tocList
    .querySelectorAll(".md-nav__link--toc-spacer")
    .forEach(function (s) { s.remove(); });

  /* ── Recursively add toggles to items that have children ── */
  var uid = 0;

  function processItem(item) {
    var childrenNav = item.querySelector(":scope > nav.md-nav");
    if (!childrenNav) return;                 // leaf item

    var link = item.querySelector(":scope > a.md-nav__link");
    if (!link) return;

    uid++;
    var id = "toc-c-" + uid;

    /* Mark item */
    item.classList.add("md-nav__item--toc-sect");

    /* Create hidden checkbox */
    var toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "md-nav__toggle md-toggle";
    toggle.id = id;

    /* Create label (clickable: arrow icon + title text) */
    var label = document.createElement("label");
    label.className = "md-nav__link md-nav__link--toc-label";
    label.htmlFor = id;

    var icon = document.createElement("span");
    icon.className = "md-nav__icon md-icon";
    label.appendChild(icon);

    var ellipsis = link.querySelector(".md-ellipsis");
    if (ellipsis) label.appendChild(ellipsis.cloneNode(true));

    /* Insert toggle + label before the original link */
    item.insertBefore(toggle, link);
    item.insertBefore(label, link);

    /* Split behaviour:
     *   - Click the arrow icon  → toggle expand/collapse (default checkbox action)
     *   - Click the text/label  → scroll to the heading, do NOT toggle
     */
    label.addEventListener("click", function (e) {
      var href = link.getAttribute("href");
      if (!href) return;

      var isIconClick = e.target.closest(".md-nav__icon");

      if (isIconClick) {
        /* Let the checkbox toggle naturally; accordion handled by change listener */
        return;
      }

      /* Text/empty-area click: smooth scroll only */
      e.preventDefault();
      var target = document.querySelector(href);
      if (target) {
        setTimeout(function () {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 10);
      }
    });

    /* Accordion behaviour at each level: when this item expands,
     * collapse its siblings at the same nesting level. */
    toggle.addEventListener("change", function () {
      if (!toggle.checked || !item.parentElement) return;
      Array.from(item.parentElement.querySelectorAll(":scope > li.md-nav__item"))
        .forEach(function (sibling) {
          if (sibling === item) return;
          var siblingToggle = sibling.querySelector(":scope > .md-nav__toggle");
          if (siblingToggle) siblingToggle.checked = false;
        });
    });

    /* Recurse into children */
    var childList = childrenNav.querySelector(":scope > ul.md-nav__list");
    if (childList) {
      childList.querySelectorAll(":scope > li.md-nav__item").forEach(processItem);
    }
  }

  /* First pass: add toggles for items with children */
  tocList.querySelectorAll(":scope > li.md-nav__item").forEach(processItem);

  /* ── Alignment: add invisible spacer to ALL non-toggle items at every level ── */
  function addSpacers(container) {
    if (!container) return;
    container.querySelectorAll(":scope > li.md-nav__item").forEach(function (item) {
      if (!item.classList.contains("md-nav__item--toc-sect")) {
        var link = item.querySelector(":scope > a.md-nav__link");
        if (link && !link.querySelector(".md-nav__icon")) {
          var spacer = document.createElement("span");
          spacer.className = "md-nav__icon md-icon md-nav__link--toc-spacer";
          spacer.setAttribute("aria-hidden", "true");
          spacer.style.opacity = "0";
          spacer.style.pointerEvents = "none";
          link.insertBefore(spacer, link.firstChild);
        }
      }
      /* recurse into children */
      var childNav = item.querySelector(":scope > nav.md-nav");
      if (childNav) {
        var childList = childNav.querySelector(":scope > ul.md-nav__list");
        addSpacers(childList);
      }
    });
  }
  addSpacers(tocList);

  /* ── Auto-expand ancestors of the active section ── */
  function expandActivePath() {
    var active = sidebar.querySelector(".md-nav__link--active");
    if (!active) return;
    var item = active.closest(".md-nav__item");
    while (item) {
      var t = item.querySelector(":scope > .md-nav__toggle");
      if (t && !t.checked) t.checked = true;
      item = item.parentElement?.closest(".md-nav__item") || null;
    }
  }

  expandActivePath();

  /* Re-run expand on scroll-spy changes */
  if (window._tocObserver) window._tocObserver.disconnect();
  window._tocObserver = new MutationObserver(function () {
    if (sidebar.querySelector(".md-nav__link--active")) expandActivePath();
  });
  window._tocObserver.observe(tocList, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
}

/* ── Run on initial page load ── */
document.addEventListener("DOMContentLoaded", function () {
  initCollapsibleToc();
});

/* ── Run after Material instant navigation ── */
document.addEventListener("documentContentSwitch", function () {
  setTimeout(initCollapsibleToc, 80);
});
