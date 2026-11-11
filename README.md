# homepage!

this readme only covers 1 thing abt the site but here you go anyway









---



# <img width="48" height="48" align="center" src="https://cdn.discordapp.com/emojis/1528790184831877200.webp?size=32"> Alula Editor
**:0 A open-source OneShot save file generator/editor, for people who lost their save files (like me), to experiment, or to the modding community.**
**I recommend you PLEASE do NOT use this tool if you haven't completed the full game w/ the Solstice route. There's nothing stopping you, but it's highly highly recommended to do so.**

## What does Alula Editor have??
- **Dynamic var tracking:** Unlike the older [tool](https://hatkid.is-a.dev/OneShot-SaveMaker/p-settings-generate.html) by [hat_kid](https://github.com/thehatkid) that hardcode playthru vars, Alula Editor dynamically recalculates Marshal [ruby] hex values for cust. loop counts n interacts.
- **Save file configuration:** You can toggle flags for the save files, Do you wanna make the save file think you have beat Solstice and have talked to Rue for the first time? Go ahead and check those boxes at [Alula Editor!](https://maylan.teaa.workers.dev/p-settings-generate)
- **Experimental configuration:** Unlike normal configuration, which just modifies the normal gameplay, this one kinda, modifies the engine. Kinda. For example, Do you wanna disable the save functionality? You can go ahead and do that! There's only 4 experimental options due to the game's limitations, but it's enough.
- **Fixnum encoding:** Rebuilt from the ground up w/ binary length protection to prevent the engine from crashing out when handling unique/long player names.

## ⚠ Please DO NOTE that the save files for the experimental flags [and possibly normal flags, but minimal] may not work due to it being untested, If preferrably, someone could test it for me and state back their experience, it would be nice.

---

## How do I use it?

### Before doing anything, please make sure you actually have launched the game and made the game make it's files, like p-settings.dat or save.dat, etc. If you see p-settings.dat in ```%appdata%/OneShot``` / ```~/Library/Application Support/OneShot``` / ```~/.steam/steam/steamapps/compatdata/420530/pfx/drive_c/users/steamuser/AppData/Roaming/Oneshot```, you're good to go.

- It's simple! Head on over to [Alula Editor](https://maylan.teaa.workers.dev/p-settings-generate).
- Input your desired In-Game Name and flags. I don't recommend using the experimental flags though, but if you wanna, go ahead. There's nothing stopping you.
- Click the **Generate!** button to download your personalized save file.
- Go to ```%appdata%/OneShot``` for Windows, or on Mac, go to ```~/Library/Application Support/OneShot```, or on Linux, go to ```~/.steam/steam/steamapps/compatdata/420530/pfx/drive_c/users/steamuser/AppData/Roaming/Oneshot```. I am unsure if the Mac & Linux paths are correct, but I think they are.
- Move your existing `p-settings.dat` file into any other accessible location (don't put it in the same folder), or delete it, and drop in the new `p-settings.dat` you downloaded from [Alula Editor](https://maylan.teaa.workers.dev/p-settings-generate).
- Done! Easy as that!

---

Alula Editor by [Maylan](https://github.com/frizzy-cmd) | Base code by [hat_kid](https://github.com/thehatkid).
Maylan was here 19/7/2026 2:20 PM UTC+8












