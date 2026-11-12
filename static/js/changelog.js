// changelog.js

var WHAT_CHANGED = [
	{
		version: "v1.0.9",
		date: "November 12, 2026",
		category: "Website",
		title: "Name Change & some other stuff",
		changes: [
			"All occurences of Nightregion have been changed to Maylan!",
			"Additional bug fixes & improvements"
		]
	},
	{
		version: "v1.0.8",
		date: "September 26, 2026",
		category: "Website",
		title: "Fallback Site",
		changes: [
			"Incase the main site is down (https://maylan.teaa.workers.dev/), you can visit the fallback site at https://frizzy-cmd.github.io/Maylan/",
			"PLEASE keep in mind that this is a FALLBACK site. Some site features such as the One Message page and other stuff are not available due to Cloudflare issues."
		]
	},
	//
	{
		version: "v1.0.7",
		date: "September 21, 2026",
		category: "Website",
		title: "404 page",
		changes: [
			"Added fuzzy matching to the 404 page! If you mistype a url, it'll try to find a close match and suggest it to you.",
		]
	},
	//
	{
		version: "v1.0.6",
		date: "September 18, 2026",
		category: "Website",
		title: "UI & Cedric Reader",
		changes: [
			"Added a warning to enable JavaScript in some pages that depend heavily on JavaScript.",
			"Disabled 1 useless switch status in cedric-reader.js"
		]
	},
	//
	{
		version: "v1.0.5",
		date: "September 17, 2026",
		category: "Website",
		title: "Verification & UI",
		changes: [
			"Added a new proof of work verification system! Inspired by Anubis, It's called [alulaverify] (or) Alula Verification. As you can guess, Alula is the mascot! It'll give you a 24h cookie when you successfully verify.",
			"For the site down page, Fixed UI cramping on smaller laptop screens, also made it scrollable now"

		]
	},
	//
	{
		version: "v1.0.4",
		date: "September 6, 2026",
		category: "Website",
		title: "Accessiblity & Analytics",
		changes: [
			"Added a new field to the Settings page! Focuses on accessiibility.",
			"I can view analytics thru a admin panel. Dont worry, doesnt track individual and doesnt give personal info. just basic website analytics",
            "Deprecated the [Dev] tag in changelog. Go view GitHub repo for more info on updates",

		]
	},
	//
	{
		version: "v1.0.3",
		date: "September 3, 2026 (sept 2 at time of development)",
		category: "Website",
		title: "Diagnostics",
		changes: [
			"Added a diagnostics page to the homepage!",
            "[Dev] Added twm-diagnostics.js in static/js to handle twm-diagnostics.html",

		]
	},
    {
		version: "v1.0.2",
		date: "September 1, 2026",
		category: "Website",
		title: "Changelog",
		changes: [
			"Added changelog.html",
            "Fixed Alula Editor, js script was giving some TypeErrors so i just removed them completely",
            "Fixed a typo in daily-fact.js, line 136: 'orginally' to 'originally'",
            "Slight changes to the homepage (index.html)",
            "Removed Jay's free will.",
            "[Dev] Added changelog.js in static/js to handle changelog.html",
            "[Dev] Updated p-settings-generate.js in static/js to remove some flags that were causing TypeErrors. They werent tested anyway. and probably didnt work",
            "[Dev] Updated daily-fact.js in static/js to fix a typo at line 136",

		]
	},
    //
	{
		version: "v1.0.1",
		date: "August 31, September 1, 2026",
		category: "Website",
		title: "Themes & Settings & Stuff",
		changes: [
			"Added settings.html with wallpapers from the OneShot TWM edition and other settings!",
			"Added a checkbox for the cursor from the OneShot TWM edition. Only works on desktop browsers, and is disabled on mobile devices.",
            "Added about-me.html",
            "Added about-me-specs.html as additional to about-me.html",
            "Lots more of small tweaks, fixes, and updates to the site.",
			"[Dev] Updated theme-switcher.js in static/js to handle new settings.html & such",
			"[Dev] Created settings.js in static/js to handle settings.html",
            "[Dev] Added twmcursor.png in static/img for the cursor",
            "[Dev] Updated styles.css to handle new cursor func",
            "[Dev] Added about-me-scripts-thing in static/js to handle about-me.html",
            "type alula or fish on the homepage and see where it takes you"
		]
	},
    //
	{
		version: "v1.0.0",
		date: "Somewhere in July/June 2026 i think",
		category: "Website",
		title: "Initial release",
		changes: [
			"Init of this website",
		]
	}
];

function escapeHtml(str) {
	if (!str) return '';
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function renderLst(query, selectedCat) {
	var container = document.getElementById('changelogList');
	var countEl = document.getElementById('changelogCount');
	if (!container) return;

	var cleanQuery = (query || '').toLowerCase().trim();
	var cleanCat = selectedCat || 'ALL';

	var matches = [];
	for (var i = 0; i < WHAT_CHANGED.length; i++) {
		var entry = WHAT_CHANGED[i];
		var matchCat = (cleanCat === 'ALL' || entry.category.toLowerCase() === cleanCat.toLowerCase());

		var textToSearch = (entry.version + ' ' + entry.date + ' ' + entry.title + ' ' + entry.category + ' ' + entry.changes.join(' ')).toLowerCase();
		var matchQuery = (!cleanQuery || textToSearch.indexOf(cleanQuery) !== -1);

		if (matchCat && matchQuery) {
			matches.push(entry);
		}
	}

	if (countEl) countEl.textContent = matches.length;

	if (matches.length === 0) {
		container.innerHTML = '<p style="color: #aaa; text-align: center;">No changelog entries were found with your keywords.</p>';
		return;
	}

	var html = '';
	for (var j = 0; j < matches.length; j++) {
		var item = matches[j];

		html += '<div class="changelog-card">';
		html += '  <div class="changelog-header">';
		html += '    <div>';
		html += '      <span class="ver-tag">' + escapeHtml(item.version) + '</span>';
		html += '      <span class="cat-tag">[' + escapeHtml(item.category) + ']</span>';
		html += '    </div>';
		html += '    <span style="font-size: 11pt; color: #aaa;">' + escapeHtml(item.date) + '</span>';
		html += '  </div>';
		html += '  <div class="changelog-title">' + escapeHtml(item.title) + '</div>';
		html += '  <ul class="changes-list">';

		for (var k = 0; k < item.changes.length; k++) {
			html += '    <li>' + escapeHtml(item.changes[k]) + '</li>';
		}

		html += '  </ul>';
		html += '</div>';
	}

	container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
	renderLst('', 'ALL');

	var searchInput = document.getElementById('changelogSearch');
	var categoryFilter = document.getElementById('categoryFilter');

	function updFil() {
		var q = searchInput ? searchInput.value : '';
		var c = categoryFilter ? categoryFilter.value : 'ALL';
		renderLst(q, c);
	}

	if (searchInput) searchInput.addEventListener('input', updFil);
	if (categoryFilter) categoryFilter.addEventListener('change', updFil);
});