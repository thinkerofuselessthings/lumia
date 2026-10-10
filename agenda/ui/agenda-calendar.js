/**
 * agenda-calendar.js — Mini calendar rendering, date navigation, counts/closures
 * Exposes: Ag.Calendar + global onclick handlers (calPrev, calNext, pickDay, etc.)
 */
(function(global) {
  'use strict';
  var Ag = global.LumiaAgenda = global.LumiaAgenda || {};
  var C = Ag.Config, S = Ag.state;

  function syncCal() {
    var d = new Date(S.selDate);
    S.calY = d.getFullYear(); S.calM = d.getMonth();
    Promise.all([loadCounts(), loadClosed(), loadStationClosuresMonth()]).then(function() { renderMiniCal(); });
  }

  function renderMiniCal() {
    var today = C.fmtDate(new Date()), sel = S.selDate;
    var dim = new Date(S.calY, S.calM + 1, 0).getDate();
    var fd = (new Date(S.calY, S.calM, 1).getDay() + 6) % 7;
    var pmd = new Date(S.calY, S.calM, 0).getDate();
    var mn = C.MESI;
    var h = '<div class="mcal-header"><button onclick="calPrev()">' + C.SVG_NAV_LEFT + '</button><span class="mcal-title">' + mn[S.calM] + ' ' + S.calY + '</span><button onclick="calNext()">' + C.SVG_NAV_RIGHT + '</button></div><div class="mcal-grid">';
    ['Lu','Ma','Me','Gi','Ve','Sa','Do'].forEach(function(d) { h += '<div class="mcal-dow">' + d + '</div>'; });
    for (var i = fd - 1; i >= 0; i--) {
      var day = pmd - i;
      var pm = S.calM === 0 ? 11 : S.calM - 1, py = S.calM === 0 ? S.calY - 1 : S.calY;
      var ds = py + '-' + String(pm + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      h += '<div class="mcal-day other-month" onclick="pickDay(\'' + ds + '\')">' + day + '</div>';
    }
    for (var d2 = 1; d2 <= dim; d2++) {
      var ds2 = S.calY + '-' + String(S.calM + 1).padStart(2, '0') + '-' + String(d2).padStart(2, '0');
      var cls = ['mcal-day', ds2 === today ? 'today' : '', ds2 === sel ? 'selected' : '', S.closedDays[ds2] ? 'closed' : ''].filter(Boolean).join(' ');
      var cnt = S.calCounts[ds2];
      var dt = getDayType(ds2);
      var indCls = dt ? 'mcal-ind ind-' + dt : '';
      h += '<div class="' + cls + '" onclick="pickDay(\'' + ds2 + '\')">' + d2 + (cnt ? '<span class="mcal-count">' + cnt + '</span>' : (indCls ? '<span class="' + indCls + '"></span>' : '')) + '</div>';
    }
    var rem = (7 - ((fd + dim) % 7)) % 7;
    for (var d3 = 1; d3 <= rem; d3++) {
      var nm = S.calM === 11 ? 0 : S.calM + 1, ny = S.calM === 11 ? S.calY + 1 : S.calY;
      var ds3 = ny + '-' + String(nm + 1).padStart(2, '0') + '-' + String(d3).padStart(2, '0');
      h += '<div class="mcal-day other-month" onclick="pickDay(\'' + ds3 + '\')">' + d3 + '</div>';
    }
    h += '</div>';
    var el = C.$('miniCal');
    if (el) el.innerHTML = h;
  }

  function calPrev() {
    S.calM--;
    if (S.calM < 0) { S.calM = 11; S.calY--; }
    Promise.all([loadCounts(), loadClosed(), loadListeClosed(), loadStationClosuresMonth()]).then(function() {
      renderMiniCal();
      if (S.currentLayer === 'liste' && Ag.Lists) Ag.Lists.renderMiniCal();
    });
  }

  function calNext() {
    S.calM++;
    if (S.calM > 11) { S.calM = 0; S.calY++; }
    Promise.all([loadCounts(), loadClosed(), loadListeClosed(), loadStationClosuresMonth()]).then(function() {
      renderMiniCal();
      if (S.currentLayer === 'liste' && Ag.Lists) Ag.Lists.renderMiniCal();
    });
  }

  function pickDay(ds) {
    S.selDate = ds;
    var d = new Date(ds);
    if (d.getFullYear() !== S.calY || d.getMonth() !== S.calM) {
      S.calY = d.getFullYear(); S.calM = d.getMonth();
      Promise.all([loadCounts(), loadClosed(), loadListeClosed(), loadStationClosuresMonth()]).then(function() {
        renderMiniCal();
        if (S.currentLayer === 'liste' && Ag.Lists) {
          Ag.Lists.renderMiniCal(); Ag.Lists.updateDateLabel();
          if (S.selListId) Ag.Lists.loadAndRenderSlots();
        } else {
          Ag.Api.fetch('/appointments?date=' + S.selDate).then(function(j) {
            S.appointments = (j && j.data) || [];
            return Ag.Api.fetch('/day-room-overrides?date=' + S.selDate);
          }).then(function(j) {
            S.dayOverrides = {};
            for (var o of ((j && j.data) || [])) S.dayOverrides[o.room_id] = o.is_open;
            if (Ag.Scheduler) { Ag.Scheduler.render(); Ag.Scheduler.updateBanner(); Ag.Scheduler.updateDateLabel(); }
          });
        }
      });
    } else {
      renderMiniCal();
      if (S.currentLayer === 'liste' && Ag.Lists) {
        Ag.Lists.renderMiniCal(); Ag.Lists.updateDateLabel();
        if (S.selListId) Ag.Lists.loadAndRenderSlots();
      } else {
        Ag.Api.fetch('/appointments?date=' + S.selDate).then(function(j) {
          S.appointments = (j && j.data) || [];
          return Ag.Api.fetch('/day-room-overrides?date=' + S.selDate);
        }).then(function(j) {
          S.dayOverrides = {};
          for (var o of ((j && j.data) || [])) S.dayOverrides[o.room_id] = o.is_open;
          if (Ag.Scheduler) { Ag.Scheduler.render(); Ag.Scheduler.updateBanner(); Ag.Scheduler.updateDateLabel(); }
        });
      }
    }
  }

  /* ── Data loaders ──────────────────────────────────────────── */
  function loadCounts() {
    var f = S.calY + '-' + String(S.calM + 1).padStart(2, '0') + '-01';
    var l = S.calY + '-' + String(S.calM + 1).padStart(2, '0') + '-' + String(new Date(S.calY, S.calM + 1, 0).getDate()).padStart(2, '0');
    return Ag.Api.fetch('/appointments/counts?from=' + f + '&to=' + l).then(function(j) { S.calCounts = (j && j.data) || {}; });
  }

  function loadClosed() {
    var f = S.calY + '-' + String(S.calM + 1).padStart(2, '0') + '-01';
    var l = S.calY + '-' + String(S.calM + 1).padStart(2, '0') + '-' + String(new Date(S.calY, S.calM + 1, 0).getDate()).padStart(2, '0');
    return Ag.Api.fetch('/closed-days?from=' + f + '&to=' + l).then(function(j) {
      S.closedDays = {};
      for (var c of ((j && j.data) || [])) S.closedDays[c.date] = c;
    });
  }

  function loadStationClosuresMonth() {
    if (!S.postazioni.length) { S.calStationClosures = []; return Promise.resolve(); }
    var from = S.calY + '-' + String(S.calM + 1).padStart(2, '0') + '-01';
    var to = S.calY + '-' + String(S.calM + 1).padStart(2, '0') + '-' + String(new Date(S.calY, S.calM + 1, 0).getDate()).padStart(2, '0');
    var ids = S.postazioni.map(function(p) { return p.id; }).join(',');
    if (!ids) { S.calStationClosures = []; return Promise.resolve(); }
    return Ag.Api.fetch('/station-closures/bulk?room_ids=' + ids + '&from=' + from + '&to=' + to).then(function(j) {
      S.calStationClosures = (j && j.data) || [];
    });
  }

  function loadListeClosed() {
    var f = S.calY + '-' + String(S.calM + 1).padStart(2, '0') + '-01';
    var l = S.calY + '-' + String(S.calM + 1).padStart(2, '0') + '-' + String(new Date(S.calY, S.calM + 1, 0).getDate()).padStart(2, '0');
    return Ag.Api.fetch('/list-closed-days?from=' + f + '&to=' + l).then(function(j) {
      S.listeClosedDays = {};
      for (var c of ((j && j.data) || [])) S.listeClosedDays[c.date] = c;
    });
  }

  function getDayType(dateStr) {
    if (S.closedDays[dateStr]) {
      var reason = (S.closedDays[dateStr].reason || '').toLowerCase();
      if (reason.includes('festiv')) return 'festivo';
      return 'closed';
    }
    var d = new Date(dateStr), jsDow = d.getDay(), schedDow = jsDow === 0 ? 7 : jsDow;
    var isWeekend = jsDow === 0 || jsDow === 6;
    var activeRooms = S.postazioni.filter(function(p) {
      if (p.schedule) { try { var sc = JSON.parse(p.schedule); var day = sc[schedDow]; return day && day.active; } catch(e) {} }
      return true;
    });
    if (activeRooms.length === 0) return isWeekend ? 'weekend' : 'closed';
    var closedRoomIds = new Set();
    for (var c of S.calStationClosures) { if (c.date_start <= dateStr && c.date_end >= dateStr) closedRoomIds.add(c.room_id); }
    var closedCount = activeRooms.filter(function(r) { return closedRoomIds.has(r.id); }).length;
    if (closedCount >= activeRooms.length) return isWeekend ? 'weekend' : 'closed';
    if (closedCount > 0) return 'partial';
    if (isWeekend) return 'weekend';
    return 'open';
  }

  /* ── Public API ────────────────────────────────────────────── */
  Ag.Calendar = Object.freeze({
    syncCal: syncCal, renderMiniCal: renderMiniCal,
    calPrev: calPrev, calNext: calNext, pickDay: pickDay,
    loadCounts: loadCounts, loadClosed: loadClosed,
    loadStationClosuresMonth: loadStationClosuresMonth,
    loadListeClosed: loadListeClosed, getDayType: getDayType
  });

  /* ── Globals for HTML onclick ──────────────────────────────── */
  global.calPrev = calPrev;
  global.calNext = calNext;
  global.pickDay = pickDay;

})(window);
