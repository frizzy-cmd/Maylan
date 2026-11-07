import tkinter as tk
from tkinter import messagebox
import time
import threading
import os
import sys
import winreg
import psutil
import webbrowser
import requests
from pypresence import Presence
import pystray
from PIL import Image

CLIENT_ID = "1568506118785728532"
DEFAULT_STATUS_PATH = r"C:\Program Files (x86)\Steam\steamapps\common\OneShot\onepresence_status.txt"
REG_PATH = r"Software\Microsoft\Windows\CurrentVersion\Run"
APP_NAME = "OnePresenceRPC"
CURRENT_VERSION = "0.0.1-BT"
CODEBERG_API_URL = "https://codeberg.org/api/v1/repos/kipkat/onepresence/releases"

def load_tray_icon_image():
    if os.path.exists("icon.ico"):
        return Image.open("icon.ico")
    image = Image.new('RGB', (64, 64), color=(43, 43, 43))
    return image

class OnePresenceRPCHandler(tk.Tk):
    def __init__(self):
        super().__init__()

        self.title(f"OnePresence RPC Handler [v{CURRENT_VERSION}]")
        self.geometry("450x640")
        self.resizable(False, False)
        self.configure(bg="#2b2b2b")

        if os.path.exists("icon.ico"):
            try:
                self.iconbitmap("icon.ico")
            except Exception:
                pass

        self.rpc_active = False
        self.manual_intervention = False
        self.solstice_prompted = False
        self.solstice_override = False
        self.rpc = None
        self.start_time = int(time.time())
        self.tray_icon = None

        self.auto_enable_var = tk.BooleanVar(value=True)
        self.autostart_var = tk.BooleanVar(value=self.check_autost_reg())

        self.title_label = tk.Label(
            self, text="OnePresence RPC Handler", 
            font=("Segoe UI", 16, "bold"), 
            bg="#2b2b2b", fg="#ffffff"
        )
        self.title_label.pack(pady=10)

        path_frame = tk.Frame(self, bg="#2b2b2b")
        path_frame.pack(fill="x", padx=20, pady=5)
        
        lbl_path = tk.Label(path_frame, text="Path to OnePresence status .txt file:", bg="#2b2b2b", fg="#cccccc", anchor="w", font=("Segoe UI", 9))
        lbl_path.pack(anchor="w")
        
        self.ent_path = tk.Entry(path_frame, width=48, bg="#363636", fg="white", insertbackground="white", relief="solid", bd=1, font=("Segoe UI", 9))
        self.ent_path.pack(fill="x", pady=2)
        self.ent_path.insert(0, DEFAULT_STATUS_PATH)

        self.toggle_btn = tk.Button(
            self, text="Enable RPC: off", 
            bg="#555555", fg="white", 
            activebackground="#666666", activeforeground="white",
            relief="raised", bd=2, width=20,
            command=self.hi_rpc
        )
        self.toggle_btn.pack(pady=8)

        opt_frame = tk.Frame(self, bg="#363636", bd=2, relief="groove")
        opt_frame.pack(fill="x", padx=20, pady=5)

        self.chk_auto = tk.Checkbutton(
            opt_frame, text="Auto enable RPC on game launch", 
            variable=self.auto_enable_var,
            bg="#363636", fg="#cccccc", selectcolor="#2b2b2b",
            activebackground="#363636", activeforeground="#ffffff"
        )
        self.chk_auto.pack(anchor="w", padx=10, pady=4)

        self.chk_startup = tk.Checkbutton(
            opt_frame, text="Start on Windows boot", 
            variable=self.autostart_var, command=self.tgl_autost,
            bg="#363636", fg="#cccccc", selectcolor="#2b2b2b",
            activebackground="#363636", activeforeground="#ffffff"
        )
        self.chk_startup.pack(anchor="w", padx=10, pady=4)

        self.manual_var = tk.BooleanVar(value=False)
        self.manual_chk = tk.Checkbutton(
            opt_frame, text="Enable manual intervention", 
            variable=self.manual_var, command=self.on_manual,
            bg="#363636", fg="#cccccc", selectcolor="#2b2b2b",
            activebackground="#363636", activeforeground="#ffffff"
        )
        self.manual_chk.pack(anchor="w", padx=10, pady=4)

        self.fields_frame = tk.Frame(self, bg="#363636", bd=2, relief="groove")
        self.fields_frame.pack(pady=5, padx=20, fill="both", expand=True)

        self.lbl_details = tk.Label(self.fields_frame, text="Details:", bg="#363636", fg="#cccccc", anchor="w")
        self.lbl_details.pack(anchor="w", padx=10, pady=(8, 0))
        
        row1 = tk.Frame(self.fields_frame, bg="#363636")
        row1.pack(fill="x", padx=10, pady=2)
        
        self.ent_details = tk.Entry(row1, width=28, bg="#2b2b2b", fg="white", insertbackground="white", relief="solid", bd=1)
        self.ent_details.pack(side="left", padx=(0, 10))
        self.ent_details.config(state="disabled")
        
        self.det_auto_var = tk.BooleanVar(value=True)
        self.chk_det_auto = tk.Checkbutton(
            row1, text="Enable auto-detect", 
            variable=self.det_auto_var, state="disabled", 
            bg="#363636", fg="#cccccc", selectcolor="#2b2b2b",
            activebackground="#363636", activeforeground="#ffffff",
            command=self.upd_auto
        )
        self.chk_det_auto.pack(side="left")

        self.lbl_state = tk.Label(self.fields_frame, text="State:", bg="#363636", fg="#cccccc", anchor="w")
        self.lbl_state.pack(anchor="w", padx=10, pady=(8, 0))
        
        row2 = tk.Frame(self.fields_frame, bg="#363636")
        row2.pack(fill="x", padx=10, pady=2)
        
        self.ent_state = tk.Entry(row2, width=28, bg="#2b2b2b", fg="white", insertbackground="white", relief="solid", bd=1)
        self.ent_state.pack(side="left", padx=(0, 10))
        self.ent_state.config(state="disabled")
        
        self.st_auto_var = tk.BooleanVar(value=True)
        self.chk_st_auto = tk.Checkbutton(
            row2, text="Enable auto-detect", 
            variable=self.st_auto_var, state="disabled", 
            bg="#363636", fg="#cccccc", selectcolor="#2b2b2b",
            activebackground="#363636", activeforeground="#ffffff",
            command=self.upd_auto
        )
        self.chk_st_auto.pack(side="left")

        self.status_lbl = tk.Label(
            self, text="Status: IDLE (Waiting for game..)", 
            font=("Segoe UI", 10), 
            bg="#2b2b2b", fg="#888888"
        )
        self.status_lbl.pack(pady=8)

        self.protocol("WM_DELETE_WINDOW", self.min_to_tray)
        threading.Thread(target=self.check_upd, daemon=True).start()

        self.running = True
        self.monitor_thread = threading.Thread(target=self.bg_loop, daemon=True)
        self.monitor_thread.start()

    def check_upd(self):
        try:
            res = requests.get(CODEBERG_API_URL, timeout=5)
            if res.status_code == 200:
                releases = res.json()
                if releases and len(releases) > 0:
                    latest_rls = releases[0]
                    latest_tag = latest_rls.get("tag_name", "").strip()
                    rls_url = latest_rls.get("html_url", "https://codeberg.org/kipkat/onepresence/releases")

                    #we strip
                    cln_cur = CURRENT_VERSION.lstrip('v')
                    cln_latest = latest_tag.lstrip('v')

                    if cln_latest and cln_latest != cln_cur:
                        ans = messagebox.askyesno(
                            "OnePresence",
                            f"A new update has been detected ({latest_tag}). Update now? You get the latest & stablest version of OnePresence."
                        )
                        if ans:
                            webbrowser.open(rls_url)
        except Exception:
            pass # nothing happen if offline or api is ass

    def check_autost_reg(self):
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, REG_PATH, 0, winreg.KEY_READ)
            winreg.QueryValueEx(key, APP_NAME)
            winreg.CloseKey(key)
            return True
        except:
            return False

    def tgl_autost(self):
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, REG_PATH, 0, winreg.KEY_ALL_ACCESS)
            if self.autostart_var.get():
                exe_path = f'"{os.path.abspath(sys.argv[0])}"'
                winreg.SetValueEx(key, APP_NAME, 0, winreg.REG_SZ, exe_path)
            else:
                try:
                    winreg.DeleteValue(key, APP_NAME)
                except FileNotFoundError:
                    pass
            winreg.CloseKey(key)
        except Exception as e:
            messagebox.showerror("Registry error", f"Failed to add to autostart:\n{e}")

    def hi_rpc(self):
        if not self.rpc_active:
            try:
                self.rpc = Presence(CLIENT_ID)
                self.rpc.connect()
                self.start_time = int(time.time())
                self.rpc_active = True
                self.toggle_btn.config(text="Enable RPC: on", bg="#2d8a4e")
                self.status_lbl.config(text="Status: Connected to Discord!")
            except Exception as e:
                messagebox.showerror("OnePresence", f"Failed to connect to Discord RPC:\n{e}")
        else:
            self.bye_rpc()

    def bye_rpc(self):
        try:
            if self.rpc:
                self.rpc.close()
        except Exception:
            pass
        self.rpc_active = False
        self.toggle_btn.config(text="Enable RPC: off", bg="#555555")
        self.status_lbl.config(text="Status: Disconnected")

    def is_cat_game_running(self):
        for proc in psutil.process_iter(['name']):
            try:
                if proc.info['name'] and proc.info['name'].lower() == "oneshot.exe":
                    return True
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        return False

    def prompt_solstice_topmost(self):
        top = tk.Toplevel(self)
        top.title("OnePresence")
        top.geometry("420x200")
        top.config(bg="#2b2b2b")
        top.attributes("-topmost", True)
        top.resizable(False, False)
        if os.path.exists("icon.ico"):
            try:
                top.iconbitmap("icon.ico")
            except:
                pass
        top.focus_force()

        lbl = tk.Label(
            top, 
            text="OnePresence has detected that you are on the Solstice route.\nIs this true?\n\nIf not, select NO for Normal route. If yes, select YES.",
            bg="#2b2b2b", fg="#ffffff", font=("Segoe UI", 10), justify="center", wraplength=380
        )
        lbl.pack(pady=25)

        res = {"val": True}

        def on_yes():
            res["val"] = True
            top.destroy()

        def on_no():
            res["val"] = False
            top.destroy()

        btn_frame = tk.Frame(top, bg="#2b2b2b")
        btn_frame.pack(pady=10)

        tk.Button(btn_frame, text="YES", width=12, bg="#2d8a4e", fg="white", relief="raised", command=on_yes).pack(side="left", padx=10)
        tk.Button(btn_frame, text="NO", width=12, bg="#8a2d2d", fg="white", relief="raised", command=on_no).pack(side="left", padx=10)

        self.wait_window(top)
        return res["val"]

    def on_manual(self):
        if self.manual_var.get():
            ans = messagebox.askyesno(
                "OnePresence",
                "You are trying to enable manual intervention for the presence. This is used due to incorrect presence or for debugging. It's not recommended to turn this on as OnePresence will automatically update your presence.\n\nDo you still want to PROCEED?" # lake
            )
            if ans:
                self.manual_intervention = True
                self.chk_det_auto.config(state="normal")
                self.chk_st_auto.config(state="normal")
                self.upd_auto()
            else:
                self.manual_var.set(False)
        else:
            self.manual_intervention = False
            self.chk_det_auto.config(state="disabled")
            self.chk_st_auto.config(state="disabled")
            self.ent_details.config(state="disabled")
            self.ent_state.config(state="disabled")
            self.det_auto_var.set(True)
            self.st_auto_var.set(True)

    def upd_auto(self):
        if not self.manual_intervention:
            return

        if not self.det_auto_var.get():
            self.ent_details.config(state="normal", bg="#3b3b3b")
        else:
            self.ent_details.config(state="disabled", bg="#2b2b2b")

        if not self.st_auto_var.get():
            self.ent_state.config(state="normal", bg="#3b3b3b")
        else:
            self.ent_state.config(state="disabled", bg="#2b2b2b")

    def bg_loop(self):
        game_was_running = False

        while self.running:
            time.sleep(0.05)

            status_file_path = self.ent_path.get().strip()

            running = self.is_cat_game_running()
            if not running:
                if game_was_running:
                    game_was_running = False
                    if os.path.exists(status_file_path):
                        try:
                            os.remove(status_file_path)
                        except Exception:
                            pass
                    if self.rpc_active:
                        self.bye_rpc()
                    self.status_lbl.config(text="Status: OneShot closed (IDLE)")
                continue
            else:
                if not game_was_running:
                    game_was_running = True
                    if self.auto_enable_var.get() and not self.rpc_active:
                        self.hi_rpc()

            if not self.rpc_active:
                continue

            if not os.path.exists(status_file_path):
                continue

            try:
                with open(status_file_path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                
                if len(lines) < 3:
                    continue
                
                payload_line = lines[2].strip()
                parts = payload_line.split("|")
                
                p_type = parts[0]
                details = ""
                state = ""

                if p_type == "EXEMPT":
                    continue
                elif p_type == "MAP":
                    if len(parts) < 3:
                        raise ValueError(f"expected at least 3 parts for MAP! got {len(parts)}")
                    details = parts[1]
                    state = parts[2]
                elif p_type == "DIALOGUE":
                    if len(parts) < 4:
                        raise ValueError(f"expected at least 4 parts for DIALOGUE! got {len(parts)}")
                    char = parts[1]
                    region = parts[2]
                    dialogue = parts[3]
                    if char == "Niko":
                        details = f"Niko: {dialogue}"
                        state = f"Talking in {region}"
                    else:
                        details = f"Talking to {char} in {region}"
                        state = f'"{dialogue}"'
                elif p_type == "SOLSTICE":
                    details = parts[1]
                    state = parts[2]
                    if not self.solstice_prompted:
                        self.solstice_prompted = True
                        ans = self.prompt_solstice_topmost()
                        self.solstice_override = ans
                    
                    if self.solstice_override:
                        state = "Solstice route"
                    else:
                        state = "Normal route"
                else:
                    raise ValueError(f"Unknown packet type '{p_type}'")

                final_details = self.ent_details.get() if (self.manual_intervention and not self.det_auto_var.get()) else details
                final_state = self.ent_state.get() if (self.manual_intervention and not self.st_auto_var.get()) else state

                if not self.manual_intervention or self.det_auto_var.get():
                    self.ent_details.config(state="normal")
                    self.ent_details.delete(0, tk.END)
                    self.ent_details.insert(0, details)
                    self.ent_details.config(state="disabled")

                if not self.manual_intervention or self.st_auto_var.get():
                    self.ent_state.config(state="normal")
                    self.ent_state.delete(0, tk.END)
                    self.ent_state.insert(0, state)
                    self.ent_state.config(state="disabled")

                self.rpc.update(
                    details=final_details[:128],
                    state=final_state[:128],
                    start=self.start_time
                )
                self.status_lbl.config(text="Status: Syncing")

            except Exception as e:
                err_text = str(e)
                try:
                    with open(status_file_path, "r", encoding="utf-8") as rf:
                        file_contents = rf.read()
                except Exception:
                    file_contents = "[Could not read file contents]"

                messagebox.showerror(
                    "OnePresence",
                    f"Warning! OnePresence has detected a parsing error in {status_file_path}. If you did not modify this file, please contact the developer [Nightregion] with the error provided below:\n\nError: {err_text}\nfile contents: {file_contents}\n\nTo fix this issue, please select everything in the .txt file, clear everything, then save. This won't affect your gameplay."
                )
                time.sleep(5)

    def min_to_tray(self):
        self.withdraw()
        if not self.tray_icon:
            menu = pystray.Menu(
                pystray.MenuItem("Show OnePresence", self.show_from_tray),
                pystray.MenuItem("Exit OnePresence", self.exit_app)
            )
            image = load_tray_icon_image()
            self.tray_icon = pystray.Icon("OnePresence", image, "OnePresence RPC Handler", menu)
            threading.Thread(target=self.tray_icon.run, daemon=True).start()

    def show_from_tray(self, icon=None, item=None):
        if self.tray_icon:
            self.tray_icon.stop()
            self.tray_icon = None
        self.deiconify()
        self.focus_force()

    def exit_app(self, icon=None, item=None):
        self.running = False
        if self.tray_icon:
            self.tray_icon.stop()
        status_file_path = self.ent_path.get().strip()
        if os.path.exists(status_file_path):
            try:
                os.remove(status_file_path)
            except Exception:
                pass
        try:
            if self.rpc:
                self.rpc.close()
        except Exception:
            pass
        self.destroy()

if __name__ == "__main__":
    app = OnePresenceRPCHandler()
    app.mainloop()