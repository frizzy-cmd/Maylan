// graphics-index.js 

var GRAPHICS_DATA = {};
var SELECTED = {}; // 'Folder/file.png' -> { folder, file }
var LAST_MATCHES = {}; // what each folder is showing right now (search filter)

function escapeHtml(str) {
	if (!str) return '';
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function toggleCat(folder) {
	var content = document.getElementById('catContent_' + folder);
	var arrow = document.getElementById('catArrow_' + folder);
	if (!content) return;

	if (content.className.indexOf('open') !== -1) {
		content.className = 'category-content';
		if (arrow) arrow.innerHTML = '[ + ]';
	} else {
		content.className = 'category-content open';
		if (arrow) arrow.innerHTML = '[ - ]';
	}
}

function dropdownThingyFolderYea() {
	var select = document.getElementById('folderFilter');
	if (!select) return;

	var html = '<option value="ALL">All folders</option>';
	var sortedFolders = Object.keys(GRAPHICS_DATA).sort();

	for (var i = 0; i < sortedFolders.length; i++) {
		var f = sortedFolders[i];
		var count = GRAPHICS_DATA[f] ? GRAPHICS_DATA[f].length : 0;
		html += '<option value="' + escapeHtml(f) + '">' + escapeHtml(f) + ' (' + count + ')</option>';
	}

	select.innerHTML = html;
}

function makeList(query, selectedFolder) {
	var container = document.getElementById('graphicsCategories');
	var resultCountEl = document.getElementById('resultCount');
	if (!container) return;

	var cleanQuery = (query || '').toLowerCase().trim();
	var cleanFolder = selectedFolder || 'ALL';

	var totalMatches = 0;
	LAST_MATCHES = {};
	var html = '';
	var sortedFolders = Object.keys(GRAPHICS_DATA).sort();

	for (var i = 0; i < sortedFolders.length; i++) {
		var folderName = sortedFolders[i];

//////////////////////////////////asdfasdfjasdiohadgajksdlhgfksdjhgfkdjhngwierjushgsdfgsdfljgksd asnr asnmr asmr asmr asdfkjaskdlfgjsdklgjfsdklgfsdjklgfsdjgklfd
		if (cleanFolder !== 'ALL' && folderName.toLowerCase() !== cleanFolder.toLowerCase()) {
			continue;
		}

		var files = GRAPHICS_DATA[folderName] || [];
		var folderMatches = [];

		for (var j = 0; j < files.length; j++) {
			var file = files[j];
			var matchQuery = (!cleanQuery || file.toLowerCase().indexOf(cleanQuery) !== -1 || folderName.toLowerCase().indexOf(cleanQuery) !== -1);
			if (matchQuery) {
				folderMatches.push(file);
			}
		}

		if (folderMatches.length === 0) {
			continue;
		}

		totalMatches += folderMatches.length;
		LAST_MATCHES[folderName] = folderMatches;

		var isOpen = (cleanQuery.length > 0 || cleanFolder !== 'ALL') ? ' open' : '';
		var arrowTxt = (isOpen !== '') ? '[ - ]' : '[ + ]';

		html += '<div class="category-header" onclick="toggleCat(\'' + escapeHtml(folderName) + '\')">';
		html += '  <span><input type="checkbox" class="cat-sel" data-folder="' + escapeHtml(folderName) + '" title="Select all in this folder" onclick="event.stopPropagation()"> 📁 ' + escapeHtml(folderName) + ' <span style="font-size: 12pt; color: #aaa;">(' + folderMatches.length + ')</span></span>';
		html += '  <span id="catArrow_' + escapeHtml(folderName) + '">' + arrowTxt + '</span>';
		html += '</div>';

		html += '<div id="catContent_' + escapeHtml(folderName) + '" class="category-content' + isOpen + '">';

		for (var k = 0; k < folderMatches.length; k++) {
			var fileName = folderMatches[k];
			var itemKey = 'gfx_' + folderName + '_' + k;
			var filePath = 'static/graphicsindex/' + encodeURIComponent(folderName) + '/' + encodeURIComponent(fileName);

			html += '<div class="graphics-row">';
			html += '  <div class="graphics-top-bar">';
			html += '    <input type="checkbox" class="sel-box" data-folder="' + escapeHtml(folderName) + '" data-file="' + escapeHtml(fileName) + '"' + (SELECTED[folderName + '/' + fileName] ? ' checked' : '') + '>';
			html += '    <div class="graphics-title">';
			html += '      📄 ' + escapeHtml(fileName);
			html += '    </div>';
			html += '    <div class="graphics-actions">';
			html += '      <button class="preview-btn" onclick="togglePrev(\'' + escapeHtml(folderName) + '\', \'' + escapeHtml(fileName) + '\', \'' + itemKey + '\')">▶ Preview</button>';
			html += '      <a href="' + filePath + '" class="download-btn" download="' + escapeHtml(fileName) + '">Download</a>';
			html += '    </div>';
			html += '  </div>';
			
			html += '  <div id="' + itemKey + '_container" class="preview-container">';
			html += '    <div id="' + itemKey + '_body"></div>';
			html += '  </div>';
			html += '</div>';
		}

		html += '</div>';
	}

	if (resultCountEl) {
		resultCountEl.textContent = totalMatches;
	}

	if (totalMatches === 0) {
		container.innerHTML = '<p style="color: #aaa; text-align: center; margin-top: 20px;">No graphic files were found with that name.</p>';
		return;
	}

	container.innerHTML = html;
	updateZipCount();
}

//  handles previewing img./
function togglePrev(folder, file, itemKey) {
	var box = document.getElementById(itemKey + '_container');
	var body = document.getElementById(itemKey + '_body');
	if (!box || !body) return;

	if (box.style.display === 'block') {
		box.style.display = 'none';
		return;
	}

	box.style.display = 'block';
	body.innerHTML = '<span style="color: #aaa;">Loading sprite preview...</span>';

	var filePath = 'static/graphicsindex/' + encodeURIComponent(folder) + '/' + encodeURIComponent(file);

	var img = new Image();
	img.src = filePath;

	img.onload = function() {
		var dimText = img.naturalWidth + ' × ' + img.naturalHeight + ' px';
		var previewHtml = '';
		previewHtml += '<img src="' + filePath + '" class="preview-img" alt="' + escapeHtml(file) + '"><br>';
		previewHtml += '<div class="dim-info">Dimension: <strong>' + dimText + '</strong> | Folder: <code>' + escapeHtml(folder) + '</code></div>';
		body.innerHTML = previewHtml;
	};

	img.onerror = function() {
		body.innerHTML = '<span style="color: #ff6666;">Couldnt load preview for ' + escapeHtml(file) + '</span>';
	};
}

// buildZip in zip-helper.js
function gfxItem(folder, file) {
	return {
		url: 'static/graphicsindex/' + encodeURIComponent(folder) + '/' + encodeURIComponent(file),
		path: folder + '/' + file
	};
}

function updateZipCount() {
	var n = Object.keys(SELECTED).length;
	var cnt = document.getElementById('zipCount');
	var btn = document.getElementById('zipSelBtn');
	if (cnt) cnt.textContent = n + ' selected';
	if (btn) btn.textContent = 'Download selected (' + n + ')';

	var heads = document.querySelectorAll('.cat-sel');
	for (var i = 0; i < heads.length; i++) {
		var f = heads[i].getAttribute('data-folder');
		var list = LAST_MATCHES[f] || [];
		var on = 0;
		for (var j = 0; j < list.length; j++) {
			if (SELECTED[f + '/' + list[j]]) on++;
		}
		heads[i].checked = list.length > 0 && on === list.length;
		heads[i].indeterminate = on > 0 && on < list.length;
	}
}

function zipSelected() {
	var items = [];
	for (var k in SELECTED) items.push(gfxItem(SELECTED[k].folder, SELECTED[k].file));
	buildZip(items, 'Maylan-OneShot-graphics.zip');
}

function zipAll() {
	var items = [];
	for (var folder in GRAPHICS_DATA) {
		var files = GRAPHICS_DATA[folder] || [];
		for (var i = 0; i < files.length; i++) items.push(gfxItem(folder, files[i]));
	}
	buildZip(items, 'Maylan-OneShot-graphics.zip');
	// name of zip when download
}

function clearSelection() {
	SELECTED = {};
	var boxes = document.querySelectorAll('.sel-box');
	for (var i = 0; i < boxes.length; i++) boxes[i].checked = false;
	updateZipCount();
}

document.addEventListener('DOMContentLoaded', function() {
	var searchInput = document.getElementById('graphicsSearch');
	var folderFilter = document.getElementById('folderFilter');

	function updateFilter() {
		var q = searchInput ? searchInput.value : '';
		var f = folderFilter ? folderFilter.value : 'ALL';
		makeList(q, f);
	}

	if (searchInput) searchInput.addEventListener('input', updateFilter);

	// delegated bc the list rebuilt on every search
	document.addEventListener('change', function(e) {
		var t = e.target;
		if (!t || typeof t.className !== 'string') return;

		if (t.className.indexOf('sel-box') !== -1) {
			var fo = t.getAttribute('data-folder');
			var fi = t.getAttribute('data-file');
			if (t.checked) SELECTED[fo + '/' + fi] = { folder: fo, file: fi };
			else delete SELECTED[fo + '/' + fi];
			updateZipCount();
		}
		else if (t.className.indexOf('cat-sel') !== -1) {
			var f = t.getAttribute('data-folder');
			var list = LAST_MATCHES[f] || [];
			for (var i = 0; i < list.length; i++) {
				if (t.checked) SELECTED[f + '/' + list[i]] = { folder: f, file: list[i] };
				else delete SELECTED[f + '/' + list[i]];
			}
			// sync the boxes of that folder
			var boxes = document.querySelectorAll('.sel-box');
			for (var j = 0; j < boxes.length; j++) {
				if (boxes[j].getAttribute('data-folder') !== f) continue;
				boxes[j].checked = !!SELECTED[f + '/' + boxes[j].getAttribute('data-file')];
			}
			updateZipCount();
		}
	});
	if (folderFilter) folderFilter.addEventListener('change', updateFilter);

	// WE GET manifest.json
	fetch('static/graphicsindex/manifest.json')
		.then(function(res) {
			if (!res.ok) throw new Error('Failed to load manifest.json | Try reloading this page, or try clearing your cache and hard reloading.');
			return res.json();
		})
		.then(function(data) {
			GRAPHICS_DATA = data;
			dropdownThingyFolderYea();
			updateFilter();
		})
		.catch(function(err) {
			var container = document.getElementById('graphicsCategories');
			if (container) {
				container.innerHTML = '<p style="color: #ff6666; text-align: center;">Error loading graphic manifest! Try reloading this page</p>';
			}
		});
});