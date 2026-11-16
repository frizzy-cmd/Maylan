/* 
    Copyright (C) 2026 Maylan
    This website's code is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License v3 as published by
    the Free Software Foundation. View more info at https://www.gnu.org/licenses/gpl-3.0.en.html#license-text
    
    This license EXCLUDES the videos/ directory. https://savedeltarune.teaa.workers.dev/legal for more information
*/

(function() {
    var konamiSequence = [
        'ArrowUp', 'ArrowUp', 
        'ArrowDown', 'ArrowDown', 
        'ArrowLeft', 'ArrowRight', 
        'ArrowLeft', 'ArrowRight', 
        'b', 'a'
    ];
    var konamiIndex = 0;

    document.addEventListener('keydown', function(e) {
        var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        var expectedKey = konamiSequence[konamiIndex].length === 1 ? konamiSequence[konamiIndex].toLowerCase() : konamiSequence[konamiIndex];

        if (key === expectedKey) {
            konamiIndex++;
            if (konamiIndex === konamiSequence.length) {
                window.location.href = 'static/img/bow.gif';
            }
        } else {
            konamiIndex = 0;
        }
    });
})();

// Lol acceleration