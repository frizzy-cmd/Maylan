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
                window.location.href = 'static/img/The it the it The it the it The it the it The it the it The it the it The it the it The it the it The it the it The it the it The it the it The it the it The it the it The it the it The.txt';
            }
        } else {
            konamiIndex = 0;
        }
    });
})();