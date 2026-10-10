/**
 * shell-session-guard.js — Single-tab enforcement + session heartbeat
 *
 * Rules:
 *  1. One user = one session (server already enforces via createSession)
 *  2. One session = one browser tab (BroadcastChannel + sessionStorage)
 *  3. Heartbeat polls /api/auth/check every 30s — shows overlay on 401
 */

(function() {
  'use strict';

  var HEARTBEAT_INTERVAL = 30000;        // 30 seconds
  var CHANNEL_NAME = 'lumia-session';
  var TAB_KEY = 'lumia-tab-id';

  var overlay = document.getElementById('session-guard-overlay');
  var titleEl = document.getElementById('session-guard-title');
  var msgEl   = document.getElementById('session-guard-msg');
  var btnEl   = document.getElementById('session-guard-btn');

  var locked = false;

  /* ── Show blocking overlay ── */
  function showGuard(title, msg) {
    if (locked) return;
    locked = true;
    if (titleEl) titleEl.textContent = title;
    if (msgEl)   msgEl.textContent   = msg;
    if (overlay) overlay.classList.remove('hidden');
  }

  /* ── Redirect button ── */
  if (btnEl) {
    btnEl.addEventListener('click', function() {
      window.location.replace('/login.html');
    });
  }

  /* ═══════════════════════════════════════
   *  Tab Lock — BroadcastChannel
   * ═══════════════════════════════════════ */

  var tabId = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  var channel = null;

  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch (_) { /* BroadcastChannel not supported — skip tab lock */ }

  if (channel) {
    /* Announce this tab is active */
    channel.postMessage({ type: 'tab-open', tabId: tabId });

    /* Listen for other tabs */
    channel.onmessage = function(ev) {
      var data = ev.data;
      if (!data || data.tabId === tabId) return;

      if (data.type === 'tab-open') {
        /* A new tab opened — it wins, we block ourselves */
        showGuard(
          'Sessione attiva altrove',
          'LUMIA è già aperto in un\'altra scheda di questo browser. Chiudi questa scheda o ricarica.'
        );
        if (btnEl) btnEl.textContent = 'Ricarica';
        if (btnEl) {
          btnEl.onclick = function() { window.location.reload(); };
        }
        /* Tell the new tab we yielded */
        channel.postMessage({ type: 'tab-yield', tabId: tabId });
      }

      if (data.type === 'tab-yield') {
        /* Other tab yielded — we're the active one, ensure we're not locked */
        /* (no action needed, we already have the UI) */
      }
    };
  }

  /* ═══════════════════════════════════════
   *  Session Heartbeat — poll /api/auth/check
   * ═══════════════════════════════════════ */

  var heartbeatTimer = null;

  function heartbeat() {
    if (locked) return;
    fetch('/api/auth/check', { credentials: 'same-origin' })
      .then(function(r) {
        if (!r.ok) {
          showGuard(
            'Sessione terminata',
            'La sessione è stata chiusa da un altro terminale o è scaduta.'
          );
          clearInterval(heartbeatTimer);
          return null;
        }
        return r.json();
      })
      .then(function(d) {
        if (d && d.csrf_token) {
          csrfToken = d.csrf_token;
          window.dispatchEvent(new Event('session-heartbeat-ok'));
        }
        if (d && typeof d.idle_remaining === 'number') {
          window.dispatchEvent(new CustomEvent('session-idle-sync', { detail: d.idle_remaining }));
        }
      })
      .catch(function() {
        /* Network error — don't block, will retry on next interval */
      });
  }

  heartbeatTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL);

})();
