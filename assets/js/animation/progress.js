window.addEventListener('scroll', function() {
    const remToPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
    var scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    var scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    var clientHeight = document.documentElement.clientHeight || document.body.clientHeight;
    var scrollHeight = scrollHeight - clientHeight;   
    
    var progressCircle = document.querySelector(".progress-ring-circle");
    var dashoffset = 8.168 * remToPx * (1 - scrollTop / scrollHeight);
    // var scrollPercent = (scrollTop / scrollHeight) * 100;
    
    progressCircle.style.strokeDashoffset = dashoffset;
    
    /*
    var progressBar = document.getElementById('progress-bar');
    progressBar.style.width = scrollPercent + '%';

    var startColor = { r: 20, g: 40, b: 235 };
    var midColor = { r: 60, g: 120, b: 246 };
    var endColor = { r: 160, g: 210, b: 253 };
    var r, g, b;

    if (scrollPercent < 50) {
        r = startColor.r + (midColor.r - startColor.r) * (scrollPercent / 50) ;
        g = startColor.g + (midColor.g - startColor.g) * (scrollPercent / 50) ;
        b = startColor.b + (midColor.b - startColor.b) * (scrollPercent / 50) ;
    } else {
        r = midColor.r + (endColor.r - midColor.r) * ((scrollPercent - 50) / 50);
        g = midColor.g + (endColor.g - midColor.g) * ((scrollPercent - 50) / 50);
        b = midColor.b + (endColor.b - midColor.b) * ((scrollPercent - 50) / 50);
    }

    var color = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    progressBar.style.backgroundColor = color;
    */
});
