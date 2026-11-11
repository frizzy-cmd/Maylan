// (function () {
// 	const savedTheme = localStorage.getItem('oneshot-theme') || 'theme-barrens';
// 	document.documentElement.className = savedTheme;
//
// 	document.addEventListener('DOMContentLoaded', () => {
// 		document.body.className = savedTheme;
//
// 		const themeSelect = document.getElementById('themeSelect');
// 		if (themeSelect) {
// 			themeSelect.value = savedTheme;
// 			themeSelect.addEventListener('change', (e) => {
// 				const newTheme = e.target.value;
// 				document.body.className = newTheme;
// 				document.documentElement.className = newTheme;
// 				localStorage.setItem('oneshot-theme', newTheme);
// 			});
// 		}
// 	});
// })();

// OLD DEPRECATED^^^^^^^^^^^^^
// 6/9/2026 ive hired some workers for my site now :) new developers! they really like to comment
// ^ shut up

// +++++
// =========================================
// theme-switcher.js - Initial commit by Maylan

// Description:
// This script serves switching themes and tracking. since theme-switcher is already defined in all pages, we just put code here. Probably gonna do the same for future use
// =========================================
// +++++

function toggleClsBoth(cls, on) {
	if (on) {
		document.documentElement.classList.add(cls);
		if (document.body) document.body.classList.add(cls);
	} else {
		document.documentElement.classList.remove(cls);
		if (document.body) document.body.classList.remove(cls);
	}
}

function doTheThing() {
	var savedTheme = localStorage.getItem('oneshot-theme') || 'theme-barrens';
	var savedWpType = localStorage.getItem('oneshot-wp-type') || 'default';
	var savedWpVal = localStorage.getItem('oneshot-wp-val') || '';
	var savedTwmCursor = localStorage.getItem('oneshot-twm-cursor') === 'true';

	// accessibility stuff.. added 6/9/2026
	var savedReducedMotion = localStorage.getItem('oneshot-reduced-motion') === 'true';
	var savedNoAutoplay = localStorage.getItem('oneshot-no-autoplay') === 'true';
	var savedHighContrast = localStorage.getItem('oneshot-high-contrast') === 'true';
	var savedFontSize = localStorage.getItem('oneshot-font-size') || 'medium';
	var savedDyslexiaFont = localStorage.getItem('oneshot-dyslexia-font') === 'true';

	var target = document.body || document.documentElement;
	if (!target) return;

	document.documentElement.className = savedTheme;
	if (document.body) document.body.className = savedTheme;

	// insert twm cursor function 1/9/2026 2:09 pm for ALL
	if (savedTwmCursor) {
		document.documentElement.classList.add('twm-cursor');
		if (document.body) document.body.classList.add('twm-cursor');
	} else {
		document.documentElement.classList.remove('twm-cursor');
		if (document.body) document.body.classList.remove('twm-cursor');
	}

	// reapplied every doTheThing call same as twm cursor above
	toggleClsBoth('access-high-contrast', savedHighContrast);
	toggleClsBoth('access-dyslexia', savedDyslexiaFont);

	var fsClasses = ['access-font-small', 'access-font-medium', 'access-font-large'];
	for (var fi = 0; fi < fsClasses.length; fi++) toggleClsBoth(fsClasses[fi], false);
	toggleClsBoth('access-font-' + savedFontSize, true);

	// reduced motion will respect manual toggle OR the os setting.  whichever says yes idfc
	var osWantsReduced = false;
	try {
		osWantsReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	} catch (e) {}
	var effectiveReduced = savedReducedMotion || osWantsReduced;
	toggleClsBoth('access-reduced-motion', effectiveReduced);

	// expose so other page scripts (starfield/audio index etc) can check without re-reading localstorage...
	// god forbid a guy cooks up a bit of a hack but it works i guess.........
	window.oneshotReducedMotion = effectiveReduced;
	window.oneshotNoAutoplay = savedNoAutoplay;

	target.style.backgroundImage = 'none';

	if (savedWpType === 'auto') {
		var autoWp = 'static/img/wallpaper/barrensWP.jpg';
		if (savedTheme === 'theme-refuge') autoWp = 'static/img/wallpaper/refugeWP.jpg';
		if (savedTheme === 'theme-glen') autoWp = 'static/img/wallpaper/glenWP.jpg';

		target.style.backgroundImage = 'url("' + autoWp + '")';
		target.style.backgroundSize = 'cover';
		target.style.backgroundPosition = 'center center';
		target.style.backgroundAttachment = 'fixed';
		target.style.backgroundRepeat = 'no-repeat';
	} 
	else if ((savedWpType === 'preset' || savedWpType === 'custom') && savedWpVal) {
		target.style.backgroundImage = 'url("' + savedWpVal + '")';
		target.style.backgroundSize = 'cover';
		target.style.backgroundPosition = 'center center';
		target.style.backgroundAttachment = 'fixed';
		target.style.backgroundRepeat = 'no-repeat';
	}

	var selects = document.querySelectorAll('#themeSelect');
	for (var i = 0; i < selects.length; i++) {
		selects[i].value = savedTheme;
		selects[i].onchange = function (e) {
			var newTheme = e.target.value;
			localStorage.setItem('oneshot-theme', newTheme);
			doTheThing();
		};
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', doTheThing);
} else {
	doTheThing();
}

window.doTheThing = doTheThing;

// +++++
// =========================================
// Analytics START - Initial commit 6/9/2026

// Description:
// Tracks page views. time on page. and clicks everywhere. sitewide, no manual setup for each page needed bc this .js loads on every page already. goes to /api/analytics/track ! see _worker.js
// =========================================
// +++++

var _nrVisitId = null;
var _nrEnterTime = null;
var _nrLeaveSent = false;

function nrViewportBucket() {
	var w = window.innerWidth || document.documentElement.clientWidth;
	if (w < 750) return 'mobile';
	if (w < 1100) return 'tablet';
	return 'desktop';
}

function nrRefDomain() {
	if (!document.referrer) return 'direct';
	try {
		var a = document.createElement('a');
		a.href = document.referrer;
		if (a.hostname === window.location.hostname) return 'internal';
		return a.hostname;
	} catch (e) {
		return 'unknown';
	}
}

function nrBeacon(payload) {
	var data = JSON.stringify(payload);
	try {
		if (navigator.sendBeacon) {
			navigator.sendBeacon('/api/analytics/track', new Blob([data], { type: 'application/json' }));
		} else {
			fetch('/api/analytics/track', { method: 'POST', body: data, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function () {});
		}
	} catch (e) {
		// if it fails it fails its just analytics we dont care if it fails lol!!!!!!!
	}
}

function nrTrackView() {
	_nrVisitId = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
	_nrEnterTime = Date.now();
	_nrLeaveSent = false;

	nrBeacon({
		type: 'view',
		id: _nrVisitId,
		path: window.location.pathname,
		theme: localStorage.getItem('oneshot-theme') || 'theme-barrens',
		referrer: nrRefDomain(),
		viewport: nrViewportBucket()
	});
}

function nrTrackLeave() {
	if (_nrLeaveSent || !_nrVisitId || !_nrEnterTime) return;
	_nrLeaveSent = true;
	nrBeacon({
		type: 'leave',
		id: _nrVisitId,
		timeSpent: Math.round((Date.now() - _nrEnterTime) / 1000)
	});
}

function nrLabelFor(el) {
	if (!el) return 'unknown';
	var label = el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title'));
	if (!label && el.tagName === 'A') label = 'link:' + (el.textContent || el.href || '').trim().substr(0, 50);
	if (!label && el.tagName === 'BUTTON') label = 'btn:' + (el.textContent || '').trim().substr(0, 50);
	if (!label && el.id) label = '#' + el.id;
	if (!label && el.className && typeof el.className === 'string' && el.className.length) label = '.' + el.className.split(' ')[0];
	if (!label) label = el.tagName ? el.tagName.toLowerCase() : 'unknown';
	return label.substr(0, 80);
}

function nrClickHandler(e) {
	var el = e.target;
	var depth = 0;

	while (el && depth < 4 && el.tagName !== 'A' && el.tagName !== 'BUTTON' && el.tagName !== 'SELECT' && el.tagName !== 'INPUT' && !el.id) {
		el = el.parentElement;
		depth++;
	}
	if (!el) el = e.target;

	nrBeacon({
		type: 'click',
		path: window.location.pathname,
		tag: el.tagName ? el.tagName.toLowerCase() : 'unknown',
		label: nrLabelFor(el)
	});
}

function nrInitTracking() {
	nrTrackView();
	document.addEventListener('click', nrClickHandler, true);

	document.addEventListener('visibilitychange', function () {
		if (document.visibilityState === 'hidden') nrTrackLeave();
	});
	window.addEventListener('pagehide', nrTrackLeave);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', nrInitTracking);
} else {
	nrInitTracking();
}