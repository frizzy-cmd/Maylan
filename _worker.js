// _worker.js - 

let siteCache = null;
const SITE_TTL = 30 * 1000;
let settingsReady = false;

// admcooldown
const MAX_FAILS = 6;
const LOCK_MS = 2 * 60 * 1000;
const FAIL_WINDOW = 10 * 60 * 1000; // old misses stop counting after this!
let failTblReady = false;

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

	const good = !!given && !!env.ADMIN_SECRET && safeEq(String(given).trim(), env.ADMIN_SECRET.trim());

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

async function hashIP(ip, salt) {
	// old salt as fb so nothing breaks before IP_SALT is set
	const msgUint8 = new TextEncoder().encode(ip + (salt || '_SALT_KIP_FORUM'));
	const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}