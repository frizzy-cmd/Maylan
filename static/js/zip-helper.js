// zip-helper.js - used by graphics index and audio index
// neds jszip loaded b4 this

var zipBusy = false;

function saveBlob(blob, name) {
	var url = URL.createObjectURL(blob);
	var a = document.createElement('a');
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	a.remove();
	// dont revoke or some dumb browserrs cancel the downlaod here
	setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
}

function setZipStatus(txt) {
	var el = document.getElementById('zipStatus');
	if (el) el.textContent = txt;
}

function lockZipBtns(lock) {
	var btns = document.querySelectorAll('.zip-btn');
	for (var i = 0; i < btns.length; i++) btns[i].disabled = lock;
}

// items = [{ url: '...', path: 'folder/name.ext' }]
async function buildZip(items, zipName) {
	if (zipBusy) return;

	if (typeof JSZip === 'undefined') {
		alert('JSZip could not load sucessfully!! Try reloading the page, and emptying your cache and hard reloading as a last resort.');
		return;
	}
	if (!items.length) {
		alert('Nothing selected! Select some files first.');
		return;
	}
	if (items.length > 20 && !confirm('This will download ' + items.length + ' files and pack them into one zip. Continue?')) return;

	zipBusy = true;
	lockZipBtns(true);

	var zip = new JSZip();
	var queue = items.slice();
	var done = 0;
	var failed = [];

	async function grab() {
		while (queue.length) {
			var it = queue.shift();
			try {
				var res = await fetch(it.url);
				if (!res.ok) throw new Error('http ' + res.status);
				zip.file(it.path, await res.blob());
			} catch (e) {
				failed.push(it.path);
			}
			done++;
			setZipStatus('Downloading ' + done + ' / ' + items.length + '....');
		}
	}

	try {
		// we'll do maybe 4 at a time
		await Promise.all([grab(), grab(), grab(), grab()]);

		if (failed.length === items.length) throw new Error('Lol every file failed to download');

		// no compress bc ogg and png are compressed already but ok
		var blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, function(meta) {
			setZipStatus('Zipping ' + Math.floor(meta.percent) + '%');
		});
		saveBlob(blob, zipName);

		if (failed.length) {
			setZipStatus('Done, but ' + failed.length + ' file(s) failed.');
			alert('Couldnt snatch these, theyre not in the zip:\n' + failed.slice(0, 15).join('\n') + (failed.length > 15 ? '\n..and more' : ''));
		} else {
			setZipStatus('Done! ' + items.length + ' files zipped successfully');
		}
	} catch (e) {
		setZipStatus('');
		alert('Zip failed: ' + e.message);
	} finally {
		zipBusy = false;
		lockZipBtns(false);
	}
}
