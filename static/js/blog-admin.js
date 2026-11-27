// blog-admin.js
// this is the like writer page for blog-admin.html. this talks to /api/blog/admin/*

// if you're here trying to fuck around the admin shit then fuck off laddie

var KEY_NAME = 'maylan_blog_key_thing';
var editingId = 0;
var slugTouched = false;

function $(id) { return document.getElementById(id); }

function esc(str) {
	if (str === null || str === undefined) return '';
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getKey() {
	try { return sessionStorage.getItem(KEY_NAME) || ''; } catch (e) { return ''; }
}

function setMsg(text, bad) {
	var el = $('msg');
	if (!text) { el.style.display = 'none'; return; }
	el.textContent = text;
	el.className = bad ? 'bad' : 'good';
	el.style.display = 'block';
}

async function api(path, method, body) {
	var res = await fetch(path, {
		method: method || 'GET',
		headers: { 'Content-Type': 'application/json', 'X-Admin-Key': getKey() },
		body: body ? JSON.stringify(body) : undefined
	});
	var data = {};
	try { data = await res.json(); } catch (e) { }
	return { ok: res.ok, status: res.status, data: data };
}

function slugify(t) {
	return String(t).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

// login
async function blogLogin() {
	var key = $('blogKey').value.trim();
	if (!key) { $('loginMsg').textContent = 'Enter your key'; return; }

	try { sessionStorage.setItem(KEY_NAME, key); } catch (e) { }
	var r = await api('/api/blog/admin/login', 'POST');

	if (r.ok) {
		$('loginMsg').textContent = '';
		showApp(r.data);
	} else {
		try { sessionStorage.removeItem(KEY_NAME); } catch (e) { }
		$('loginMsg').textContent = r.status === 429 ? 'Too many tries! Wait 2 mins' : 'incorrect';
	}
}

function showApp(who) {
	$('loginGate').style.display = 'none';
	$('app').style.display = 'block';
	$('whoName').textContent = who.name;
	$('whoTag').textContent = who.admin ? ' (Admin, can edit everything)' : '';
	backToList();
}

function blogLogout() {
	try { sessionStorage.removeItem(KEY_NAME); } catch (e) { }
	location.reload();
}

// list

async function loadList() {
	var r = await api('/api/blog/admin/list');
	var body = $('postRows');

	if (!r.ok) {
		setMsg('Couldnt load posts (' + r.status + ')', true);
		return;
	}

	var posts = r.data.posts || [];
	if (!posts.length) {
		body.innerHTML = '<tr><td colspan="6" class="none">No posts, yet. Make a New Post!</td></tr>';
		return;
	}

	var h = '';
	for (var i = 0; i < posts.length; i++) {
		var p = posts[i];
		var pub = p.status === 'published';
		var link = pub
			? '<a href="blog/' + esc(p.slug) + '" target="_blank">/blog/' + esc(p.slug) + '</a>'
			: '/blog/' + esc(p.slug);
		h += '<tr><td>' + esc(p.title) + '</td><td>' + link + '</td>' +
			'<td><span class="badge ' + (pub ? 'pub' : 'draft') + '">' + (pub ? 'published' : 'draft') + '</span></td>' +
			'<td>' + esc(p.author) + '</td>' +
			'<td>' + new Date(p.updated_at).toLocaleString() + '</td>' +
			'<td class="acts"><a onclick="editPost(' + p.id + ')">Edit</a><a onclick="deleteFromList(' + p.id + ')">Delete</a></td></tr>';
	}
	body.innerHTML = h;
}

function backToList() {
	$('viewEdit').style.display = 'none';
	$('viewList').style.display = 'block';
	$('previewBox').style.display = 'none';
	loadList();
}

// editor
function showEditor() {
	$('viewList').style.display = 'none';
	$('viewEdit').style.display = 'block';
	$('previewBox').style.display = 'none';
	sumCount();
	window.scrollTo(0, 0);
}

function newPost() {
	editingId = 0;
	slugTouched = false;
	$('editHead').textContent = 'New post';
	$('fTitle').value = '';
	$('fSlug').value = '';
	$('fSum').value = '';
	$('fBody').value = '';
	$('fStatus').value = 'draft';
	$('btnDelete').style.display = 'none';
	setMsg('');
	showEditor();
}

async function editPost(id) {
	var r = await api('/api/blog/admin/post?id=' + id);
	if (!r.ok) { setMsg(r.data.error || ('couldnt open post (' + r.status + ')'), true); return; }

	var p = r.data.post;
	editingId = p.id;
	slugTouched = true; // dont rewrite the link of an existing post when the title changes
	$('editHead').textContent = 'Edit post';
	$('fTitle').value = p.title;
	$('fSlug').value = p.slug;
	$('fSum').value = p.summary;
	$('fBody').value = p.body;
	$('fStatus').value = p.status;
	$('btnDelete').style.display = 'block';
	setMsg('');
	showEditor();
}

function sumCount() {
	$('sumCount').textContent = $('fSum').value.length + '/200';
}

async function savePost() {
	var slug = slugify($('fSlug').value);
	$('fSlug').value = slug;

	var r = await api('/api/blog/admin/save', 'POST', {
		id: editingId,
		title: $('fTitle').value,
		slug: slug,
		summary: $('fSum').value,
		body: $('fBody').value,
		status: $('fStatus').value
	});

	if (!r.ok) { setMsg(r.data.error || ('Save failed (' + r.status + ')'), true); return; }

	editingId = r.data.id;
	$('editHead').textContent = 'Edit post';
	$('btnDelete').style.display = 'block';
	setMsg($('fStatus').value === 'published' ? 'Saved, published at /blog/' + slug : 'Saved as draft!');
	window.scrollTo(0, 0);
}

async function previewPost() {
	var r = await api('/api/blog/admin/preview', 'POST', { body: $('fBody').value });
	if (!r.ok) { setMsg(r.data.error || 'preview failed', true); return; }

	$('previewBody').innerHTML = r.data.html || '<p>(empty)</p>';
	$('previewBox').style.display = 'block';
	$('previewBox').scrollIntoView();
}

async function removePost(id) {
	var r = await api('/api/blog/admin/delete', 'POST', { id: id });
	if (!r.ok) { setMsg(r.data.error || 'Delete failed!', true); return false; }
	return true;
}

async function deleteCurrent() {
	if (!editingId) return;
	if (!confirm('Delete this post for good?')) return;
	if (await removePost(editingId)) { setMsg('Deleted.'); backToList(); }
}

async function deleteFromList(id) {
	if (!confirm('Delete this post for good?')) return;
	if (await removePost(id)) { setMsg('Deleted.'); loadList(); }
}

// um........ stuff.
document.addEventListener('DOMContentLoaded', function () {
	$('blogKey').addEventListener('keydown', function (e) { if (e.key === 'Enter') blogLogin(); });

	$('fTitle').addEventListener('input', function () {
		if (!slugTouched && !editingId) $('fSlug').value = slugify($('fTitle').value);
	});
	$('fSlug').addEventListener('input', function () {
		slugTouched = true;
		this.value = this.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
	});
	$('fSum').addEventListener('input', sumCount);

	document.addEventListener('keydown', function (e) {
		if ((e.ctrlKey || e.metaKey) && e.key === 's' && $('viewEdit').style.display === 'block') {
			e.preventDefault();
			savePost();
		}
	});

	// is still logged in from tis tab? then skip logni
	if (getKey()) {
		api('/api/blog/admin/login', 'POST').then(function (r) {
			if (r.ok) showApp(r.data);
		});
	}
});
