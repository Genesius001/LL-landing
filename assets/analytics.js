/* Basic consent mode: no Google script, cookies, or pings before opt-in. */
(function () {
  'use strict';
  var script = document.currentScript;
  var measurementId = script && script.getAttribute('data-measurement-id');
  var banner = document.getElementById('analytics-consent');
  var settings = document.getElementById('analytics-settings');
  var accept = document.getElementById('analytics-accept');
  var reject = document.getElementById('analytics-reject');
  var close = document.getElementById('analytics-close');
  if (!/^G-[A-Z0-9]+$/.test(measurementId || '') || !banner || !settings || !accept || !reject || !close) return;

  var storageKey = 'lucky-loki-analytics-consent-v1';
  var maxAge = 180 * 24 * 60 * 60 * 1000;
  var choice = null;
  var started = false;
  var returnedFocus = false;
  var disableKey = 'ga-disable-' + measurementId;
  window[disableKey] = true;

  function readChoice() {
    try {
      var record = JSON.parse(localStorage.getItem(storageKey));
      if (record && (record.value === 'granted' || record.value === 'denied') &&
          typeof record.expires === 'number' && record.expires > Date.now() && record.expires <= Date.now() + maxAge) return record.value;
    } catch (error) { /* Storage disabled or an invalid record: stay opted out. */ }
    return null;
  }

  function remember(value) {
    choice = value;
    try { localStorage.setItem(storageKey, JSON.stringify({ value: value, expires: Date.now() + maxAge })); }
    catch (error) { /* The current-page choice still applies without persistence. */ }
  }

  function removeAnalyticsCookies() {
    // Remove only our GA cookies, including domain cookies from earlier consent.
    document.cookie.split(';').forEach(function (cookie) {
      var name = cookie.split('=')[0].trim();
      if (name !== '_ga' && name !== '_ga_' + measurementId.slice(2).replace(/-/g, '_')) return;
      var domains = ['', location.hostname, '.' + location.hostname];
      if (location.hostname.endsWith('.luckyloki.pro')) domains.push('luckyloki.pro', '.luckyloki.pro');
      domains.forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax' + (domain ? '; domain=' + domain : '') + (location.protocol === 'https:' ? '; Secure' : '');
      });
    });
  }

  function cleanUrl(value, campaign) {
    try {
      var url = new URL(value);
      var clean = new URL(url.origin + url.pathname);
      if (campaign) ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content', 'gclid', 'dclid'].forEach(function (key) {
        if (url.searchParams.has(key)) clean.searchParams.set(key, url.searchParams.get(key).slice(0, 200));
      });
      return clean.href;
    } catch (error) { return ''; }
  }

  function startAnalytics() {
    if (started || choice !== 'granted') return;
    started = true;
    window[disableKey] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('set', 'ads_data_redaction', true);
    window.gtag('consent', 'update', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    var config = {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_domain: 'none',
      cookie_flags: 'SameSite=Lax;Secure',
      cookie_expires: 180 * 24 * 60 * 60,
      cookie_update: false,
      page_location: cleanUrl(location.href, true),
      page_referrer: cleanUrl(document.referrer, false),
      site_language: document.documentElement.lang
    };
    if (new URLSearchParams(location.search).get('analytics_debug') === '1') config.debug_mode = true;
    window.gtag('config', measurementId, config);
    var googleScript = document.createElement('script');
    googleScript.async = true;
    googleScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(googleScript);
  }

  function show(focus) {
    returnedFocus = Boolean(focus);
    close.hidden = choice === null;
    banner.hidden = false;
    settings.setAttribute('aria-expanded', 'true');
    if (focus) reject.focus();
  }

  function hide() {
    banner.hidden = true;
    settings.setAttribute('aria-expanded', 'false');
    if (returnedFocus) settings.focus();
  }

  function stopAnalytics() {
    window[disableKey] = true;
    removeAnalyticsCookies();
    // Unload the Google library too, so withdrawal cannot turn into cookieless pings.
    if (started) location.reload();
  }

  accept.addEventListener('click', function () {
    remember('granted'); hide(); startAnalytics();
  });
  reject.addEventListener('click', function () {
    remember('denied'); hide(); stopAnalytics();
  });
  settings.addEventListener('click', function () { show(true); });
  close.addEventListener('click', hide);
  banner.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && choice !== null) { event.preventDefault(); hide(); }
  });
  window.addEventListener('storage', function (event) {
    if (event.key !== storageKey && event.key !== null) return;
    choice = readChoice();
    if (choice === 'granted') { hide(); startAnalytics(); }
    else { stopAnalytics(); if (choice === null) show(false); else hide(); }
  });
  // Long-lived tabs must not outlive the stored permission.
  window.setInterval(function () {
    if (choice === 'granted' && !readChoice()) { choice = null; stopAnalytics(); show(false); }
  }, 60000);

  settings.hidden = false;
  choice = readChoice();
  if (choice === 'granted') startAnalytics();
  else { removeAnalyticsCookies(); if (choice === null) show(false); }
})();
