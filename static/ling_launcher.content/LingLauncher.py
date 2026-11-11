import sys
import os
import shutil
import winreg
import psutil
import requests
import json
import time
from PyQt6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
    QComboBox, QPushButton, QLineEdit, QFileDialog, QProgressBar, 
    QMessageBox, QInputDialog, QCheckBox, QTextEdit, QTabWidget, QGroupBox,
    QSystemTrayIcon, QMenu
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer
from PyQt6.QtGui import QIcon, QPixmap, QColor, QPainter, QAction

MOD_PACK = {
    "Rue Studio v0.1-RLS": "https://maylan.teaa.workers.dev/static/rue_studio.content/xScripts.rxdata",
    "Calamus Toolkit v0.5.4-GA": "https://maylan.teaa.workers.dev/static/ckit/xScripts.rxdata",
    "Magpie Collector v0.1-BT": "https://maylan.teaa.workers.dev/static/magpie_collector.content/xScripts.rxdata"
}

# rippped STRAIGHT out from my site bro
THEMES = {
    "Barrens": """
        QWidget { background-color: #200530; color: #f0c0f0; font-family: 'Segoe UI', sans-serif; }
        QGroupBox { border: 1px solid #401560; border-radius: 6px; margin-top: 10px; font-weight: bold; color: #fa9040; }
        QGroupBox::title { subcontrol-origin: margin; left: 10px; padding: 0 3px; }
        QLineEdit, QComboBox, QTextEdit { background-color: #4000a0; border: 1px solid #5a2a7a; color: #f0c0f0; border-radius: 4px; padding: 4px; }
        QPushButton { background-color: #ba6a30; border: 1px solid #603010; color: #200530; font-weight: bold; border-radius: 4px; padding: 6px; }
        QPushButton:hover { background-color: #fa9040; }
        QProgressBar { border: 1px solid #401560; border-radius: 4px; text-align: center; color: #f0c0f0; background-color: #100218; }
        QProgressBar::chunk { background-color: #fa9040; }
        QTabWidget::pane { border: 1px solid #401560; }
        QTabBar::tab { background: #301830; color: #f0c0f0; padding: 8px 12px; border-top-left-radius: 4px; border-top-right-radius: 4px; }
        QTabBar::tab:selected { background: #ba6a30; color: #200530; font-weight: bold; }
    """,
    "Refuge": """
        QWidget { background-color: #240518; color: #f0c0f0; font-family: 'Segoe UI', sans-serif; }
        QGroupBox { border: 1px solid #701538; border-radius: 6px; margin-top: 10px; font-weight: bold; color: #fa9040; }
        QGroupBox::title { subcontrol-origin: margin; left: 10px; padding: 0 3px; }
        QLineEdit, QComboBox, QTextEdit { background-color: #800038; border: 1px solid #a02a58; color: #f0c0f0; border-radius: 4px; padding: 4px; }
        QPushButton { background-color: #d83860; border: 1px solid #701028; color: #240518; font-weight: bold; border-radius: 4px; padding: 6px; }
        QPushButton:hover { background-color: #ff3366; }
        QProgressBar { border: 1px solid #701538; border-radius: 4px; text-align: center; color: #f0c0f0; background-color: #12020c; }
        QProgressBar::chunk { background-color: #ff3366; }
        QTabWidget::pane { border: 1px solid #701538; }
        QTabBar::tab { background: #3a0c20; color: #f0c0f0; padding: 8px 12px; border-top-left-radius: 4px; border-top-right-radius: 4px; }
        QTabBar::tab:selected { background: #d83860; color: #240518; font-weight: bold; }
    """,
    "Glen": """
        QWidget { background-color: #052015; color: #f0c0f0; font-family: 'Segoe UI', sans-serif; }
        QGroupBox { border: 1px solid #156038; border-radius: 6px; margin-top: 10px; font-weight: bold; color: #fa9040; }
        QGroupBox::title { subcontrol-origin: margin; left: 10px; padding: 0 3px; }
        QLineEdit, QComboBox, QTextEdit { background-color: #00a050; border: 1px solid #2a7a4a; color: #f0c0f0; border-radius: 4px; padding: 4px; }
        QPushButton { background-color: #28a058; border: 1px solid #105028; color: #052015; font-weight: bold; border-radius: 4px; padding: 6px; }
        QPushButton:hover { background-color: #40fa90; }
        QProgressBar { border: 1px solid #156038; border-radius: 4px; text-align: center; color: #f0c0f0; background-color: #02100a; }
        QProgressBar::chunk { background-color: #40fa90; }
        QTabWidget::pane { border: 1px solid #156038; }
        QTabBar::tab { background: #183020; color: #f0c0f0; padding: 8px 12px; border-top-left-radius: 4px; border-top-right-radius: 4px; }
        QTabBar::tab:selected { background: #28a058; color: #052015; font-weight: bold; }
    """
}

def get_base_dir():
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

ROOT_IMG = os.path.join(get_base_dir(), "img")
PFP_DIR = os.path.join(ROOT_IMG, "pfp")
ICON_MAIN = os.path.join(ROOT_IMG, "ling.png")
ICON_LIGHT = os.path.join(ROOT_IMG, "iconlight.png")
ICON_NOLIGHT = os.path.join(ROOT_IMG, "iconnolight.png")

APPDATA = os.getenv('APPDATA')
LAUNCHER_DIR = os.path.join(APPDATA, "LingLauncher")
PROFILES_DIR = os.path.join(LAUNCHER_DIR, "SaveProfiles")
CONFIG_PATH = os.path.join(LAUNCHER_DIR, "config.json")
ONESHOT_SAVE_DIR = os.path.join(APPDATA, "Oneshot")

os.makedirs(PROFILES_DIR, exist_ok=True)

# find oneshot dir
def find_oneshot():
    def_path = r"C:\Program Files (x86)\Steam\steamapps\common\OneShot\Data"
    if os.path.exists(def_path):
        return def_path
    try:
        k = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam")
        val, _ = winreg.QueryValueEx(k, "SteamPath")
        winreg.CloseKey(k)
        p = os.path.join(val, "steamapps", "common", "OneShot", "Data")
        if os.path.exists(p):
            return p
    except Exception:
        pass
    return ""

# is oneshot running?
def is_running():
    for p in psutil.process_iter(['name']):
        try:
            if p.info['name'] and p.info['name'].lower() == "oneshot.exe":
                return True
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
    return False

# get icon
def get_icon(path):
    if os.path.exists(path):
        return QIcon(path)
    pm = QPixmap(16, 16)
    pm.fill(QColor("#ba6a30"))
    p = QPainter(pm)
    p.setPen(QColor("#200530"))
    p.drawText(pm.rect(), Qt.AlignmentFlag.AlignCenter, "L")
    p.end()
    return QIcon(pm)

# pings my site which hosts the .rxdata files to see if its alive
class PingWorker(QThread):
    ping_result = pyqtSignal(bool, str)
    def run(self):
        try:
            r = requests.get("https://maylan.teaa.workers.dev/", timeout=5)
            if r.status_code < 500:
                self.ping_result.emit(True, "OK")
            else:
                self.ping_result.emit(False, "Server error")
        except Exception:
            self.ping_result.emit(False, "Offline")

# downloader trhing
class VerbWorker(QThread):
    progress = pyqtSignal(int)
    status_update = pyqtSignal(str)
    finished = pyqtSignal(bool, str)

    def __init__(self, url, target_dir):
        super().__init__()
        self.url = url
        self.target_dir = target_dir
        self.target_file = os.path.join(target_dir, "xScripts.rxdata")
        self.backup_file = os.path.join(target_dir, "beforeInject_xScripts.rxdata.bak")
        self.temp_file = os.path.join(target_dir, "xScripts_download.tmp")

    def run(self):
        try:
            if is_running():
                self.finished.emit(False, "OneShot is currently running! Please close the process, then try again.")
                return

            if os.path.exists(self.target_file) and not os.path.exists(self.backup_file):
                self.status_update.emit("Creating backup (beforeInject_xScripts.rxdata.bak)..")
                shutil.copy2(self.target_file, self.backup_file)
                self.status_update.emit("Backup created successfully!")

            self.status_update.emit(f"Connecting to endpoint: {self.url}...")
            res = requests.get(self.url, stream=True, timeout=15)
            res.raise_for_status()

            total = int(res.headers.get('content-length', 0))
            curr = 0
            chunk_size = 8192
            self.status_update.emit("Downloading rxdata..")

            with open(self.temp_file, 'wb') as f:
                for chunk in res.iter_content(chunk_size=chunk_size):
                    if chunk:
                        f.write(chunk)
                        curr += len(chunk)
                        if total > 0:
                            pct = int((curr / total) * 100)
                            self.progress.emit(pct)
                            self.status_update.emit(f"Downloading: {curr / 1024:.1f} KB / {total / 1024:.1f} KB ({pct}%)")
                        else:
                            self.status_update.emit(f"Downloaded: {curr / 1024:.1f} KB...")

            if total > 0 and curr != total:
                self.clean_temp()
                self.finished.emit(False, "Integrity fail: Download size does not match server content-length!")
                return

            self.status_update.emit("Download verified! Replacing xScripts.rxdata...")
            if os.path.exists(self.target_file):
                os.remove(self.target_file)
            os.rename(self.temp_file, self.target_file)
            self.status_update.emit("Completed injection!")
            self.finished.emit(True, "xScripts.rxdata injected successfully!")

        except requests.RequestException as err:
            self.clean_temp()
            self.finished.emit(False, f"Net error during downloading: {str(err)}")
        except Exception as e:
            self.clean_temp()
            self.finished.emit(False, f"Failed to inject: {str(e)}")

    def clean_temp(self):
        if os.path.exists(self.temp_file):
            try:
                os.remove(self.temp_file)
            except Exception:
                pass

class LingLauncher(QWidget):
    def __init__(self):
        super().__init__()
        self.active_mod = "None"
        self.active_profile = "Default/Vanilla"
        self.profile_pfps = {}
        self.total_session_seconds = 0
        self.current_session_start = None
        self.is_game_active = False
        self.total_playtime = 0
        self.force_exit = False

        self.load_config()
        self.init_ui()
        self.init_tray()
        
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.track_game_process)
        self.timer.start(1000)
        self.ping_server()

    # loads config.json in %appdata\LingLauncher
    def load_config(self):
        if os.path.exists(CONFIG_PATH):
            try:
                with open(CONFIG_PATH, 'r') as f:
                    cfg = json.load(f)
                    self.active_mod = cfg.get("active_mod", "None")
                    self.active_profile = cfg.get("active_profile", "Default/Vanilla")
                    self.profile_pfps = cfg.get("profile_pfps", {})
                    self.profile_notes = cfg.get("profile_notes", {})
                    self.total_playtime = cfg.get("total_playtime", 0)
                    self.current_theme = cfg.get("theme", "Barrens")
            except Exception:
                self.current_theme = "Barrens"
                self.profile_notes = {}
        else:
            self.current_theme = "Barrens"
            self.profile_notes = {}

    #saves config.json in %appdata%\LingLauncher
    def save_config(self):
        prof = self.profile_combo.currentText() if hasattr(self, 'profile_combo') else None
        if prof and hasattr(self, 'notes_box'):
            self.profile_notes[prof] = self.notes_box.toPlainText()

        cfg = {
            "active_mod": self.active_mod,
            "active_profile": self.active_profile,
            "profile_pfps": self.profile_pfps,
            "profile_notes": self.profile_notes,
            "total_playtime": self.total_playtime,
            "theme": self.theme_combo.currentText() if hasattr(self, 'theme_combo') else self.current_theme
        }
        try:
            with open(CONFIG_PATH, 'w') as f:
                json.dump(cfg, f, indent=4)
        except Exception:
            pass

    # this uhh initliliazes ui
    def init_ui(self):
        self.setWindowTitle("Ling Launcher")
        self.setFixedSize(620, 600)
        self.setWindowIcon(get_icon(ICON_MAIN))

        main = QVBoxLayout()

        top = QHBoxLayout()
        top.addWidget(QLabel("Theme:"))
        self.theme_combo = QComboBox()
        self.theme_combo.addItems(["Barrens", "Refuge", "Glen"])
        self.theme_combo.setCurrentText(self.current_theme)
        self.theme_combo.currentTextChanged.connect(self.change_theme)
        top.addWidget(self.theme_combo)

        top.addStretch()
        self.server_status_btn = QPushButton("Ping")
        self.server_status_btn.setIcon(get_icon(ICON_LIGHT))
        self.server_status_btn.clicked.connect(self.ping_server)
        top.addWidget(self.server_status_btn)

        main.addLayout(top)

        self.tabs = QTabWidget()
        
        t1 = QWidget()
        l1 = QVBoxLayout()
        box1 = QGroupBox("Overview")
        b_lay = QVBoxLayout()

        self.mod_badge = QLabel(f"Active mod: {self.active_mod}")
        self.profile_badge = QLabel(f"Active profile: {self.active_profile}")
        self.status_badge = QLabel("Game status: Stopped")
        self.playtime_badge = QLabel("Playtime for this session: 0m 0s | Total: 0.0 hrs")
        
        for w in [self.mod_badge, self.profile_badge, self.status_badge, self.playtime_badge]:
            b_lay.addWidget(w)
        box1.setLayout(b_lay)
        l1.addWidget(box1)

        p_lay = QHBoxLayout()
        self.path_input = QLineEdit(find_oneshot())
        p_lay.addWidget(self.path_input)
        btn_b = QPushButton("Browse..")
        btn_b.clicked.connect(self.browse_folder)
        p_lay.addWidget(btn_b)
        l1.addLayout(p_lay)

        i_lay = QHBoxLayout()
        self.mod_combo = QComboBox()
        self.mod_combo.addItems(list(MOD_PACK.keys()))
        i_lay.addWidget(self.mod_combo)
        self.inject_btn = QPushButton("Inject to OneShot")
        self.inject_btn.clicked.connect(self.start_injection)
        i_lay.addWidget(self.inject_btn)
        l1.addLayout(i_lay)

        self.progress_bar = QProgressBar()
        l1.addWidget(self.progress_bar)

        self.status_label = QLabel("Ready!")
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        l1.addWidget(self.status_label)

        g_box = QGroupBox("QuickControls")
        g_lay = QHBoxLayout()
        btn_launch = QPushButton("Launch OneShot")
        btn_launch.clicked.connect(self.launch_game)
        btn_restart = QPushButton("Restart OneShot")
        btn_restart.clicked.connect(self.restart_game)
        btn_stop = QPushButton("Stop OneShot")
        btn_stop.clicked.connect(self.stop_game)

        for b in [btn_launch, btn_restart, btn_stop]:
            g_lay.addWidget(b)
        g_box.setLayout(g_lay)
        l1.addWidget(g_box)

        self.autoclose_cb = QCheckBox("Close launcher automatically when game boots")
        l1.addWidget(self.autoclose_cb)
        t1.setLayout(l1)

        t2 = QWidget()
        l2 = QVBoxLayout()
        p_sec = QHBoxLayout()
        
        pfp_lay = QVBoxLayout()
        self.pfp_preview = QLabel()
        self.pfp_preview.setFixedSize(64, 64)
        self.pfp_preview.setStyleSheet("border: 1px dashed #5a2a7a;")
        self.pfp_preview.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.pfp_combo = QComboBox()
        self.pfp_combo.currentIndexChanged.connect(self.on_pfp_changed)
        pfp_lay.addWidget(self.pfp_preview)
        pfp_lay.addWidget(self.pfp_combo)
        p_sec.addLayout(pfp_lay)

        p_sel_lay = QVBoxLayout()
        p_sel_lay.addWidget(QLabel("Select save profile:"))
        self.profile_combo = QComboBox()
        self.profile_combo.currentTextChanged.connect(self.on_profile_selected)
        p_sel_lay.addWidget(self.profile_combo)
        p_sec.addLayout(p_sel_lay)

        l2.addLayout(p_sec)

        p_btns = QHBoxLayout()
        btn_load = QPushButton("Switch to profile")
        btn_load.clicked.connect(self.load_selected_profile)
        btn_new = QPushButton("Create new profile")
        btn_new.clicked.connect(self.create_profile)
        btn_ren = QPushButton("Rename this profile")
        btn_ren.clicked.connect(self.rename_profile)
        btn_del = QPushButton("Delete this profile")
        btn_del.clicked.connect(self.delete_profile)

        for b in [btn_load, btn_new, btn_ren, btn_del]:
            p_btns.addWidget(b)
        l2.addLayout(p_btns)

        l2.addWidget(QLabel("Notes for this profile:"))
        self.notes_box = QTextEdit()
        self.notes_box.textChanged.connect(self.on_notes_changed)
        l2.addWidget(self.notes_box)
        t2.setLayout(l2)

        self.tabs.addTab(t1, "General")
        self.tabs.addTab(t2, "Save profiles")
        main.addWidget(self.tabs)

        d_lay = QHBoxLayout()
        b_gdir = QPushButton("Open game directory")
        b_gdir.clicked.connect(self.open_game_dir)
        b_sdir = QPushButton("Open save directory")
        b_sdir.clicked.connect(lambda: self.open_dir(ONESHOT_SAVE_DIR))
        b_ldir = QPushButton("Open LingLauncher directory")
        b_ldir.clicked.connect(lambda: self.open_dir(LAUNCHER_DIR))

        for b in [b_gdir, b_sdir, b_ldir]:
            d_lay.addWidget(b)
        main.addLayout(d_lay)

        self.setLayout(main)
        self.populate_pfps()
        self.refresh_profiles_list()
        self.change_theme(self.current_theme)

    def populate_pfps(self):
        self.pfp_combo.blockSignals(True)
        self.pfp_combo.clear()
        self.pfp_combo.addItem("(None)")
        if os.path.exists(PFP_DIR):
            for f in os.listdir(PFP_DIR):
                if f.lower().endswith(('.png', '.jpg', '.jpeg')):
                    self.pfp_combo.addItem(f)
        self.pfp_combo.blockSignals(False)

    def on_profile_selected(self, prof):
        if not prof:
            return
        pfp = self.profile_pfps.get(prof, "(None)")
        idx = self.pfp_combo.findText(pfp)
        self.pfp_combo.blockSignals(True)
        self.pfp_combo.setCurrentIndex(idx if idx >= 0 else 0)
        self.pfp_combo.blockSignals(False)
        self.update_pfp_preview(pfp)

        self.notes_box.blockSignals(True)
        self.notes_box.setPlainText(self.profile_notes.get(prof, ""))
        self.notes_box.blockSignals(False)

    def on_pfp_changed(self):
        prof = self.profile_combo.currentText()
        pfp = self.pfp_combo.currentText()
        if prof:
            if pfp == "(None)":
                self.profile_pfps.pop(prof, None)
            else:
                self.profile_pfps[prof] = pfp
            self.save_config()
        self.update_pfp_preview(pfp)

    def on_notes_changed(self):
        prof = self.profile_combo.currentText()
        if prof:
            self.profile_notes[prof] = self.notes_box.toPlainText()
            self.save_config()

    def update_pfp_preview(self, fn):
        if fn and fn != "None":
            p = os.path.join(PFP_DIR, fn)
            if os.path.exists(p):
                pix = QPixmap(p).scaled(64, 64, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation)
                self.pfp_preview.setPixmap(pix)
                return
        self.pfp_preview.clear()
        self.pfp_preview.setText("No PFP")

    def init_tray(self):
        self.tray_icon = QSystemTrayIcon(self)
        self.tray_icon.setIcon(get_icon(ICON_LIGHT))
        
        menu = QMenu()
        act_show = QAction("Open Ling Launcher", self)
        act_show.triggered.connect(self.show_window)
        act_exit = QAction("Exit Ling Launcher", self)
        act_exit.triggered.connect(self.quit_app)

        menu.addAction(act_show)
        menu.addSeparator()
        menu.addAction(act_exit)

        self.tray_icon.setContextMenu(menu)
        self.tray_icon.activated.connect(self.on_tray_click)
        self.tray_icon.show()

    def on_tray_click(self, reason):
        if reason == QSystemTrayIcon.ActivationReason.DoubleClick:
            self.show_window()

    def show_window(self):
        self.show()
        self.activateWindow()

    def quit_app(self):
        self.force_exit = True
        self.save_config()
        QApplication.quit()

    def change_theme(self, name):
        if name in THEMES:
            self.setStyleSheet(THEMES[name])
            self.save_config()

    def ping_server(self):
        self.server_status_btn.setText("Pinging..")
        self.ping_worker = PingWorker()
        self.ping_worker.ping_result.connect(self.on_ping_finished)
        self.ping_worker.start()

    def on_ping_finished(self, is_online, status_text):
        icon_path = ICON_LIGHT if is_online else ICON_NOLIGHT
        self.server_status_btn.setIcon(get_icon(icon_path))
        self.server_status_btn.setText(f"Server: {status_text}")

    def refresh_profiles_list(self):
        self.profile_combo.blockSignals(True)
        self.profile_combo.clear()
        profs = [f for f in os.listdir(PROFILES_DIR) if os.path.isdir(os.path.join(PROFILES_DIR, f))]
        self.profile_combo.addItems(profs)
        self.profile_combo.blockSignals(False)
        self.on_profile_selected(self.profile_combo.currentText())

    def track_game_process(self):
        if is_running():
            self.status_badge.setText("Game status: Running")
            self.tray_icon.setIcon(get_icon(ICON_LIGHT))
            if not self.is_game_active:
                self.is_game_active = True
                self.current_session_start = time.time()

            active_span = int(time.time() - self.current_session_start)
            sess = self.total_session_seconds + active_span
            self.total_playtime += 1
            self.save_config()
        else:
            self.status_badge.setText("Game status: Stopped")
            self.tray_icon.setIcon(get_icon(ICON_NOLIGHT))
            if self.is_game_active:
                self.is_game_active = False
                self.total_session_seconds += int(time.time() - self.current_session_start)
                self.current_session_start = None
                self.save_config()
            sess = self.total_session_seconds

        m, s = divmod(sess, 60)
        h, m = divmod(m, 60)
        self.playtime_badge.setText(f"Playtime for this session: {h}h {m}m {s}s | Total: {self.total_playtime / 3600:.2f} hrs")

    def browse_folder(self):
        f = QFileDialog.getExistingDirectory(self, "Select OneShot Data directory")
        if f:
            self.path_input.setText(f)

    def open_game_dir(self):
        p = self.path_input.text().strip()
        if p.lower().endswith(r"\data"):
            p = os.path.dirname(p)
        self.open_dir(p)

    def open_dir(self, p):
        if os.path.exists(p):
            os.startfile(p)
        else:
            QMessageBox.warning(self, "Path error!", f"Directory does not exist:\n{p}")

    def start_injection(self):
        target = self.path_input.text().strip()
        if not target or not os.path.exists(target):
            QMessageBox.critical(self, "Path error!", "The specified OneShot Data directory does not exist.")
            return

        if is_running():
            QMessageBox.warning(self, "Ling", "OneShot is still running!\n\nPlease close the process, then try again.")
            return

        mod = self.mod_combo.currentText()
        self.inject_btn.setEnabled(False)
        self.progress_bar.setValue(0)
        self.status_label.setText("Preparing to inject..")

        self.worker = VerbWorker(MOD_PACK[mod], target)
        self.worker.progress.connect(self.progress_bar.setValue)
        self.worker.status_update.connect(self.status_label.setText)
        self.worker.finished.connect(self.on_finished)
        self.worker.start()

    def on_finished(self, ok, msg):
        self.inject_btn.setEnabled(True)
        if ok:
            self.active_mod = self.mod_combo.currentText()
            self.mod_badge.setText(f"Active mod: {self.active_mod}")
            self.save_config()
            self.status_label.setText("Injection successful!")
            QMessageBox.information(self, "Success", msg)
        else:
            self.status_label.setText("Injection aborted / failed")
            QMessageBox.critical(self, "Injection error", msg)

    def launch_game(self):
        try:
            os.startfile("steam://rungameid/420530")
            if self.autoclose_cb.isChecked():
                self.quit_app()
        except Exception as e:
            QMessageBox.critical(self, "Ling", f"Failed to launch game via Steam: {str(e)}")

    def stop_game(self):
        if not is_running():
            QMessageBox.information(self, "Ling", "OneShot is not currently running.")
            return

        conf = QMessageBox.question(
            self, "Ling", 
            "Force stopping OneShot may cause unsaved progress to be lost, and stuff to be unstable. Continue?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if conf == QMessageBox.StandardButton.Yes:
            for p in psutil.process_iter(['name']):
                if p.info['name'] and p.info['name'].lower() == "oneshot.exe":
                    p.kill()

    def restart_game(self):
        conf = QMessageBox.question(
            self, "Ling", 
            "Restarting OneShot may cause unsaved progress to be lost, and stuff to be unstable. Continue?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if conf == QMessageBox.StandardButton.Yes:
            self.stop_game()
            QTimer.singleShot(1500, self.launch_game)

    def create_profile(self):
        if is_running():
            QMessageBox.warning(self, "Ling", "Please close OneShot before creating save profiles.")
            return

        if not os.path.exists(ONESHOT_SAVE_DIR):
            QMessageBox.critical(self, "Ling", "No active OneShot save directory found in %appdata%.")
            return

        name, ok = QInputDialog.getText(self, "Ling", "Enter new save profile name:")
        if ok and name.strip():
            p_path = os.path.join(PROFILES_DIR, name.strip())
            if os.path.exists(p_path):
                QMessageBox.warning(self, "Ling", "A profile with that name already exists!")
                return
            
            try:
                shutil.copytree(ONESHOT_SAVE_DIR, p_path)
                self.refresh_profiles_list()
                QMessageBox.information(self, "Ling", f"Profile '{name}' created successfully!")
            except Exception as e:
                QMessageBox.critical(self, "Ling", f"Failed to copy save folder: {str(e)}")

    def load_selected_profile(self):
        if is_running():
            QMessageBox.warning(self, "Ling", "Please close OneShot before switching save profiles.")
            return

        prof = self.profile_combo.currentText()
        if not prof:
            return

        target_p = os.path.join(PROFILES_DIR, prof)
        bak_p = os.path.join(APPDATA, "Oneshot_OLD_BEFORE_SWITCH_PROFILE")

        try:
            if os.path.exists(ONESHOT_SAVE_DIR):
                if os.path.exists(bak_p):
                    shutil.rmtree(bak_p)
                os.rename(ONESHOT_SAVE_DIR, bak_p)

            shutil.copytree(target_p, ONESHOT_SAVE_DIR)
            self.active_profile = prof
            self.profile_badge.setText(f"Active profile: {self.active_profile}")
            self.save_config()
            QMessageBox.information(self, "Ling", f"Switched active save profile to '{prof}'!")
        except Exception as e:
            QMessageBox.critical(self, "Ling", f"Failed to switch save profile: {str(e)}")

    def rename_profile(self):
        prof = self.profile_combo.currentText()
        if not prof:
            return

        new_name, ok = QInputDialog.getText(self, "Ling", f"New name for '{prof}':")
        if ok and new_name.strip():
            old_p = os.path.join(PROFILES_DIR, prof)
            new_p = os.path.join(PROFILES_DIR, new_name.strip())
            
            if os.path.exists(new_p):
                QMessageBox.warning(self, "Ling", "A profile with that name already exists!")
                return

            try:
                os.rename(old_p, new_p)
                if prof in self.profile_pfps:
                    self.profile_pfps[new_name.strip()] = self.profile_pfps.pop(prof)
                
                if self.active_profile == prof:
                    self.active_profile = new_name.strip()
                    self.profile_badge.setText(f"Ling: {self.active_profile}")
                
                self.refresh_profiles_list()
                self.save_config()
                QMessageBox.information(self, "Ling", "Profile renamed successfully!")
            except Exception as e:
                QMessageBox.critical(self, "Ling", f"Failed to rename profile: {str(e)}")

    def delete_profile(self):
        prof = self.profile_combo.currentText()
        if not prof:
            return

        conf = QMessageBox.question(
            self, "Ling", 
            f"Are you sure you want to permanently delete profile '{prof}'? This cannot be undone.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if conf == QMessageBox.StandardButton.Yes:
            try:
                shutil.rmtree(os.path.join(PROFILES_DIR, prof))
                self.profile_pfps.pop(prof, None)
                self.refresh_profiles_list()
                self.save_config()
                QMessageBox.information(self, "Ling", f"Profile '{prof}' deleted.")
            except Exception as e:
                QMessageBox.critical(self, "Ling", f"Failed to delete profile: {str(e)}")

    def closeEvent(self, ev):
        if self.force_exit:
            self.save_config()
            ev.accept()
        else:
            ev.ignore()
            self.hide()
            self.tray_icon.showMessage(
                "Ling Launcher",
                "Launcher minimized to system tray.",
                QSystemTrayIcon.MessageIcon.Information,
                2000
            )

if __name__ == "__main__":
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)
    win = LingLauncher()
    win.show()
    sys.exit(app.exec())