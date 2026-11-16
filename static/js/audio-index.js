// audio-index.js

var BGM_FILES = [
	"30 Factory.ogg", "AGod'sMachine.ogg", "ambience2.ogg", "ambience3.ogg", "ambience4.ogg", "ambience.ogg",
	"AviateOld.ogg", "Aviator.ogg", "ChildrenOfTheRuins.ogg", "ChildrenOfTheRuins_piano.ogg", "Collapse_loop.ogg",
	"Collapse.ogg", "computer_room.ogg", "Countdown.ogg", "DarkStairwell.ogg", "DeepMines.ogg", "DeepMinesPiano.ogg",
	"Distant.ogg", "EleventhHour.ogg", "Encounter.ogg", "Factory.ogg", "FactoryQuiet.ogg", "Geothermal.ogg",
	"Home.ogg", "InMemory.ogg", "IntoTheLight.ogg", "LibraryStroll.ogg", "MinesAmbience.ogg", "MinesAmbienceWind.ogg",
	"mines maybe.ogg", "MyBurdenIsDead.ogg", "MyBurdenIsLight.ogg", "NavigateExtended.ogg", "Navigate.ogg",
	"NikoAndTheWorldMachine.ogg", "OnLittleCatFeet.ogg", "OnLittleCatFeetPiano.ogg", "Panic.ogg", "Phosphor_dark.ogg",
	"Phosphor.ogg", "PrettyBad.ogg", "PrettyNiceDay.ogg", "Pretty.ogg", "puzzle-solved-remix.wav", "Rowbot.ogg",
	"SelfContainedUniverse.ogg", "SelfContainedUniversePiano.ogg", "SelfContainedUniverseReprise.ogg", "SilverPoint.ogg",
	"SimpleSecrets.ogg", "Solstice.ogg", "SomeplaceIKnow.ogg", "SonderExtendedGuitar.ogg", "SonderExtended.ogg",
	"Sonder.ogg", "Sunrise.ogg", "TheAuthor.ogg", "TheTower2.ogg", "TheTower.ogg", "ToDream.ogg", "ToSleep.ogg", "unreality.ogg"
];

var BGS_FILES = [
	"robot_room.mp3", "teleport_boop.wav", "tv_static.ogg"
];

var ME_FILES = [
	"crescendo.wav", "get_item.wav", "HELLO.wav", "hungry.wav", "instruction1.wav", "instruction2.wav",
	"item_get_cut_off.wav", "item_get.wav", "major_puzzle_solved.wav", "phone_dialtone.wav", "phone_number.wav",
	"phone_outgoing.wav", "sheep_victory.wav"
];

var SE_FILES = [
	"bell.wav", "branch_snap.wav", "camera_printing.wav", "camera_shutter1.wav", "camera_shutter2.wav",
	"camera_vintage.wav", "cat_1.wav", "cat_2.wav", "cat_3.wav", "cat_purr.wav", "clippers.wav", "debris.wav",
	"ding.wav", "dip.wav", "door_close_heavy.wav", "door_close.wav", "door_locked.wav", "door_open.wav",
	"door_unlock.wav", "elevator_bang.wav", "elevator_break.wav", "elevator_close.wav", "elevator_open.wav",
	"elevator_rumble.wav", "elevator_start.wav", "elevator_stop.wav", "fade_in2.wav", "fade_in_echo.wav",
	"fade_in_fast_echo.wav", "fade_in.wav", "fire_light.wav", "fridge_close.wav", "fridge_open.wav", "glitch1.wav",
	"glitch2.wav", "glitch3.wav", "gurgle.wav", "HELLO_big.wav", "item_get.wav", "Kick.wav", "lock_into_place.wav",
	"menu_buzzer.wav", "menu_cancel.wav", "menu_cursor.wav", "menu_decision.wav", "page.wav", "pc_denied.wav",
	"pc_granted.wav", "pc_logon.wav", "pc_messagebox.wav", "pc_off.wav", "pc_on.wav", "pen.wav", "phone_dialtone.wav",
	"phone_outgoing.wav", "quake.wav", "robot_room.mp3", "robot_spin2.wav", "robot_spin.wav", "secret.wav",
	"seed_drop.wav", "shatter.wav", "sheep1.wav", "sheep2.wav", "sheep3.wav", "sheep4.wav", "sheep5.wav",
	"sheep6.wav", "sheep7.wav", "sheep_demon.wav", "small_quake.wav", "spark.wav", "square-death - Copy.wav",
	"square-death.wav", "step_boat.wav", "step_grass.wav", "step_grate_soft.wav", "step_grate.wav", "step_gravel.wav",
	"step_metal01.wav", "step_metal02.wav", "step_metal03.wav", "step_metal04.wav", "step_splash2.wav",
	"step_splash3.wav", "step_splash4.wav", "step_splash5.wav", "step_splash6.wav", "step_splash.wav",
	"step_tile01.wav", "step_tile02.wav", "step_tile03.wav", "step_tile04.wav", "step_tile_echo.wav",
	"step_tile_soft01.wav", "step_tile_soft02.wav", "step_tile_soft03.wav", "step_tile_soft04.wav", "step_wood.wav",
	"take_lens_out.wav", "teleport_long.wav", "teleport.wav", "text_robot.wav", "text.wav", "tick.wav",
	"title_cursor.wav", "title_decision.wav", "tock.wav", "wheel_squeak1.wav", "wheel_squeak.wav"
];

var currentCategory = 'bgm';
var currentPlaylist = BGM_FILES;
var currentIndex = 0;

// fae if you're seeing this 
// this is my rewrite of my escapehtml code since i write too good js code apparently smh
function escapeHtml(str) {
	if (!str) return '';
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

// seconds to MM:SS
function formatTime(seconds) {
	if (isNaN(seconds) || seconds === Infinity || seconds <= 0) return '--:--';
	var mins = Math.floor(seconds / 60);
	var secs = Math.floor(seconds % 60);
	if (mins < 10) mins = '0' + mins;
	if (secs < 10) secs = '0' + secs;
	return mins + ':' + secs;
}

function renderAudioList(elementId, folder, files) {
	var container = document.getElementById(elementId);
	if (!container) return;

	var html = '';
	for (var i = 0; i < files.length; i++) {
		var file = files[i];
		var filePath = 'static/audioindex/' + folder + '/' + encodeURIComponent(file);
		var durId = 'dur_' + folder + '_' + i;

		html += '<div class="audio-row" data-filename="' + escapeHtml(file.toLowerCase()) + '">';
		html += '  <input type="checkbox" class="sel-box" data-folder="' + folder + '" data-i="' + i + '">';
		html += '  <div class="audio-title">';
		html += '    📄 ' + escapeHtml(file);
		html += '    <span id="' + durId + '" class="audio-duration">--:--</span>';
		html += '  </div>';
		html += '  <div class="audio-controls-container">';
		html += '    <button class="play-row-btn" onclick="playTrack(\'' + folder + '\', ' + i + ')">▶ Play</button>';
		html += '    <a href="' + filePath + '" class="download-btn" download="' + escapeHtml(file) + '">Download</a>';
		html += '  </div>';
		html += '</div>';

		fetchDuration(filePath, durId);
	}

	container.innerHTML = html;
}

//selfexp
function fetchDuration(filePath, elementId) {
	var audio = new Audio();
	audio.preload = 'metadata';
	audio.src = filePath;
	audio.onloadedmetadata = function() {
		var el = document.getElementById(elementId);
		if (el && audio.duration) {
			el.innerHTML = formatTime(audio.duration);
		}
	};
}

//selfexp
function playTrack(category, index) {
	currentCategory = category;
	if (category === 'bgm') currentPlaylist = BGM_FILES;
	else if (category === 'bgs') currentPlaylist = BGS_FILES;
	else if (category === 'me') currentPlaylist = ME_FILES;
	else if (category === 'se') currentPlaylist = SE_FILES;

	if (index < 0) index = currentPlaylist.length - 1;
	if (index >= currentPlaylist.length) index = 0;
	currentIndex = index;

	var file = currentPlaylist[currentIndex];
	var filePath = 'static/audioindex/' + currentCategory + '/' + encodeURIComponent(file);

	var player = document.getElementById('globalAudioPlayer');
	var trackBadge = document.getElementById('miniPlayerCategory');
	var trackTitle = document.getElementById('miniPlayerTrack');

	if (trackBadge) trackBadge.innerHTML = '[' + currentCategory.toUpperCase() + ']';
	if (trackTitle) trackTitle.innerHTML = escapeHtml(file);

	if (player) {
		player.src = filePath;
		player.play();

        // we'll update miniplayer duration txt WHEN metadata load
		player.onloadedmetadata = function() {
			if (trackTitle && player.duration) {
				trackTitle.innerHTML = escapeHtml(file) + ' (' + formatTime(player.duration) + ')';
			}
		};
	}
}

//selfexp from here
function playNextTrack() {
	playTrack(currentCategory, currentIndex + 1);
}

function playPrevTrack() {
	playTrack(currentCategory, currentIndex - 1);
}

function toggleCategory(contentId, arrowId) {
	var content = document.getElementById(contentId);
	var arrow = document.getElementById(arrowId);
	if (!content) return;

	if (content.className.indexOf('open') !== -1) {
		content.className = 'category-content';
		if (arrow) arrow.innerHTML = '[ + ]';
	} else {
		content.className = 'category-content open';
		if (arrow) arrow.innerHTML = '[ - ]';
	}
}

// this is zip shit. buildZip goes in tooooooooooooooooooo zip-helper.js
var AUDIO_SETS = { bgm: BGM_FILES, bgs: BGS_FILES, me: ME_FILES, se: SE_FILES };

function audioItem(folder, i) {
	var file = AUDIO_SETS[folder][i];
	return { url: 'static/audioindex/' + folder + '/' + encodeURIComponent(file), path: folder + '/' + file };
}

function getSelItems() {
	var boxes = document.querySelectorAll('.sel-box:checked');
	var items = [];
	for (var i = 0; i < boxes.length; i++) {
		items.push(audioItem(boxes[i].getAttribute('data-folder'), parseInt(boxes[i].getAttribute('data-i'), 10)));
	}
	return items;
}

function getAllItems() {
	var items = [];
	for (var folder in AUDIO_SETS) {
		for (var i = 0; i < AUDIO_SETS[folder].length; i++) items.push(audioItem(folder, i));
	}
	return items;
}

function zipSelected() {
	buildZip(getSelItems(), 'Maylan-OneShot-audio.zip');
}

function zipAll() {
	buildZip(getAllItems(), 'Maylan-OneShot-audio.zip');
}

function updateZipCount() {
	var n = document.querySelectorAll('.sel-box:checked').length;
	var cnt = document.getElementById('zipCount');
	var btn = document.getElementById('zipSelBtn');
	if (cnt) cnt.textContent = n + ' selected';
	if (btn) btn.textContent = 'Download selected (' + n + ')';

	var heads = document.querySelectorAll('.cat-sel');
	for (var i = 0; i < heads.length; i++) {
		var f = heads[i].getAttribute('data-folder');
		var total = document.querySelectorAll('.sel-box[data-folder="' + f + '"]').length;
		var on = document.querySelectorAll('.sel-box[data-folder="' + f + '"]:checked').length;
		heads[i].checked = total > 0 && on === total;
		heads[i].indeterminate = on > 0 && on < total;
	}
}

function clearSelection() {
	var boxes = document.querySelectorAll('.sel-box');
	for (var i = 0; i < boxes.length; i++) boxes[i].checked = false;
	updateZipCount();
}

function selectCategory(folder, on) {
	var rows = document.querySelectorAll('#' + folder + 'List .audio-row');
	for (var i = 0; i < rows.length; i++) {
		// skip rows the search is hiding
		if (rows[i].style.display === 'none') continue;
		var box = rows[i].querySelector('.sel-box');
		if (box) box.checked = on;
	}
	updateZipCount();
}

function setupSelection() {
	document.addEventListener('change', function(e) {
		var t = e.target;
		if (!t || typeof t.className !== 'string') return;
		if (t.className.indexOf('cat-sel') !== -1) selectCategory(t.getAttribute('data-folder'), t.checked);
		else if (t.className.indexOf('sel-box') !== -1) updateZipCount();
	});
}

document.addEventListener('DOMContentLoaded', function() {
	renderAudioList('bgmList', 'bgm', BGM_FILES);
	renderAudioList('bgsList', 'bgs', BGS_FILES);
	renderAudioList('meList', 'me', ME_FILES);
	renderAudioList('seList', 'se', SE_FILES);
	setupSelection();

	var player = document.getElementById('globalAudioPlayer');
	if (player) {
		player.addEventListener('ended', function() {
			playNextTrack();
		});
	}

	var searchInput = document.getElementById('audioSearch');
	if (searchInput) {
		searchInput.addEventListener('input', function(e) {
			var query = e.target.value.toLowerCase().trim();
			var rows = document.querySelectorAll('.audio-row');

			for (var i = 0; i < rows.length; i++) {
				var row = rows[i];
				var filename = row.getAttribute('data-filename') || '';
				if (!query || filename.indexOf(query) !== -1) {
					row.style.display = 'flex';
				} else {
					row.style.display = 'none';
				}
			}

			if (query.length > 0) {
				var contents = document.querySelectorAll('.category-content');
				for (var j = 0; j < contents.length; j++) {
					contents[j].className = 'category-content open';
				}
			}
		});
	}
});