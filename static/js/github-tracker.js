document.addEventListener('DOMContentLoaded', async () => {	const commitContainer = document.getElementById('githubCommitContainer');
	if (!commitContainer) return;

	try {
		const res = await fetch('https://api.github.com/repos/frizzy-cmd/NRHomepage/commits/main');
		if (!res.ok) throw new Error('Network error');

		const data = await res.json();
		const authorName = data.commit?.author?.name || 'Kip';
		const dateObj = new Date(data.commit?.author?.date);
		const formattedDate = dateObj.toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC';
		const shortSha = data.sha ? data.sha.substring(0, 7) : 'a1b2c3d';
		const message = data.commit?.message || 'Placehgolder';

		commitContainer.innerHTML = `
			<div style="font-size: 11pt; border-top: 1px solid var(--box-border); padding-top: 12px; margin-top: 16px;">
				<strong style="color: var(--header-subtitle);">Latest commit:</strong><br>
				<span>Committed by: <strong>Maylan</strong></span> |  
				<span>Date: ${formattedDate}</span><br>
				<span>UniqueID: <code>#${shortSha}</code></span> | 
				<span>Commit: <em>"${message}"</em></span>
			</div>
		`;
	} catch (e) {
		commitContainer.innerHTML = `
			<div style="font-size: 10pt; color: #888; margin-top: 12px;">
				Latest build: Maylan (frizzy-cmd) | Live
			</div>
		`;
	}
});


{/* <span>Committed by: <strong>${authorName}</strong></span> | (replaced with my own name on L18*/} 