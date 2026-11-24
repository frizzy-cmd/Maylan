// prettier-ignore

/*
 * Copyright 2026 Maylan
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * 
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NOTE: If you're basing a project or feature off my code, its recommended to contact me! It'd be fun to check what it is.
 */

const ONESHOT_EXPRESSIONS = {Alula:["alula","alula_gasp","alula_oh","alula_pout","alula_speak"],BlueGatekeeper:["blue_gatekeeper"],Bookbot:["bookbot"],Calamus:["calamus","calamus_heh","calamus_sad","calamus_shame","calamus_shock","calamus_smile","calamus_smile2","calamus_speak","calamus_unknown"],Cedric:["cedric","cedric2","cedric3","cedric4","cedric_eek","cedric_hmm","cedric_sigh","cedric_sigh2","cedric_smile","cedric_talk","cedric_upset"],En:["en","en2","en3","en4","en5","en_distressed","en_distressed2","en_distressed_meow","en_distressed_talk","en_eyeclosed","en_eyeclosed2","en_less_sad","en_shock","en_upset","en_upset2","en_upset_meow"],George:["george1","george1_hm","george1_smile","george1_smug","george2","george2_NO","george2_grr","george2_sigh","george2_stress","george3","george3_cry","george3_sad","george3_sigh","george3_worry","george4","george4_golly","george4_omg","george4_oops","george4_smile","george5","george5_aww","george5_heh","george5_hmm","george5_sad","george5_sigh","george5_smile","george6","george6_fingerguns","george6_point","george6_shrug","george6_smile"],GreenGatekeeper:["green_gatekeeper"],Kelvin:["kelvin"],Kip:["kip","kip2","kip_heh","kip_huh","kip_pout","kip_sad","kip_sigh","kip_wink","kip_worry"],Ling:["ling","ling2","ling3","ling_hm","ling_hm2","ling_oh","ling_shock","ling_sigh","ling_smile"],Magpie:["magpie","magpie_hm","magpie_oh","magpie_smile"],Maize:["maize","maize_smile1","maize_smile2","maize_strain","maize_stress","maize_thisisfine"],Mason:["mason"],Niko:["niko","niko2","niko3","niko4","niko5","niko6","niko_83c","niko_cry","niko_distressed","niko_distressed2","niko_distressed_meow","niko_distressed_talk","niko_eyeclosed","niko_eyeclosed2","niko_huh","niko_less_sad","niko_pancakes","niko_sad","niko_shock","niko_speak","niko_surprised","niko_upset","niko_upset2","niko_upset_meow","niko_what","niko_what2","niko_wtf","niko_wtf2","niko_yawn"],Plight:["plight","plight3","plight_2","plight_2b","plight_scared","plight_shock","plight_sigh","plight_unknown","plight_why","plight_worry","plight_worry2","plight_wtf"],Prophetbot:["prophet","prophet_hmm","prophet_omg"],Proto:["proto1","proto1b","proto1c","proto2","proto2b","proto_disk","proto_eyeclosed","proto_gasp2","proto_jealous"],RedGatekeeper:["red_gatekeeper"],Rowbot:["rowbot","rowbot_off"],Rue:["rue","rue_dark","rue_oh","rue_sad","rue_sigh","rue_smile","rue_talk"],Shepherd:["shepherd"],Silver:["silver","silver2","silver3","silver_eyeclosed","silver_lookup","silver_rip","silver_rip0","silver_rip2","silver_square1","silver_worry"],Watcher:["watcher"]};

// v0.0.1

var cvs = document.getElementById("niko-textbox");
var ctx = cvs.getContext("2d");
var txtCol = document.getElementById("text-color");
var bgCol = document.getElementById("bg-color");
var brdCol = document.getElementById("border-color");
var bgAlphaSlider = document.getElementById("bg-trans");
var charSel = document.getElementById("oneshot-character-category");
var exprSel = document.getElementById("oneshot-character-expression");
var txtBox = document.getElementById("oneshot-text-content");
var arrowToggle = document.getElementById("arrowbool");
var arrowLabel = document.getElementById("arrowval");

// size and is loaded
var fntSz = 20;
var fntLoaded = false;

// tEXt
var crcTbl = null;

if (bgCol) {
	bgCol.value = "#180c1e";
}

// configs
var cfg = {
	textColor: txtCol ? txtCol.value : "#ffffff",
	backgroundColor: "#180c1e",
	backgroundAlpha: "33",
	borderColor: brdCol ? brdCol.value : "#ff921e",
	drawArrow: true,
	character: "Niko",
	expression: "niko",
	text: (txtBox && txtBox.value) ? txtBox.value : "*cat noises*",
	customImg: null
};

//presets here
var randPools = [
	// { ch: "Niko", expr: "niko_speak", txt: "[I'M A ROBOT AND I... EAT BATTERIES... INSTEAD OF NORMAL PEOPLE FOOD!]" },
	{ ch: "Niko", expr: "niko_speak", txt: "[I'M A ROBOT AND I... EAT BATTERIES...\nINSTEAD OF NORMAL PEOPLE FOOD!]" },
	{ ch: "Niko", expr: "niko", txt: "But I'm not a cat..." },
	{ ch: "Niko", expr: "niko", txt: "*cat noises*" },
	{ ch: "Niko", expr: "niko_what", txt: "*confused cat noises*" },
	{ ch: "Niko", expr: "niko_what", txt: "I'm scared of ladders.." },
	{ ch: "Alula", expr: "alula", txt: "Fish!" },
	{ ch: "Alula", expr: "alula_speak", txt: "Moss is tasty!" },
	{ ch: "Alula", expr: "alula", txt: "What's a cat?" },
	{ ch: "Calamus", expr: "calamus_shame", txt: "Oh my stars!" },
	{ ch: "Calamus", expr: "calamus", txt: "Oh, Niko, did you come by for a visit?\nOur house is up here, please follow me." },
	{ ch: "Cedric", expr: "cedric_hmm", txt: "Tea DOES sound really nice right now..." },
	{ ch: "Proto", expr: "proto2b", txt: "[This is where we part ways.]" },
	{ ch: "Rue", expr: "rue_sad", txt: "Hello, Niko." },
];
// TODO: add more ppl here? :P


function applyRandStart() {
	var pick = randPools[Math.floor(Math.random() * randPools.length)];
	if (!pick) return;

	if (pick.ch && ONESHOT_EXPRESSIONS[pick.ch] && charSel) {
		cfg.character = pick.ch;
		charSel.value = pick.ch;
		loadExprs(cfg.character);
		var list = ONESHOT_EXPRESSIONS[cfg.character];
		cfg.expression = (pick.expr && list.indexOf(pick.expr) !== -1) ? pick.expr : (list[0] || "");
		if (exprSel) exprSel.value = cfg.expression;
	}

	if (txtBox) {
		txtBox.value = pick.txt;
		clampLines(txtBox);
		cfg.text = txtBox.value;
	} else {
		cfg.text = pick.txt;
	}

	if (pick.faceUrl) {
		var tmpFace = new Image();
		tmpFace.onload = function () {
			cfg.customImg = tmpFace;
			paint();
		};
		tmpFace.onerror = function () {
			cfg.customImg = null;
			paint();
		};
		tmpFace.src = pick.faceUrl;
	} else {
		cfg.customImg = null;
	}
}

function alphaHex(pct) {
	var n = Math.max(0, Math.min(100, Number(pct)));
	var h = Math.round(((100 - n) / 100) * 255).toString(16);
	return h.length === 1 ? "0" + h : h;
}

if (bgAlphaSlider) {
	cfg.backgroundAlpha = alphaHex(bgAlphaSlider.value);
}

function hexRgb(h) {
	var v = parseInt(h.slice(1), 16);
	return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbHex(r, g, b) {
	return "#" + (((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1));
}

function shiftCol(hex, dr, dg, db) {
	var rgb = hexRgb(hex);
	var r = Math.min(255, Math.max(0, rgb[0] + dr));
	var g = Math.min(255, Math.max(0, rgb[1] + dg));
	var b = Math.min(255, Math.max(0, rgb[2] + db));
	return rgbHex(r, g, b);
}

// WHEW (dont look at oneshot-font20.js)
function drawBorder(c) {
	c.fillStyle = cfg.borderColor;

	c.fillRect(6, 2, 596, 2);
	c.fillRect(2, 6, 2, 116);
	c.fillRect(4, 4, 2, 2);
	c.fillRect(4, 122, 2, 2);
	c.fillRect(6, 124, 596, 2);
	c.fillRect(602, 4, 2, 2);
	c.fillRect(604, 6, 2, 116);
	c.fillRect(602, 122, 2, 2);

	c.fillRect(8, 6, 592, 2);
	c.fillRect(6, 8, 2, 112);
	c.fillRect(8, 8, 2, 2);
	c.fillRect(8, 118, 2, 2);
	c.fillRect(8, 120, 592, 2);
	c.fillRect(598, 8, 2, 2);
	c.fillRect(600, 8, 2, 112);
	c.fillRect(598, 118, 2, 2);

	if (cfg.drawArrow) {
		c.fillRect(307, 117, 1, 1);
		c.fillRect(306, 118, 1, 1);
		c.fillRect(305, 119, 1, 1);

		c.fillStyle = shiftCol(cfg.borderColor, 0, 23, 4);
		c.fillRect(299, 117, 8, 1);
		c.fillRect(300, 118, 1, 1);
		c.fillRect(301, 119, 1, 1);
	}

	c.fillStyle = shiftCol(cfg.borderColor, -76, -67, -4);
	c.fillRect(4, 0, 600, 2);
	c.fillRect(0, 4, 2, 120);
	c.fillRect(2, 2, 4, 2);
	c.fillRect(2, 4, 2, 2);
	c.fillRect(2, 122, 2, 4);
	c.fillRect(4, 124, 2, 2);
	c.fillRect(4, 126, 600, 2);
	c.fillRect(602, 2, 4, 2);
	c.fillRect(604, 4, 2, 2);
	c.fillRect(606, 4, 2, 120);
	c.fillRect(604, 122, 2, 4);
	c.fillRect(602, 124, 2, 2);

	c.fillStyle = shiftCol(cfg.borderColor, 0, 76, 11);
	c.fillRect(6, 4, 596, 2);
	c.fillRect(4, 6, 2, 116);
	c.fillRect(6, 6, 2, 2);
	c.fillRect(6, 120, 2, 2);
	c.fillRect(6, 122, 596, 2);
	c.fillRect(600, 6, 2, 2);
	c.fillRect(602, 6, 2, 116);
	c.fillRect(600, 120, 2, 2);

	if (cfg.drawArrow) {
		c.fillRect(302, 117, 3, 1);
		c.fillRect(301, 118, 1, 1);
		c.fillRect(302, 119, 1, 1);
		c.fillRect(303, 120, 1, 1);
		c.fillRect(304, 119, 1, 1);
		c.fillRect(305, 118, 1, 1);

		c.fillStyle = "#000";
		c.fillRect(308, 117, 2, 1);
		c.fillRect(307, 118, 2, 1);
		c.fillRect(306, 119, 2, 1);
		c.fillRect(305, 120, 2, 1);
		c.fillRect(304, 121, 2, 1);
		c.fillRect(304, 122, 1, 1);

		c.fillStyle = "#fff";
		c.fillRect(302, 118, 3, 1);
		c.fillRect(303, 119, 1, 1);
	}
}

//RTL
function drawCrispText(lns) {
	ctx.fillStyle = cfg.textColor;

	for (var i = 0; i < lns.length; i++) {
		var pen = 20;
		var base = 34 + 24 * i;
		var chars = Array.from(lns[i]);

		for (var j = 0; j < chars.length; j++) {
			var g = OS_FONT20[chars[j].codePointAt(0)];
			if (!g) {
				pen += 10;
				continue;
			}

			var rows = g[4] ? g[4].split(",") : [];
			for (var r = 0; r < rows.length; r++) {
				var bits = parseInt(rows[r], 16);
				for (var c = 0; c < g[2]; c++) {
					if (bits & (1 << (g[2] - 1 - c))) {
						ctx.fillRect(pen + g[0] + c, base + g[1] + r, 1, 1);
					}
				}
			}
			pen += g[5];
		}
	}
}

function drawFrame(face) {
	ctx.imageSmoothingEnabled = false;
	ctx.clearRect(0, 0, cvs.width, cvs.height);

	ctx.fillStyle = cfg.backgroundColor + cfg.backgroundAlpha;
	ctx.fillRect(5, 5, 595, 118);

	drawBorder(ctx);

	if (face) {
		ctx.drawImage(face, 497, 17, 96, 96);
	}

	drawCrispText(cfg.text.split("\n"));
}

function paint() {
	if (!fntLoaded) return;
	if (cfg.customImg) {
		drawFrame(cfg.customImg);
		return;
	}
	var pic = new Image();
	pic.src = "static/graphicsindex/Faces/" + cfg.expression + ".png";
	pic.onload = function () {
		drawFrame(pic);
	};
	pic.onerror = function () {
		drawFrame(null);
	};
}

function loadExprs(ch) {
	while (exprSel.firstChild) {
		exprSel.removeChild(exprSel.firstChild);
	}
	var arr = ONESHOT_EXPRESSIONS[ch] || [];
	for (var i = 0; i < arr.length; i++) {
		var op = document.createElement("option");
		op.value = arr[i];
		op.textContent = arr[i];
		exprSel.appendChild(op);
	}
}

function clampLines(ta) {
	var lns = ta.value.split("\n");
	for (var i = 0; i < lns.length; i++) {
		while (lns[i].length > 46) {
			var a = lns[i].slice(0, 46);
			var b = lns[i].slice(46);
			lns[i] = a;
			lns.splice(i + 1, 0, b);
		}
	}
	ta.value = lns.slice(0, 4).join("\n");
}

for (var k in ONESHOT_EXPRESSIONS) {
	if (k.toLowerCase() !== "niko") {
		var op = document.createElement("option");
		op.value = k;
		op.textContent = k;
		charSel.appendChild(op);
	} else {
		loadExprs(k);
	}
}

charSel.addEventListener("change", function (ev) {
	cfg.character = ev.target.value;
	loadExprs(cfg.character);
	cfg.expression = (ONESHOT_EXPRESSIONS[cfg.character] && ONESHOT_EXPRESSIONS[cfg.character][0]) || "";
	exprSel.value = cfg.expression;
	cfg.customImg = null;
	paint();
});

exprSel.addEventListener("change", function (ev) {
	cfg.expression = ev.target.value;
	cfg.customImg = null;
	paint();
});

txtBox.addEventListener("input", function (ev) {
	if (ev.inputType !== "deleteContentBackward") {
		clampLines(txtBox);
	}
	cfg.text = txtBox.value;
	paint();
});

txtCol.addEventListener("input", function () {
	cfg.textColor = txtCol.value;
	paint();
});

bgCol.addEventListener("input", function () {
	cfg.backgroundColor = bgCol.value;
	paint();
});

brdCol.addEventListener("input", function () {
	cfg.borderColor = brdCol.value;
	paint();
});

bgAlphaSlider.addEventListener("input", function () {
	cfg.backgroundAlpha = alphaHex(bgAlphaSlider.value);
	paint();
});

arrowToggle.addEventListener("click", function () {
	cfg.drawArrow = !cfg.drawArrow;
	arrowLabel.textContent = cfg.drawArrow ? "ON" : "OFF";
	paint();
});

document.getElementById("custom-image").addEventListener("change", function (ev) {
	var f = ev.target.files && ev.target.files[0];
	if (!f) return;
	var rd = new FileReader();
	rd.onload = function (e) {
		var im = new Image();
		im.onload = function () {
			cfg.customImg = im;
			paint();
		};
		im.src = e.target.result;
	};
	rd.readAsDataURL(f);
});

var rBtns = document.querySelectorAll(".color-reset-btn");
for (var r = 0; r < rBtns.length; r++) {
	rBtns[r].addEventListener("click", function () {
		var box = this.parentElement;
		var inp = box ? box.querySelector("input[type='color']") : null;
		var col = this.getAttribute("data-col");
		if (inp && col) {
			inp.value = col;
			inp.dispatchEvent(new Event("input"));
		}
	});
}

// in metadata 
function makeCrcTbl() {
	var t = new Uint32Array(256);
	for (var n = 0; n < 256; n++) {
		var c = n;
		for (var k = 0; k < 8; k++) {
			c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
		}
		t[n] = c >>> 0;
	}
	return t;
}

function calcCrc(buf) {
	if (!crcTbl) crcTbl = makeCrcTbl();
	var c = 0xffffffff;
	for (var i = 0; i < buf.length; i++) {
		c = crcTbl[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
	}
	return (c ^ 0xffffffff) >>> 0;
}

function latBytes(str) {
	// latin-1
	var out = new Uint8Array(str.length);
	for (var i = 0; i < str.length; i++) {
		out[i] = str.charCodeAt(i) & 0xff;
	}
	return out;
}

function u32Be(n, out, off) {
	out[off] = (n >>> 24) & 0xff;
	out[off + 1] = (n >>> 16) & 0xff;
	out[off + 2] = (n >>> 8) & 0xff;
	out[off + 3] = n & 0xff;
}

function readU32Be(b, off) {
	return (((b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]) >>> 0);
}

function addPngText(pngBlob, kw, val) {
	return pngBlob.arrayBuffer().then(function (ab) {
		var src = new Uint8Array(ab);
		var kB = latBytes(kw || "Comment");
		var vB = latBytes(val);

		var dataLen = kB.length + 1 + vB.length;
		var chunk = new Uint8Array(12 + dataLen);
		u32Be(dataLen, chunk, 0);

		chunk[4] = 0x74;
		chunk[5] = 0x45;
		chunk[6] = 0x58;
		chunk[7] = 0x74;

		chunk.set(kB, 8);
		chunk[8 + kB.length] = 0; //null sep required by tEXt spec
		chunk.set(vB, 9 + kB.length);

		var crc = calcCrc(chunk.subarray(4, 8 + dataLen));
		u32Be(crc, chunk, 8 + dataLen);

		var pos = 8;
		var cut = src.length;
		while (pos + 8 <= src.length) {
			var len = readU32Be(src, pos);
			var isEnd = (
				src[pos + 4] === 0x49 &&
				src[pos + 5] === 0x45 &&
				src[pos + 6] === 0x4e &&
				src[pos + 7] === 0x44
			);
			if (isEnd) {
				cut = pos;
				break;
			}
			pos += 12 + len;
		}

		var out = new Uint8Array(src.length + chunk.length);
		out.set(src.subarray(0, cut), 0);
		out.set(chunk, cut);
		out.set(src.subarray(cut), cut + chunk.length);

		return new Blob([out], { type: "image/png" });
	});
}

function tagPng(blob) {
	return addPngText(
		blob,
		"Comment",
		"This image was created with the Textbox Generator tool at maylan.teaa.workers.dev/textbox-generator.html"
	);
}

document.getElementById("copy-textbox").addEventListener("click", function () {
	if (!cvs.toBlob || typeof ClipboardItem === "undefined" || !navigator.clipboard) return;
	cvs.toBlob(function (blob) {
		if (!blob) return;
		tagPng(blob).then(function (tagged) {
			return navigator.clipboard.write([new ClipboardItem({ "image/png": tagged })]);
		}).then(function () {
			showAlert("Successfully copied image to clipboard!!", "success");
		});
	}, "image/png");
});

document.getElementById("save-textbox").addEventListener("click", function () {
	if (!cvs.toBlob) return;
	cvs.toBlob(function (blob) {
		if (!blob) return;
		tagPng(blob).then(function (tagged) {
			var u = URL.createObjectURL(tagged);
			var a = document.createElement("a");
			a.href = u;
			a.download = "oneshot-textbox.png";
			a.click();
			setTimeout(function () {
				URL.revokeObjectURL(u);
			}, 1000);
		});
	}, "image/png");
});

document.getElementById("open-tb-new-tab").addEventListener("click", function () {
	if (!cvs.toBlob) return;
	cvs.toBlob(function (blob) {
		if (!blob) return;
		tagPng(blob).then(function (tagged) {
			var u = URL.createObjectURL(tagged);
			window.open(u, "_blank");
			setTimeout(function () {
				URL.revokeObjectURL(u);
			}, 1000);
		});
	}, "image/png");
});

function startRender() {
	fntLoaded = true;
	applyRandStart();
	paint();
}

startRender();