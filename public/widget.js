/**
 * Frontdesk embeddable widget loader.
 *
 *   <script src="https://your-app.com/widget.js" data-bot="fd_xxx" async></script>
 *
 * Everything visible lives inside an iframe served from the Frontdesk origin,
 * so the host page's CSS can't leak in and break the chat — the single most
 * common way embedded widgets fall apart. The only DOM this script adds to the
 * host page is that one iframe.
 *
 * The iframe drives its own size: it posts `frontdesk:open` / `frontdesk:close`
 * and this script resizes the frame to match.
 */
(function () {
  "use strict";

  var script =
    document.currentScript ||
    (function () {
      var all = document.getElementsByTagName("script");
      for (var i = all.length - 1; i >= 0; i--) {
        if (all[i].src && all[i].src.indexOf("widget.js") !== -1) return all[i];
      }
      return null;
    })();

  if (!script) return;

  var botKey = script.getAttribute("data-bot");
  if (!botKey) {
    console.warn("[Frontdesk] Missing data-bot attribute on the script tag.");
    return;
  }

  var origin = new URL(script.src).origin;
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";

  // Guard against the snippet being pasted twice.
  if (document.querySelector('iframe[data-frontdesk="' + botKey + '"]')) return;

  var LAUNCHER = 76;
  var PANEL = { width: 400, height: 620 };

  var iframe = document.createElement("iframe");
  iframe.src = origin + "/embed/" + encodeURIComponent(botKey);
  iframe.title = "Chat assistant";
  iframe.setAttribute("data-frontdesk", botKey);
  iframe.setAttribute("allow", "clipboard-write");
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("scrolling", "no");

  var style = iframe.style;
  style.position = "fixed";
  style.bottom = "0px";
  style[side] = "0px";
  style.width = LAUNCHER + "px";
  style.height = LAUNCHER + "px";
  style.maxWidth = "100vw";
  style.maxHeight = "100vh";
  style.border = "0";
  style.background = "transparent";
  style.colorScheme = "normal";
  style.zIndex = "2147483000";
  style.transition = "width .18s ease, height .18s ease";

  function isMobile() {
    return window.innerWidth < 480;
  }

  function applySize(open) {
    if (!open) {
      style.width = LAUNCHER + "px";
      style.height = LAUNCHER + "px";
      return;
    }
    if (isMobile()) {
      style.width = "100vw";
      style.height = "100dvh";
      return;
    }
    // +24px of breathing room so the panel's drop shadow isn't clipped.
    style.width = PANEL.width + 24 + "px";
    style.height = Math.min(PANEL.height + 24, window.innerHeight) + "px";
  }

  var isOpen = false;

  window.addEventListener("message", function (event) {
    // Only trust messages from our own iframe, from the Frontdesk origin.
    if (event.origin !== origin) return;
    if (event.source !== iframe.contentWindow) return;

    var data = event.data;
    if (!data || typeof data.type !== "string") return;

    if (data.type === "frontdesk:open") {
      isOpen = true;
      applySize(true);
    } else if (data.type === "frontdesk:close") {
      isOpen = false;
      applySize(false);
    }
  });

  window.addEventListener("resize", function () {
    applySize(isOpen);
  });

  function mount() {
    document.body.appendChild(iframe);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
