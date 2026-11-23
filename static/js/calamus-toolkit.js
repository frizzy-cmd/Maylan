document.addEventListener('DOMContentLoaded', () => {
	const searchInput = document.getElementById('fileSearch');
	const fileTable = document.getElementById('fileTable');

	if (!searchInput || !fileTable) return;

	searchInput.addEventListener('input', (e) => {
		const query = e.target.value.toLowerCase().trim();
		const rows = fileTable.querySelectorAll('tbody tr');

		rows.forEach(row => {
			if (row.classList.contains('folder-row')) {
				row.style.display = query ? 'none' : '';
				return;
			}
			const text = row.textContent.toLowerCase();
			row.style.display = text.includes(query) ? '' : 'none';
		});
	});
});

// search code for files but lazy to rename
// also forgot to mention not only exclusive to calamus toolkit page.
// keep this name for compatibility reasons..