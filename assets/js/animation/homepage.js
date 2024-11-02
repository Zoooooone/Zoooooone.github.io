document.addEventListener('DOMContentLoaded', function () {
    var isLocalhost = location.hostname == '127.0.0.2' || location.hostname == 'localhost';
    var hasVisited = sessionStorage.getItem('visited');
    
    if (!hasVisited || isLocalhost) {
        if (!isLocalhost) {
            sessionStorage.setItem('visited', 'true');
        }
        var typed = new Typed('#typed-text', {
            strings: ["Zone's Blog", ""],
            typeSpeed: 75,
            backSpeed: 50,
            backDelay: 1000,
            startDelay: 500,
            loop: false,
            showCursor: true,
            cursorChar: '',
            onComplete: function () {
                setTimeout(function () {
                    startCurtainAnimation(true);
                }, 500);
            }
        });
    } else {
        document.getElementById('typing-container').style.display = 'none';
        startCurtainAnimation(false);
    }
});

function startCurtainAnimation(showCurtain) {
    document.getElementById('typing-container').style.display = 'none';

    if (showCurtain) {
        document.documentElement.classList.add('no-visited');
        setTimeout(() => {
            loadCardAnimations();
        }, 600);
    } else {
        loadCardAnimations();
    }
};

function loadCardAnimations() {
    document.querySelectorAll('.card-wrapper').forEach((card, index) => {
        card.style.animation = `slideIn 0.5s ease-out ${index * 0.2}s forwards`;
    });
}