// _worker.js - 

let siteCache = null;
const SITE_TTL = 30 * 1000;
let settingsReady = false;

// admcooldown
const MAX_FAILS = 6;
const LOCK_MS = 2 * 60 * 1000;
const FAIL_WINDOW = 10 * 60 * 1000; // old misses stop counting after this!
let failTblReady = false;

// blog
let blogReady = false;

export default {
	async fetch(request, env, ctx) {
		// 1. CORS Headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
			'Content-Type': 'application/json'
		};

		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		if (method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		const db = env.DB || env.forum_db;
		const clientIP = request.headers.get('cf-connecting-ip') || '127.0.0.1';
		const ipHash = await hashIP(clientIP, env.IP_SALT);

		const site = db ? await getSiteStatus(db) : null;
		const siteStatus = site ? site.status : 'online';

		if (siteStatus === 'offline') {
			const isExempt = path === '/admin-panel.html' || 
			                 path === '/admin-panel' || 
			                 path === '/unavail.html' || 
			                 path === '/unavail' || 
			                 path.startsWith('/api/admin/') || 
			                 path.startsWith('/api/site/') || 
			                 path.startsWith('/static/');
			if (!isExempt) {
				return Response.redirect(`${url.origin}/unavail.html`, 302);
			}
		}

		// ALULAVERIFY GATE - added 6/9/2026.. checks for the 'stamp' cookie
		// WHAT IS EXEMPT?: check.html itself, static assets, and all /api/ routes (static assets to break redirects from linglauncher which has old links to rxdatas.)
        const gateFree = path.startsWith('/api/') || path.startsWith('/static/') || path.startsWith('/.well-known/') ||
        path === '/check.html' || path === '/check' ||
        path === '/robots.txt' || path === '/sitemap.xml' ||
        path === '/googlee5b656ace634aa9c.html' || path === '/googlee5b656ace634aa9c';

        if (!gateFree) {
            var uaForGate = (request.headers.get('User-Agent') || '').toLowerCase();
            var previewBotWords = ['discordbot', 'twitterbot', 'slackbot', 'facebookexternalhit', 'telegrambot', 'whatsapp', 'linkedinbot', 'skypeuripreview', 'embedly', 'googlebot', 'bingbot', 'duckduckbot', 'yandexbot', 'applebot'];
            
            var isPreviewBot = false;
            for (var pb = 0; pb < previewBotWords.length; pb++) {
                if (uaForGate.indexOf(previewBotWords[pb]) !== -1) { 
                    isPreviewBot = true; 
                    break; 
                }
            }

            if (!isPreviewBot) {
                var cookieHeader = request.headers.get('Cookie') || '';
                var passMatch = cookieHeader.match(/alula_pass=([^;]+)/);
                var passed = false;

                if (passMatch) {
                    try {
                        var token = decodeURIComponent(passMatch[1]);
                        var tParts = token.split('.');
                        var expiryStr = tParts[0];
                        var sig = tParts[1];
                        var alulaSecret = env.ALULA_SECRET || env.ADMIN_SECRET;
                        var expectedSig = await hmacSign(expiryStr, alulaSecret);

                        if (sig === expectedSig && Date.now() < parseInt(expiryStr, 10)) {
                            passed = true;
                        }
                    } catch (e) { }
                }

                if (!passed) {
                    var dest = encodeURIComponent(path + url.search);
                    return Response.redirect(`${url.origin}/check.html?dest=${dest}`, 302);
                }
            }
        }
		// ALULA VERIFY END

		// BLOG pages. rendered here so every post gets its own embed tags. unknonw  or draft posts go to 404
		if (method === 'GET' && db && (path === '/blog' || path.startsWith('/blog/'))) {
			const blogRes = await renderBlog(db, url);
			if (blogRes) return blogRes;
		}

		if (!path.startsWith('/api/')) {
			if (env.ASSETS) return env.ASSETS.fetch(request);
			return new Response('Asset Not Found', { status: 404 });
		}

		// API FOR ADMIN
		if (path === '/api/site/status' && method === 'GET') {
			let statusVal = 'online';
			let noteVal = '';
			let dbError = null;

			if (!db) {
				dbError = 'D1 database binding (DB) is missing in env';
			} else {
				try {
					await ensureSettingsTable(db);
					const statusRow = await db.prepare(`SELECT value FROM site_settings WHERE key = 'site_status'`).first();
					const noteRow = await db.prepare(`SELECT value FROM site_settings WHERE key = 'maintenance_note'`).first();
					if (statusRow && statusRow.value) statusVal = statusRow.value;
					if (noteRow && noteRow.value) noteVal = noteRow.value;
				} catch(e) {
					dbError = e.message;
				}
			}

			return new Response(JSON.stringify({ 
				status: statusVal, 
				note: noteVal,
				dbError: dbError 
			}), { headers: corsHeaders });
		}

		if (path === '/api/site/announcement' && method === 'GET') {
			let text = '';
			let closable = false;
			let expiresAt = 0;
			let dbError = null;

			if (db) {
				try {
					await ensureSettingsTable(db);
					const textRow = await db.prepare(`SELECT value FROM site_settings WHERE key = 'announcement_text'`).first();
					const closeRow = await db.prepare(`SELECT value FROM site_settings WHERE key = 'announcement_closable'`).first();
					const expRow = await db.prepare(`SELECT value FROM site_settings WHERE key = 'announcement_expires'`).first();

					if (textRow && textRow.value) text = textRow.value;
					if (closeRow && closeRow.value) closable = (closeRow.value === 'true');
					if (expRow && expRow.value) expiresAt = parseInt(expRow.value) || 0;
				} catch (e) {
					dbError = e.message;
				}
			}

			if (expiresAt > 0 && Date.now() > expiresAt) {
				text = '';
			}

			return new Response(JSON.stringify({
				active: !!text,
				text: text,
				closable: closable,
				expiresAt: expiresAt,
				dbError: dbError
			}), { headers: corsHeaders });
		}

		if (path === '/api/admin/site-settings' && method === 'POST') {
			const auth = await checkAdmin(env, ipHash, request.headers.get('X-Admin-Key'));
			if (!auth.ok) return authFail(auth, corsHeaders);

			const body = await request.json();
			const { action, status, note, announcementText, closable, durationMinutes } = body;

			try {
				if (action === 'set_status') {
					siteCache = null; // so the new status shows instantly
					await env.DB.prepare(`DELETE FROM site_settings WHERE key = 'site_status'`).run();
					await env.DB.prepare(`INSERT INTO site_settings (key, value) VALUES ('site_status', ?)`).bind(status || 'online').run();

					await env.DB.prepare(`DELETE FROM site_settings WHERE key = 'maintenance_note'`).run();
					await env.DB.prepare(`INSERT INTO site_settings (key, value) VALUES ('maintenance_note', ?)`).bind(note || '').run();
				}
				else if (action === 'set_announcement') {
					let expTimestamp = 0;
					if (durationMinutes && durationMinutes > 0) {
						expTimestamp = Date.now() + durationMinutes * 60 * 1000;
					}

					await env.DB.prepare(`DELETE FROM site_settings WHERE key = 'announcement_text'`).run();
					await env.DB.prepare(`INSERT INTO site_settings (key, value) VALUES ('announcement_text', ?)`).bind(announcementText || '').run();

					await env.DB.prepare(`DELETE FROM site_settings WHERE key = 'announcement_closable'`).run();
					await env.DB.prepare(`INSERT INTO site_settings (key, value) VALUES ('announcement_closable', ?)`).bind(closable ? 'true' : 'false').run();

					await env.DB.prepare(`DELETE FROM site_settings WHERE key = 'announcement_expires'`).run();
					await env.DB.prepare(`INSERT INTO site_settings (key, value) VALUES ('announcement_expires', ?)`).bind(expTimestamp.toString()).run();
				}
				else if (action === 'clear_announcement') {
					await env.DB.prepare(`DELETE FROM site_settings WHERE key LIKE 'announcement_%'`).run();
				}

				return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
			} catch (e) {
				return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
			}
		}

		// ANALYTICS
		// Yers no key!
		if (path === '/api/analytics/track' && method === 'POST') {
			try {
				const body = await request.json();

				await env.DB.prepare(
					`CREATE TABLE IF NOT EXISTS page_views (
						id TEXT PRIMARY KEY,
						path TEXT,
						theme TEXT,
						referrer TEXT,
						viewport TEXT,
						day TEXT,
						time_spent INTEGER DEFAULT 0,
						visit_hash TEXT,
						created_at INTEGER
					)`
				).run();

				await env.DB.prepare(
					`CREATE TABLE IF NOT EXISTS click_events (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						path TEXT,
						tag TEXT,
						label TEXT,
						day TEXT,
						created_at INTEGER
					)`
				).run();

				const today = new Date().toISOString().slice(0, 10);

				if (body.type === 'view') {
					await env.DB.prepare(
						`INSERT OR IGNORE INTO page_views (id, path, theme, referrer, viewport, day, time_spent, visit_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
					).bind(body.id || ('v_' + Date.now()), body.path || '', body.theme || '', body.referrer || '', body.viewport || '', today, ipHash, Date.now()).run();
				}
				else if (body.type === 'leave') {
					await env.DB.prepare(
						`UPDATE page_views SET time_spent = ? WHERE id = ?`
					).bind(body.timeSpent || 0, body.id || '').run();
				}
				else if (body.type === 'click') {
					await env.DB.prepare(
						`INSERT INTO click_events (path, tag, label, day, created_at) VALUES (?, ?, ?, ?, ?)`
					).bind(body.path || '', body.tag || '', body.label || '', today, Date.now()).run();
				}

				return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
			} catch (e) {
				// dont wanna break the site incase it says bye! woopsies!
				return new Response(JSON.stringify({ success: false }), { headers: corsHeaders });
			}
		}

		if (path === '/api/admin/analytics/summary' && method === 'GET') {
			const auth = await checkAdmin(env, ipHash, request.headers.get('X-Admin-Key'));
			if (!auth.ok) return authFail(auth, corsHeaders);

			try {
				const topPages = await env.DB.prepare(
					`SELECT path, COUNT(*) as views, AVG(time_spent) as avgTime FROM page_views GROUP BY path ORDER BY views DESC LIMIT 20`
				).all();

				const referrers = await env.DB.prepare(
					`SELECT referrer, COUNT(*) as cnt FROM page_views GROUP BY referrer ORDER BY cnt DESC LIMIT 10`
				).all();

				const viewports = await env.DB.prepare(
					`SELECT viewport, COUNT(*) as cnt FROM page_views GROUP BY viewport`
				).all();

				const themes = await env.DB.prepare(
					`SELECT theme, COUNT(*) as cnt FROM page_views GROUP BY theme`
				).all();

				const dailyViews = await env.DB.prepare(
					`SELECT day, COUNT(*) as cnt FROM page_views GROUP BY day ORDER BY day DESC LIMIT 14`
				).all();
				// CUNT LOL
				// longley

				const topClicks = await env.DB.prepare(
					`SELECT path, tag, label, COUNT(*) as cnt FROM click_events GROUP BY path, tag, label ORDER BY cnt DESC LIMIT 30`
				).all();

				const totals = await env.DB.prepare(
					`SELECT COUNT(*) as totalViews, AVG(time_spent) as avgTimeAll FROM page_views`
				).first();

				return new Response(JSON.stringify({
					totals: totals || { totalViews: 0, avgTimeAll: 0 },
					topPages: topPages.results || [],
					referrers: referrers.results || [],
					viewports: viewports.results || [],
					themes: themes.results || [],
					dailyViews: dailyViews.results || [],
					topClicks: topClicks.results || []
				}), { headers: corsHeaders });
			} catch (e) {
				return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
			}
		}
		// ANALYTICS DASHBOARD END

		// ALULAVERIFY START - challenge endpoint and hands out the puzzle
		if (path === '/api/alulaverify/challenge' && method === 'POST') {
			var alulaSecret1 = env.ALULA_SECRET || env.ADMIN_SECRET;
			var difficulty = giveADifficulty(request);
			var rawSalt = randomHex(16);
			var challengeExpiry = Date.now() + (2 * 60 * 1000); // 2 min to solve it.. OR ELSE!!
			var fullSalt = rawSalt + '.' + difficulty + '.' + challengeExpiry;
			var signature = await hmacSign(fullSalt, alulaSecret1);

			return new Response(JSON.stringify({
				salt: fullSalt,
				difficulty: difficulty,
				signature: signature
			}), { headers: corsHeaders });
		}

		// ALULAVERIFY - verify endpoint, checks the solved puzzle and says user is ok
		if (path === '/api/alulaverify/verify' && method === 'POST') {
			var alulaSecret2 = env.ALULA_SECRET || env.ADMIN_SECRET;
			var vBody = await request.json();
			var vSalt = vBody.salt;
			var vNonce = vBody.nonce;
			var vSig = vBody.signature;

			if (!vSalt || vNonce === undefined || !vSig) {
				return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: corsHeaders });
			}

			var expectedSig2 = await hmacSign(vSalt, alulaSecret2);
			if (expectedSig2 !== vSig) {
				return new Response(JSON.stringify({ error: 'Bad signature' }), { status: 403, headers: corsHeaders });
			}

			var saltParts = vSalt.split('.');
			var vDifficulty = parseInt(saltParts[1]) || 4;
			var vExpiry = parseInt(saltParts[2]) || 0;

			if (Date.now() > vExpiry) {
				return new Response(JSON.stringify({ error: 'Challenge expired, refresh the page' }), { status: 403, headers: corsHeaders });
			}

			var hashInput = vSalt + vNonce;
			var enc2 = new TextEncoder().encode(hashInput);
			var hashBuf2 = await crypto.subtle.digest('SHA-256', enc2);
			var hashArr2 = Array.from(new Uint8Array(hashBuf2));
			var hashHex = hashArr2.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');

			var target = '0'.repeat(vDifficulty);
			if (hashHex.substring(0, vDifficulty) !== target) {
				return new Response(JSON.stringify({ error: 'PoW check failed' }), { status: 403, headers: corsHeaders });
			}

			// if solved say its good for 24h
			// safe for wrangler dev
			var passExpiry = Date.now() + (24 * 60 * 60 * 1000);
			var passSig = await hmacSign(passExpiry.toString(), alulaSecret2);
			var secureFlag = url.protocol === 'https:' ? '; Secure' : '';
			var cookieVal = 'alula_pass=' + passExpiry + '.' + passSig + '; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax' + secureFlag;

			return new Response(JSON.stringify({ success: true }), {
				headers: Object.assign({}, corsHeaders, { 'Set-Cookie': cookieVal })
			});
		}
		//ALULAVERIFY END

		// BLOG writer api (blog-admin.html)
		if (path.startsWith('/api/blog/admin/')) {
			return blogAdminApi(request, env, url, ipHash, corsHeaders);
		}

		// removed some old code here

		try {
            //fetch all msgs
			if (path === '/api/onemsg/messages' && method === 'GET') {
				const fingerprint = url.searchParams.get('fp') || '';
				
				let countRow = { cnt: 0 };
				try {
					countRow = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM messages`).first() || { cnt: 0 };
				} catch(e) {}

				let messages = { results: [] };
				try {
					messages = await env.DB.prepare(`SELECT id, msg_number, author, portrait, content, lights_count, pancakes_count, created_at FROM messages ORDER BY msg_number DESC LIMIT 100`).all();
				} catch(e) {}

				let userCheck = null;
				if (fingerprint) {
					try {
						userCheck = await env.DB.prepare(
							`SELECT id FROM messages WHERE device_fingerprint = ? OR ip_hash = ?`
						).bind(fingerprint, ipHash).first();
					} catch(e) {}
				}

				return new Response(JSON.stringify({
					totalCount: countRow.cnt || 0,
					hasPosted: !!userCheck,
					messages: messages.results || []
				}), { headers: corsHeaders });
			}

			// submit new msg
			if (path === '/api/onemsg/messages' && method === 'POST') {
                const body = await request.json();
                const { author, content, portrait, fingerprint } = body;

                const cleanAuthor = String(author || 'Anonymous').trim() || 'Anonymous';
                const cleanContent = String(content || '').trim();
                let cleanPortrait = String(portrait || 'niko.png').trim();
                // fb to niko.png
                if (!/^[A-Za-z0-9_]{1,40}\.png$/.test(cleanPortrait)) cleanPortrait = 'niko.png';
                // fp comes from client so cap it
                const cleanFp = String(fingerprint || 'none').slice(0, 64);

                if (cleanContent.length > 280) {
                    return new Response(JSON.stringify({ error: 'Message is too long (max 280 characters)!' }), { status: 400, headers: corsHeaders });
                }

                if (cleanAuthor.length > 32) {
                    return new Response(JSON.stringify({ error: 'Username is too long (max 32 characters)!' }), { status: 400, headers: corsHeaders });
                }

                if (!cleanContent) {
                    return new Response(JSON.stringify({ error: 'Message cannot be empty!' }), { status: 400, headers: corsHeaders });
                }

                let existingMsg = null;
                try {
                    existingMsg = await env.DB.prepare(
                        `SELECT id FROM messages WHERE device_fingerprint = ? OR ip_hash = ? OR LOWER(author) = LOWER(?)`
                    ).bind(cleanFp, ipHash, cleanAuthor).first();
                } catch(e) {}

                if (existingMsg) {
                    return new Response(JSON.stringify({ error: 'You have already left your OneMessage on the wall!' }), { status: 403, headers: corsHeaders });
                }

                let topRow = null;
                try {
                    topRow = await env.DB.prepare(`SELECT MAX(msg_number) as hi FROM messages`).first();
                } catch(e) {}

                const msgNumber = ((topRow && topRow.hi) || 0) + 1;
                const id = 'msg_' + Date.now();

                await env.DB.prepare(
                    `INSERT INTO messages (id, msg_number, author, portrait, content, ip_hash, device_fingerprint) VALUES (?, ?, ?, ?, ?, ?, ?)`
                ).bind(id, msgNumber, cleanAuthor, cleanPortrait, cleanContent, ipHash, cleanFp).run();

                return new Response(JSON.stringify({ success: true, id, msgNumber }), { headers: corsHeaders });
            }

			// reactAPI
			if (path === '/api/onemsg/react' && method === 'POST') {
				const body = await request.json();
				const { msgId, reaction } = body;

				if (reaction === 'light') {
					await env.DB.prepare(`UPDATE messages SET lights_count = lights_count + 1 WHERE id = ?`).bind(msgId).run();
				} else if (reaction === 'pancake') {
					await env.DB.prepare(`UPDATE messages SET pancakes_count = pancakes_count + 1 WHERE id = ?`).bind(msgId).run();
				}

				return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
			}

            //adm login
            if (path === '/api/onemsg/admin/login' && method === 'POST') {
                const body = await request.json();
                const auth = await checkAdmin(env, ipHash, body.password);
                if (!auth.ok) return authFail(auth, corsHeaders);
                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            }

			// adm delete and purge
			if (path === '/api/onemsg/admin/delete' && method === 'POST') {
                const auth = await checkAdmin(env, ipHash, request.headers.get('X-Admin-Key'));
                if (!auth.ok) return authFail(auth, corsHeaders);

				const body = await request.json();
				const { msgId, purgeAll } = body;

				if (purgeAll) {
					await env.DB.prepare(`DELETE FROM messages`).run();
				} else if (msgId) {
					await env.DB.prepare(`DELETE FROM messages WHERE id = ?`).bind(msgId).run();
				}

				return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
			}

			return new Response(JSON.stringify({ error: 'Endpoint Not Found' }), { status: 404, headers: corsHeaders });

		} catch (e) {
			return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
		}
	}
};

// ALULA VERIFY CHECKING START!!!!!!

async function hmacSign(data, secret) {
	var enc = new TextEncoder();
	var key = await crypto.subtle.importKey(
		'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
	);
	var sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(data));
	var sigArr = Array.from(new Uint8Array(sigBuf));
	return sigArr.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

function randomHex(len) {
	var bytes = new Uint8Array(len);
	crypto.getRandomValues(bytes);
	return Array.from(bytes).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

// crappy scoring.. higher flags = more suspicious = harder puzzle
function giveADifficulty(request) {
	var flags = 0;
	var ua = (request.headers.get('User-Agent') || '').toLowerCase();
	var acceptLang = request.headers.get('Accept-Language');
	// var accept = request.headers.get('Accept') || '';
	// Take this shit out bc it was taking 5-10 secs to GET THRU VERIFICATION. during npx wrangler dev
	// upd: since tooken out, diff 3 and almost instant! nice shiiiiiiiiiiitt #terrydavis

	if (!ua) flags++;

	var botWords = ['bot', 'crawl', 'spider', 'scrapy', 'python-requests', 'curl', 'wget', 'headless', 'phantom']; // ill just try anything here
	for (var i = 0; i < botWords.length; i++) {
		if (ua.indexOf(botWords[i]) !== -1) { flags++; break; }
	}

	if (!acceptLang) flags++;
	// if (!accept || accept === '*/*') flags++;f

	if (flags >= 3) return 6; // 6 is actually impossible. like its there but its like IMPOSSIBLE TO REACH. best igot using curl was 5 diff.
	if (flags >= 1) return 5;
	return 3;
}

async function ensureSettingsTable(db) {
	if (settingsReady) return;
	await db.prepare(`CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`).run();
	settingsReady = true;
}

async function getSiteStatus(db) {
	const now = Date.now();
	if (siteCache && now - siteCache.ts < SITE_TTL) return siteCache;

	let status = 'online';
	let note = '';
	try {
		const rows = await db.prepare(`SELECT key, value FROM site_settings WHERE key IN ('site_status', 'maintenance_note')`).all();
		for (const r of (rows.results || [])) {
			if (r.key === 'site_status' && r.value) status = r.value;
			if (r.key === 'maintenance_note' && r.value) note = r.value;
		}
	} catch (e) {
		// db hiccup, dont cache it so the next req retries
		return { status: 'online', note: '', ts: 0 };
	}

	siteCache = { status, note, ts: now };
	return siteCache;
}

function safeEq(a, b) {
	a = String(a || '');
	b = String(b || '');
	let diff = a.length ^ b.length;
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
	}
	return diff === 0;
}

async function checkAdmin(env, ipHash, given) {
	const ok = !!given && !!env.ADMIN_SECRET && safeEq(String(given).trim(), env.ADMIN_SECRET.trim());
	return lockGate(env, ipHash, ok);
}

// the cooldown part. shared by the admin panel and the blog writers
async function lockGate(env, ipHash, good) {
	const db = env.DB || env.forum_db;
	const now = Date.now();
	let row = null;

	try {
		if (!failTblReady) {
			await db.prepare(`CREATE TABLE IF NOT EXISTS login_fails (ip_hash TEXT PRIMARY KEY, fails INTEGER DEFAULT 0, locked_until INTEGER DEFAULT 0, last_try INTEGER DEFAULT 0)`).run();
			failTblReady = true;
		}
		row = await db.prepare(`SELECT fails, locked_until, last_try FROM login_fails WHERE ip_hash = ?`).bind(ipHash).first();
	} catch (e) {
		// dont lock me out
	}

	if (row && row.locked_until > now) {
		return { ok: false, locked: true, wait: Math.ceil((row.locked_until - now) / 1000) };
	}

	

	try {
		if (good) {
			if (row) await db.prepare(`DELETE FROM login_fails WHERE ip_hash = ?`).bind(ipHash).run();
		} else {
			let fails = (row && now - row.last_try < FAIL_WINDOW) ? row.fails + 1 : 1;
			let lockedUntil = 0;
			if (fails >= MAX_FAILS) {
				lockedUntil = now + LOCK_MS;
				fails = 0;
			}
			await db.prepare(`INSERT OR REPLACE INTO login_fails (ip_hash, fails, locked_until, last_try) VALUES (?, ?, ?, ?)`).bind(ipHash, fails, lockedUntil, now).run();
		}
	} catch (e) {}

	return { ok: good, locked: false, wait: 0 };
}

function authFail(auth, headers) {
	if (auth.locked) {
		return new Response(JSON.stringify({ error: 'Too many tries, wait ' + auth.wait + 's' }), {
			status: 429,
			headers: Object.assign({}, headers, { 'Retry-After': String(auth.wait) })
		});
	}
	return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
}

// BLOG
// Pages, markdown, writer API
// added 11/27/2026

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BLOG_MAX_BODY = 30000;

async function ensureBlogTable(db) {
	if (blogReady) return;
	await db.prepare(
		`CREATE TABLE IF NOT EXISTS blog_posts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			slug TEXT NOT NULL UNIQUE,
			title TEXT NOT NULL,
			summary TEXT NOT NULL DEFAULT '',
			body TEXT NOT NULL DEFAULT '',
			author TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'draft',
			created_at INTEGER,
			updated_at INTEGER,
			published_at INTEGER
		)`
	).run();
	blogReady = true;
}

// Writer keys are in BLOG_WRITERS secret as json so like {"Name":"key","Name":"key"} etc..
// ADMIN_SECRET always (should) work and posts as Maylan by default, and can also edit and delete any post (teehee)
async function checkBlog(env, ipHash, given) {
	const key = String(given || '').trim();
	let who = null;

	if (key) {
		if (env.ADMIN_SECRET && safeEq(key, env.ADMIN_SECRET.trim())) {
			who = { name: 'Maylan', admin: true };
		} else {
			let writers = {};
			try { writers = JSON.parse(env.BLOG_WRITERS || '{}'); } catch (e) {}
			for (const n of Object.keys(writers)) {
				if (safeEq(key, String(writers[n]).trim())) who = { name: n, admin: false };
			}
		}
	}

	const res = await lockGate(env, ipHash, !!who);
	res.who = res.ok ? who : null;
	return res;
}

function escHtml(s) {
	return String(s === null || s === undefined ? '' : s)
		.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function htmlRes(html) {
	return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function fmtDate(ts) {
	if (!ts) return '';
	return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

// Only http(s) or a root path, so no javascript: links!
function safeUrl(u) {
	return /^(https?:\/\/[^\s<>]+|\/(?!\/)[^\s<>]*)$/i.test(u) ? u : null;
}

// This strips markdown to plaintext for embed desc/search
function plainText(md, n) {
	const t = String(md || '')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/^(#{1,3}|-#|-)\s+/gm, '')
		.replace(/[*_]{1,3}/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	return t.length > n ? t.slice(0, n).trim() + '…' : t;
}

function firstImage(md, origin) {
	const m = String(md || '').match(/!\[[^\]]*\]\(([^)\s]+)\)/);
	if (!m) return null;
	if (/^https?:\/\//i.test(m[1])) return m[1];
	if (/^\/(?!\/)/.test(m[1])) return origin + m[1];
	return null;
}

// MARKDOWN!!
// ![img](url)
// [link}(url)
// ***__x__***
// and etc ig
function mdInline(t) {
	const stash = [];
	const keep = (h) => '\u0000' + (stash.push(h) - 1) + '\u0000';

	t = escHtml(String(t).replace(/\u0000/g, ''));

	t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, u) => {
		u = safeUrl(u);
		return u ? keep('<img src="' + u + '" alt="' + alt + '" loading="lazy" referrerpolicy="no-referrer">') : m;
	});

	t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, u) => {
		u = safeUrl(u);
		return u ? keep('<a href="' + u + '" target="_blank" rel="noopener nofollow">') + txt + keep('</a>') : m;
	});

	t = t.replace(/\*\*\*__(.+?)__\*\*\*/g, '<strong><em><u>$1</u></em></strong>')
		.replace(/\*\*__(.+?)__\*\*/g, '<strong><u>$1</u></strong>')
		.replace(/\*__(.+?)__\*/g, '<em><u>$1</u></em>')
		.replace(/__(.+?)__/g, '<u>$1</u>')
		.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/\*(?!\s)(.+?)(?<!\s)\*/g, '<em>$1</em>');

	return t.replace(/\u0000(\d+)\u0000/g, (m, i) => stash[i]);
}

function renderMd(src) {
	const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
	const out = [];
	let para = [];
	let list = [];

	const flush = () => {
		if (para.length) { out.push('<p>' + para.map(mdInline).join('<br>') + '</p>'); para = []; }
		if (list.length) { out.push('<ul>' + list.map((i) => '<li>' + mdInline(i) + '</li>').join('') + '</ul>'); list = []; }
	};

	for (const line of lines) {
		let m;
		if (!line.trim()) { flush(); continue; }

		if ((m = line.match(/^(#{1,3})\s+(.+)$/))) {
			flush();
			out.push('<h' + m[1].length + '>' + mdInline(m[2]) + '</h' + m[1].length + '>');
		} else if ((m = line.match(/^-#\s+(.+)$/))) {
			flush();
			out.push('<small class="sm">' + mdInline(m[1]) + '</small>');
		} else if (/^---+\s*$/.test(line)) {
			flush();
			out.push('<hr>');
		} else if ((m = line.match(/^-\s+(.+)$/))) {
			if (para.length) flush();
			list.push(m[1]);
		} else {
			if (list.length) flush();
			para.push(line);
		}
	}
	flush();
	return out.join('\n');
}

// the html on a blog post
function blogShell(url, o) {
	const origin = url.origin;
	const img = o.image || (origin + '/static/img/logo.png');
	const card = o.image ? 'summary_large_image' : 'summary';

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<base href="/">
	<meta name="title" content="${escHtml(o.title)} - Maylan's Homepage">
	<meta name="description" content="${escHtml(o.desc)}">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="theme-color" content="#5a207f">

	<meta property="og:type" content="${o.type}">
	<meta property="og:site_name" content="Maylan's Homepage">
	<meta property="og:title" content="${escHtml(o.title)}">
	<meta property="og:description" content="${escHtml(o.desc)}">
	<meta property="og:url" content="${escHtml(origin + url.pathname)}">
	<meta property="og:image" content="${escHtml(img)}">
	<meta name="twitter:card" content="${card}">

	<link rel="icon" type="image/png" href="static/img/iconlight.png">
	<link rel="stylesheet" href="static/styles.css">
	<script src="static/js/theme-switcher.js"></script>
	<script src="static/js/site-announcement.js" defer></script>
	<title>${escHtml(o.title)} - Maylan's Homepage</title>

	<style>
		.search-box {
			width: 100%;
			padding: 8px 12px;
			margin-bottom: 14px;
			background: var(--input-bg);
			color: #ffffff;
			border: 2px solid var(--box-border);
			font-family: Terminus, monospace;
			font-size: 13pt;
			box-sizing: border-box;
			border-radius: 3px;
		}
		.search-box:focus { outline: none; border-color: var(--header-subtitle); }
		.post-card {
			display: block;
			background: rgba(18, 6, 28, 0.85);
			border: 2px solid var(--box-border);
			padding: 16px 20px;
			margin-bottom: 16px;
			border-radius: 6px;
			color: inherit;
			text-decoration: none;
		}
		.post-card:hover { border-color: var(--header-subtitle); text-decoration: none; }
		.pc-title { font-size: 16pt; color: #ffffff; overflow-wrap: anywhere; }
		.pc-meta { font-size: 11pt; color: #a890b0; margin: 4px 0 8px 0; }
		.pc-sum { font-size: 12pt; color: #e0d0e0; line-height: 1.5; overflow-wrap: anywhere; }
		.post-title { margin: 0 0 8px 0; font-size: 22pt; text-align: left; overflow-wrap: anywhere; }
		.post-meta { font-size: 11pt; color: #a890b0; margin-bottom: 20px; }
		.post-body { font-size: 13pt; line-height: 1.6; color: #e0d0e0; overflow-wrap: anywhere; }
		.post-body h1, .post-body h2, .post-body h3 {
			margin: 24px 0 10px 0;
			text-align: left;
			text-shadow: none;
			color: var(--header-subtitle);
		}
		.post-body h1 { font-size: 20pt; }
		.post-body h2 { font-size: 17pt; }
		.post-body h3 { font-size: 15pt; }
		.post-body p { margin: 0 0 14px 0; }
		.post-body img { max-width: 100%; height: auto; display: block; margin: 10px 0; }
		.post-body small.sm { display: block; font-size: 10pt; color: #8a7a92; margin: 0 0 10px 0; }
		.post-body ul { margin: 0 0 14px 0; padding-left: 22px; }
		.post-body hr { border: 0; border-top: 2px solid var(--box-border); margin: 20px 0; }
		.empty { color: #aaa; font-size: 12pt; }
	</style>
</head>
<body>
	<div id="header">
		<a href="index.html" style="text-decoration: none;">
			<img id="logo" src="static/img/logo.png" alt="OneShot Logo" title="Go to Homepage">
		</a>
	</div>

	${o.content}

	<div id="footer">
		This website was made by <a href="https://github.com/frizzy-cmd" target="_blank">Maylan</a> |
		<a href="index.html">Homepage</a> |
		<a href="legal.html">Legal</a> |
		<a href="https://github.com/frizzy-cmd/NRHomepage" target="_blank">Source Code</a>

		<div class="theme-picker">
			<span>Theme: </span>
			<select id="themeSelect" class="theme-dropdown">
				<option value="theme-barrens">The Barrens (Purple)</option>
				<option value="theme-refuge">The Refuge (Pink/Red)</option>
				<option value="theme-glen">The Glen (Emerald Green)</option>
			</select>
		</div>
	</div>

	<div id="sub-footer">
		OneShot and its assets are property of Future Cat LLC.
	</div>
</body>
</html>`;
}

function indexPage(url, rows) {
	let cards = '';
	for (const r of rows) {
		const sum = r.summary || plainText(r.peek, 140);
		const hay = (r.title + ' ' + r.summary + ' ' + r.author + ' ' + plainText(r.peek, 400)).toLowerCase();
		cards += '<a class="post-card" href="blog/' + escHtml(r.slug) + '" data-s="' + escHtml(hay) + '">' +
			'<div class="pc-title">' + escHtml(r.title) + '</div>' +
			'<div class="pc-meta">' + fmtDate(r.published_at) + ' &middot; by ' + escHtml(r.author) + '</div>' +
			(sum ? '<div class="pc-sum">' + escHtml(sum) + '</div>' : '') +
			'</a>';
	}

	const content = `<div id="message">
		<h3>Blog</h3>
		Posts from Maylan and sometimes, friends. Search by title, author or keyword
	</div>

	<div id="box">
		<input type="text" id="blogSearch" class="search-box" placeholder="Search posts.." autocomplete="off">
		<div style="font-size: 12pt; color: #aaa; margin-bottom: 16px;">
			Showing a total of <strong id="blogCount" style="color: var(--header-subtitle);">${rows.length}</strong> posts
		</div>
		${cards}
		<div class="empty" id="blogNone" style="display: ${rows.length ? 'none' : 'block'};">${rows.length ? 'No posts match that!' : 'No posts yet, check back later!'}</div>
	</div>

	<script>
		(function () {
			var q = document.getElementById('blogSearch');
			var cards = document.querySelectorAll('.post-card');
			var cnt = document.getElementById('blogCount');
			var none = document.getElementById('blogNone');
			function run() {
				var t = q.value.toLowerCase().trim();
				var n = 0;
				for (var i = 0; i < cards.length; i++) {
					var hit = !t || cards[i].getAttribute('data-s').indexOf(t) !== -1;
					cards[i].style.display = hit ? '' : 'none';
					if (hit) n++;
				}
				cnt.textContent = n;
				none.textContent = 'No posts match that!';
				none.style.display = n ? 'none' : 'block';
			}
			q.addEventListener('input', run);
		})();
	</script>`;

	return blogShell(url, {
		title: 'Blog',
		desc: 'Posts from Maylan and friends.',
		type: 'website',
		content: content
	});
}

function postPage(url, p) {
	const desc = p.summary || plainText(p.body, 160);
	const content = `<div id="box">
		<h1 class="post-title">${escHtml(p.title)}</h1>
		<div class="post-meta">${fmtDate(p.published_at)} &middot; by ${escHtml(p.author)}</div>
		<div class="post-body">${renderMd(p.body)}</div>
		<p style="margin: 24px 0 0 0;"><a href="blog">&larr; All posts</a></p>
	</div>`;

	return blogShell(url, {
		title: p.title,
		desc: desc,
		type: 'article',
		image: firstImage(p.body, url.origin),
		content: content
	});
}

// return a Reponse or null so normal 404 handles
async function renderBlog(db, url) {
	try {
		await ensureBlogTable(db);
		const rest = url.pathname.replace(/^\/blog\/?/, '').replace(/\/+$/, '');

		if (!rest) {
			const rows = await db.prepare(
				`SELECT slug, title, summary, author, published_at, substr(body, 1, 400) AS peek FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 100`
			).all();
			return htmlRes(indexPage(url, rows.results || []));
		}

		let slug = '';
		try { slug = decodeURIComponent(rest).toLowerCase(); } catch (e) { return null; }
		if (!SLUG_RE.test(slug)) return null;

		const post = await db.prepare(
			`SELECT slug, title, summary, body, author, published_at FROM blog_posts WHERE slug = ? AND status = 'published'`
		).bind(slug).first();
		if (!post) return null;

		return htmlRes(postPage(url, post));
	} catch (e) {
		return null;
	}
}

async function blogAdminApi(request, env, url, ipHash, headers) {
	const path = url.pathname;
	const method = request.method;
	const db = env.DB || env.forum_db;
	const out = (obj, status) => new Response(JSON.stringify(obj), { status: status || 200, headers });

	const auth = await checkBlog(env, ipHash, request.headers.get('X-Admin-Key'));
	if (!auth.ok) return authFail(auth, headers);
	const me = auth.who;

	try {
		await ensureBlogTable(db);

		if (path === '/api/blog/admin/login' && method === 'POST') {
			return out({ success: true, name: me.name, admin: me.admin });
		}

		if (path === '/api/blog/admin/list' && method === 'GET') {
			const cols = `SELECT id, slug, title, author, status, updated_at, published_at FROM blog_posts`;
			const q = me.admin
				? db.prepare(cols + ` ORDER BY updated_at DESC LIMIT 200`)
				: db.prepare(cols + ` WHERE author = ? ORDER BY updated_at DESC LIMIT 200`).bind(me.name);
			const rows = await q.all();
			return out({ posts: rows.results || [] });
		}

		if (path === '/api/blog/admin/post' && method === 'GET') {
			const id = parseInt(url.searchParams.get('id'), 10) || 0;
			const p = await db.prepare(`SELECT id, slug, title, summary, body, author, status FROM blog_posts WHERE id = ?`).bind(id).first();
			if (!p) return out({ error: 'Post not found' }, 404);
			if (!me.admin && p.author !== me.name) return out({ error: 'Not your post pal' }, 403);
			return out({ post: p });
		}

		if (path === '/api/blog/admin/preview' && method === 'POST') {
			const b = await request.json();
			return out({ html: renderMd(String(b.body || '').slice(0, BLOG_MAX_BODY)) });
		}

		if (path === '/api/blog/admin/save' && method === 'POST') {
			const b = await request.json();
			const title = String(b.title || '').trim();
			const slug = String(b.slug || '').trim().toLowerCase();
			const summary = String(b.summary || '').trim();
			const text = String(b.body || '').replace(/\r\n?/g, '\n');
			const status = b.status === 'published' ? 'published' : 'draft';
			const id = parseInt(b.id, 10) || 0;

			if (!title) return out({ error: 'Title is empty' }, 400);
			if (title.length > 120) return out({ error: 'Title is too long (max 120)' }, 400);
			if (!slug || !SLUG_RE.test(slug) || slug.length > 80) return out({ error: 'Link can only be a-z, 0-9 and dashes (max 80), like my-first-post' }, 400);
			if (summary.length > 200) return out({ error: 'Summary is too long (max 200)' }, 400);
			if (!text.trim()) return out({ error: 'Post is empty' }, 400);
			if (text.length > BLOG_MAX_BODY) return out({ error: 'Post is too long (max ' + BLOG_MAX_BODY + ' chars)' }, 400);

			const now = Date.now();

			if (id) {
				const old = await db.prepare(`SELECT id, author, published_at FROM blog_posts WHERE id = ?`).bind(id).first();
				if (!old) return out({ error: 'Post not found' }, 404);
				if (!me.admin && old.author !== me.name) return out({ error: 'Not your post' }, 403);

				// Keep orig pub date if it was pub before.
				const pubAt = status === 'published' ? (old.published_at || now) : old.published_at;
				await db.prepare(
					`UPDATE blog_posts SET slug = ?, title = ?, summary = ?, body = ?, status = ?, updated_at = ?, published_at = ? WHERE id = ?`
				).bind(slug, title, summary, text, status, now, pubAt, id).run();
				return out({ success: true, id: id });
			}

			const r = await db.prepare(
				`INSERT INTO blog_posts (slug, title, summary, body, author, status, created_at, updated_at, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
			).bind(slug, title, summary, text, me.name, status, now, now, status === 'published' ? now : null).run();
			return out({ success: true, id: r.meta.last_row_id });
		}

		if (path === '/api/blog/admin/delete' && method === 'POST') {
			const b = await request.json();
			const id = parseInt(b.id, 10) || 0;
			const old = await db.prepare(`SELECT id, author FROM blog_posts WHERE id = ?`).bind(id).first();
			if (!old) return out({ error: 'Post not found' }, 404);
			if (!me.admin && old.author !== me.name) return out({ error: 'Not your post to delete pal' }, 403);
			await db.prepare(`DELETE FROM blog_posts WHERE id = ?`).bind(id).run();
			return out({ success: true });
		}

		// from my friend:
		// "How am I supposed to read any of this"
		// "You on some crazy ass shit dude how does anyone learn this"

		return out({ error: 'Endpoint Not Found' }, 404);
	} catch (e) {
		if (/UNIQUE/i.test(e.message)) return out({ error: 'That link is already used by another post!' }, 409);
		return out({ error: e.message }, 500);
	}
}

async function hashIP(ip, salt) {
	// old salt as fb so nothing breaks before IP_SALT is set
	const msgUint8 = new TextEncoder().encode(ip + (salt || '_SALT_KIP_FORUM'));
	const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!
// TODO: DONT USE THIS FUCKING FILE ANYMORE FOR SERVER SHIT MAKE ANOTHER ONE!