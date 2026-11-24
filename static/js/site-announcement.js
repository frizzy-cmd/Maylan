// site-announcement.js
// OMG! FINALLY REWRITTEN AND FIXED BUG! YES!

// btw im pushing this to prod w/o testing bc why not its like russian roulette

let curAnnonTxt = '';

document.addEventListener('DOMContentLoaded', async () => {
	try {
		const res = await fetch('/api/site/announcement');
		if (!res.ok) return;

		const data = await res.json();
		if (!data.active || !data.text) return;

		curAnnonTxt = data.text;

		// skip if user already closed this exact msg
		const dismissed = sessionStorage.getItem('dismissed_site_announcement');
		if (data.closable && dismissed === curAnnonTxt) {
			return;
		}

		const bar = document.createElement('div');
		bar.id = 'siteAnnouncementBar';
		bar.style.cssText = `
			position: fixed;
			bottom: 0; left: 0; right: 0;
			background: #b71c1c;
			color: #ffffff;
			border-top: 3px solid #ff5252;
			padding: 10px 20px;
			font-family: Terminus, monospace;
			font-size: 13pt;
			text-align: center;
			z-index: 99999;
			box-shadow: 0 -4px 16px rgba(0,0,0,0.5);
			display: flex;
			justify-content: space-between;
			align-items: center;
		`;

		bar.innerHTML = `
			<div style="flex: 1; text-align: center;">
				<strong></strong> ${escapeHtml(data.text)}
			</div>
			${data.closable ? `<button onclick="closeSiteAnnouncement()" style="background: transparent; color: #fff; border: 0; font-size: 14pt; cursor: pointer; margin-left: 12px;">✖</button>` : ''}
		`;

		document.body.appendChild(bar);
	} catch (e) {}
});

function closeSiteAnnouncement() {
	const bar = document.getElementById('siteAnnouncementBar');
	if (bar) bar.style.display = 'none';

	const txt = curAnnonTxt || (bar ? bar.textContent.replace('✖', '').trim() : '');
	if (txt) {
		sessionStorage.setItem('dismissed_site_announcement', txt);
	}
}

function escapeHtml(str) {
	if (!str) return '';
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
