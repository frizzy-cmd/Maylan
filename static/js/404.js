// 404.js - fuzzy matches a mistyped url against real pages and suggests a link if it finds a close match.
// only suggests if something is close (calamus-menu) per example and gibberish (ajsdfugasdjgfasdD) shows nothing

var REAL_PAGES = [
	'index', 'about-me', 'about-me-specs', 'alula', 'audio-index',
	'calamus-toolkit', 'cedric-reader', 'changelog', 'graphics-index',
	'isthatagubby', 'legal', 'ling-launcher', 'magpie-collector',
	'onemsg', 'p-settings-generate', 'rue-studio', 'settings', 'twm-diagnostics', 'onepresence'
];

// classic levenshtein.. nothing fancy
function editDist(a, b) {
	var m = a.length, n = b.length;
	var d = [];
	for (var i = 0; i <= m; i++) d.push([i]);
	for (var j = 0; j <= n; j++) d[0][j] = j;

	for (var i = 1; i <= m; i++) {
		for (var j = 1; j <= n; j++) {
			if (a.charAt(i - 1) === b.charAt(j - 1)) {
				d[i][j] = d[i - 1][j - 1]; // scary stuff
			} else {
				d[i][j] = 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
			}
		}
	}
	return d[m][n];
}

function cleanShit(p) {
	p = p.toLowerCase();
	if (p.charAt(0) === '/') p = p.substring(1);
	if (p.charAt(p.length - 1) === '/') p = p.substring(0, p.length - 1);
	p = p.replace(/\.html$/, '');
	var segs = p.split('/');
	return segs[segs.length - 1]; // just the last segment. ignore subfolders
}

// IM MAD.!
function findShit() {
	var attempted = cleanShit(window.location.pathname);
	if (!attempted) return null;

	var best = null;
	var bestDist = 999;

	for (var i = 0; i < REAL_PAGES.length; i++) {
		var dist = editDist(attempted, REAL_PAGES[i]);
		if (dist < bestDist) {
			bestDist = dist;
			best = REAL_PAGES[i];
		}
	}

	var threshold = Math.max(2, Math.floor(best ? best.length / 2.5 : 0));
	if (bestDist <= threshold) return best;
	return null;
}

document.addEventListener('DOMContentLoaded', function () {
	var suggestion = findShit();
	var box = document.getElementById('suggestBox');
	if (!box) return;

	if (suggestion) {
		box.innerHTML = 'Did you mean: <a href="' + suggestion + '.html">' + suggestion + '.html</a>?';
		box.style.display = 'block';
	} else {
		box.style.display = 'none';
	}
});