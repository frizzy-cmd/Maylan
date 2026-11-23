// // This script has been deprecated and no longer used. o7

// var ONESHOT_FACTS = [
//     "Niko is a child with blue hair, with three whiskers, large yellow cat-like eyes, and tan skin/fur. They wear a brown overcoat extending over their arms, a long light blue scarf, a brown hat with cat-like ears, and gray-ish purple bottoms that appear to be leggings.",
//     "Due to Niko having many features and similarties to a cat, (probably is!), other characters in the game often confuse Niko for one, which Niko has to consistently and repeatedly deny.",
//     "Niko's favorite food is pancakes, with hazelnuts grinded into the batter.",
//     "Alula and Calamus are siblings from The Glen.",
//     "George has six different personalities, depending on the die face rolled on her head. This changes between each time you restart the game.",
//     "The Barrens was once a industrial area before the sun went out.",
//     "Cedric is The Author's son.",
//     "The Solstice route is unlocked after completing the main game atleast once.",
//     "Niko is technically 'not a cat,' despite having cat-like features, cat eyes, ears, and whiskers!",
//     "You can make Niko ride on a roomba in one of the apartment rooms in The Refuge.",
//     "The Prophet Bot in the Barrens waited a 'very long' time for the Messiah to arrive.",
//     "Plight (the lamplighter) works tirelessly to maintain the streetlights in The Refuge (surface).",
//     "Ling runs the cafe in The Refuge, and also serves pancakes! Although, not hazelnut pancakes.",
//     "The Library in The Refuge contains books... but not all of them are readable.",
//     "Niko carries the sun throughout the entire game.",
//     "Maize is a plant.",
//     "Niko is the Messiah.",
//     "Rue is a fox.",
//     "The soundtrack playing when in The Refuge, is also used by the meme 'IShowEyes'.",
//     "Niko is deathly afraid of ladders, Me too little guy.",
//     "Niko has an owl plush back at home, The owl is brown and yellow, and it's name is 'Mr. Banana Bread'.",
//     "According to Nightmargin, Niko is 8 years old, but Niko (as a character), was created on Dec 28, 2013. If this were their canonical birthdate, Niko would be 12 years old.",
//     "Niko's height is around 4 feet, (1.27m/121cm).",
//     "George is a tea drinker, (brit) but may switch over to coffee in stressful times.",
//     "Plight (the lamplighter) drinks coffee straight from the pot.",
//     "Ling is a barista, and mainly handles coffee, but his drink of choice is green tea.",
//     "Ling is a character from Nightmargin's comic, 'Margin'.",
//     "Kip is one of the people who have a complicated order when ordering from the cafe, but tips really well afterwards.",
//     "Rue is a fox who remembers your previous game runs.",
//     "Niko has been stated by Eliza, to have a ambiguous gender, meaning it's up to the player's interpretation. For me, I've always seen Niko as a male, but it's up to your opinion.",
//     "Magpie goes for hard liquor! (..but only so he could collect the bottles afterwards)",
//     "Alula is a bird!",
//     "Throughout the game's xScripts.rxdata, which contain code for the game and such, only one swear word is present in 109 - EdText.rb at line 43. Calamus Toolkit has only 8!",
//     "Niko is referred to using they/them pronouns in the OneShot: World Machine Edition bio and trailer.",
//     "Niko's name was originally 'Nico', chosen because it was a gender-neutral name, It was changed to 'Niko' after Nightmargin realized the name could be a reference to Nikola Tesla and his work on lightbulbs.",
//     "Niko is NOT A CAT!! However, in The Refuge, the title of the soundtrack playing is 'On Little Cat Feet', possibly referencing the thumping sound of Niko walking on the Refuge's catwalks.",
//     "At one point during a Solstice run, Niko makes '*confused cat noises*', So much for being a cat, huh?",
//     "OneShot is (surprisingly) easy to mod, if you are only focusing on the code though. For full on mods, such as OneShot: Fading Memory, it's way more complex.",
//     "Niko thinks that coffee is for grown-ups, and prefers to drink milk with syrup, I don't even wanna imagine what milk and syrup tastes like.",
//     "In the game's files, Lamplighter, (as people usually call) is called 'plight'.",
//     "The Steam game release contained a sprite error with Niko having human ears the during the chess and pancakes cutcenes, like in the original game release. This was fixed in a update.",
//     "Niko is not a cat!"
// ];

// // Last upd ONESHOT_FACTS 8/22/2026 6:42 PM UTC+8
// // FIX TYPO ON LINE 136 1/9/2026 2:52 PM UTC+8

// document.addEventListener('DOMContentLoaded', function() {
// 	var messageDiv = document.getElementById('message');
// 	if (!messageDiv) return;

// 	// calc current doy
// 	var now = new Date();
// 	var start = new Date(now.getFullYear(), 0, 0);
// 	var diff = now - start;
// 	var oneDay = 1000 * 60 * 60 * 24;
// 	var dayOfYear = Math.floor(diff / oneDay);

// 	// pick fact based on DOY
// 	var factIndex = dayOfYear % ONESHOT_FACTS.length;
// 	var todaysFact = ONESHOT_FACTS[factIndex];

// 	// cr eate box above #message
// 	var factBox = document.createElement('div');
// 	factBox.id = 'dailyFactBox';
// 	factBox.style.cssText = 'width: 628px; max-width: 90%; margin: 0 auto 20px auto; padding: 14px 20px; border: 3px solid var(--box-border, #401560); background: rgba(18, 6, 28, 0.9); color: #ffffff; box-shadow: 0 0 10px rgba(0,0,0,0.4); box-sizing: border-box; font-family: Terminus, monospace; font-size: 12pt; border-radius: 4px;';

// 	factBox.innerHTML = '<div style="color: var(--header-subtitle, #fa9040); font-weight: bold; font-size: 13pt; margin-bottom: 6px; display: flex; align-items: center;">' +
// 		'<img src="static/img/iconlight.png" style="width: 22px; height: 22px; margin-right: 8px; vertical-align: middle;" alt="Light"> ' +
// 		'<span>OneShot Fact of the Day:</span>' +
// 		'</div>' +
// 		'<div>"' + escapeHtml(todaysFact) + '"</div>';

// 	messageDiv.parentNode.insertBefore(factBox, messageDiv);
// });

// function escapeHtml(str) {
// 	if (!str) return '';
// 	return String(str)
// 		.replace(/&/g, '&amp;')
// 		.replace(/</g, '&lt;')
// 		.replace(/>/g, '&gt;')
// 		.replace(/"/g, '&quot;')
// 		.replace(/'/g, '&#039;');
// }