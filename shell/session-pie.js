/**
 * session-pie.js — Session idle countdown pie chart
 * Shows a filled circular countdown (60 min idle timeout).
 * Resets ONLY on real API activity (not heartbeat, not UI events).
 * Color: green → yellow → red as time depletes.
 *
 * Technique: SVG thick-stroke circle for filled-pie appearance.
 *  - r=5, stroke-width=10 → fills entire 20×20 viewBox
 *  - stroke-dasharray/dashoffset controls visible fraction
 *  - CSS transition smooths the 1-second jumps
 *  - countdown text goes in a <span> to the right of the SVG
 */
(function() {
  'use strict';

  var IDLE_TIMEOUT = 60 * 60; // 60 minutes in seconds
  var RADIUS = 5;
  var CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 31.4159
  var _remaining = IDLE_TIMEOUT;
  var _tickTimer = null;

  var arc   = document.getElementById('sessionPieArc');
  var label = document.getElementById('sessionPieText');

  if (!arc || !label) {
    console.warn('[session-pie] #sessionPieArc or #sessionPieText not found — countdown disabled.');
    return;
  }

  /* ── Initialise arc via CSS properties (not SVG attributes) ──
   *  CSS properties override SVG presentation attributes and
   *  are required for CSS transition to work.                  */
  var C = CIRCUMFERENCE.toFixed(4);
  arc.style.strokeDasharray  = C + ' ' + C;
  arc.style.strokeDashoffset = '0';
  arc.style.transition       = 'stroke-dashoffset 1s linear, stroke .5s ease';

  function getColor(ratio) {
    if (ratio > 0.5) return '#77BFA3';   // green
    if (ratio > 0.2) return '#FBAF00';   // orange
    return '#A40606';                      // red
  }

  function update() {
    var rawRatio = Math.max(0, _remaining / IDLE_TIMEOUT);

    // Adjust for the 1-second CSS transition lag (CSS-Tricks technique):
    // the ring visually reaches the target 1 s late, so we "lead" it.
    var ratio = rawRatio - (1 / IDLE_TIMEOUT) * (1 - rawRatio);
    if (ratio < 0) ratio = 0;

    var offset = CIRCUMFERENCE * (1 - ratio);

    // Use style (CSS property) so that CSS transition animates the change
    arc.style.strokeDashoffset = offset.toFixed(4);
    arc.style.stroke = getColor(rawRatio);

    var m = Math.floor(_remaining / 60);
    var s = _remaining % 60;
    label.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function tick() {
    _remaining = Math.max(0, _remaining - 1);
    update();
    if (_remaining <= 0 && _tickTimer) {
      clearInterval(_tickTimer);
      _tickTimer = null;
    }
  }

  function reset() {
    _remaining = IDLE_TIMEOUT;
    update();
    if (!_tickTimer) {
      _tickTimer = setInterval(tick, 1000);
    }
  }

  /* ── Reset ONLY on real API activity (not heartbeat, not UI events) ── */
  window.addEventListener('session-api-activity', reset);

  /* ── Sync to server-reported idle remaining (from heartbeat) ── */
  window.addEventListener('session-idle-sync', function(e) {
    var serverRemaining = e.detail;
    if (typeof serverRemaining === 'number' && serverRemaining >= 0) {
      _remaining = serverRemaining;
      update();
      if (!_tickTimer && _remaining > 0) {
        _tickTimer = setInterval(tick, 1000);
      }
    }
  });

  /* ── Start ── */
  update();
  _tickTimer = setInterval(tick, 1000);

})();
