/**
 * registry.js — Prestazioni module registry
 * Central registry for service-specific modules (trasfusione, etc.)
 * Must load BEFORE any module and BEFORE prestazioni-container.js
 */
(function(global) {
  'use strict';
  var _mods = [];

  var PrestModules = {
    register: function(mod) {
      if (!mod || !mod.id || !mod.match) return;
      _mods.push(mod);
    },
    findFor: function(appt) {
      return _mods.filter(function(m) { return m.match(appt); });
    },
    getById: function(id) {
      return _mods.find(function(m) { return m.id === id; }) || null;
    },
    getAll: function() { return _mods.slice(); }
  };

  global.PrestModules = PrestModules;
})(window);
