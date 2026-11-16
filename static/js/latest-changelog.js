// latest-changelog.js - this is for the homepage card
// WHAT_CHANGED lives in changelog.js so upd shit here NOT HERE!!

document.addEventListener('DOMContentLoaded', function() {
	var box = document.getElementById('latestChangelog');
	if (!box || typeof WHAT_CHANGED === 'undefined' || !WHAT_CHANGED.length) return;

	var e = WHAT_CHANGED[0]; // new = irst
	var html = '';

	html += '<div class="lc-card">';
	html += '  <div class="lc-head">';
	html += '    <div><span class="lc-ver">' + escapeHtml(e.version) + '</span><span class="lc-title">- ' + escapeHtml(e.title) + '</span></div>';
	html += '    <span class="lc-date">' + escapeHtml(e.date) + '</span>';
	html += '  </div>';
	html += '  <ul class="lc-list">';

	// first 3 only
	for (var i = 0; i < e.changes.length && i < 3; i++) {
		html += '    <li>' + escapeHtml(e.changes[i]) + '</li>';
	}

	html += '  </ul>';
	html += '  <a href="changelog.html">View full changelog..</a>';
	html += '</div>';

	box.innerHTML = html;
});
