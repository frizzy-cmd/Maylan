async function loginAdmin() {
    const pwd = document.getElementById('adminPwd').value.trim();
    if (!pwd) return showAlert("Enter the password now.", "error");

    try {
        const res = await fetch('/api/onemsg/admin/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Key': pwd },
            body: JSON.stringify({ test: true })
        });

        if (res.ok) {
            sessionStorage.setItem('kip_admin_token', pwd);
            document.getElementById('loginGate').style.display = 'none';
            document.getElementById('adminControls').style.display = 'block';
            loadSiteStatus();
        } else {
            showAlert(res.status === 429 ? "too many tries, wait 2 mins" : "incorrect", "error");
        }
    } catch (e) { alert(e.message); }
}

async function loadSiteStatus() {
    try {
        const res = await fetch('/api/site/status');
        const data = await res.json();

        const badge = document.getElementById('currentStatusBadge');
        if (data.status === 'offline') {
            badge.textContent = 'OFFLINE';
            badge.className = 'status-badge status-offline';
        } else {
            badge.textContent = 'ONLINE';
            badge.className = 'status-badge status-online';
        }
        document.getElementById('maintenanceNoteInput').value = data.note || '';
    } catch (e) { }
}

async function setSiteStatus(status) {
    const pwd = sessionStorage.getItem('kip_admin_token');
    const note = document.getElementById('maintenanceNoteInput').value.trim();

    const res = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': pwd },
        body: JSON.stringify({ action: 'set_status', status, note })
    });

    if (res.ok) {
        alert(`Site is now ${status.toUpperCase()}!`);
        loadSiteStatus();
    } else {
        alert('didnt work, status ' + res.status);
    }
}

async function publishAnnouncement() {
    const pwd = sessionStorage.getItem('kip_admin_token');
    const announcementText = document.getElementById('announcementTextInput').value.trim();
    const durationMinutes = parseInt(document.getElementById('announcementDuration').value) || 0;
    const closable = document.getElementById('announcementClosable').checked;

    if (!announcementText) return showAlert("Enter text in annon", "error")

    const res = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': pwd },
        body: JSON.stringify({ action: 'set_announcement', announcementText, durationMinutes, closable })
    });

    if (res.ok) {
        showAlert("Broadcasted success!", "success");
    }
}

async function clearAnnouncement() {
    const pwd = sessionStorage.getItem('kip_admin_token');
    const res = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': pwd },
        body: JSON.stringify({ action: 'clear_announcement' })
    });

    if (res.ok) {
        showAlert("Cleared annon successfully", "success")
        document.getElementById('announcementTextInput').value = '';
    }
}