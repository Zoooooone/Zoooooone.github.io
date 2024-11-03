document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('back-to-top');
  
    if (!btn) {
      return;
    }
  
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "progress-circle");
    svg.setAttribute("width", "46");
    svg.setAttribute("height", "46");
    svg.style.transform = "rotate(-90deg)";
    svg.style.transformOrigin = "50% 50%";
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.zIndex = "0";
  
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "23");
    circle.setAttribute("cy", "23");
    circle.setAttribute("r", "21");
    circle.setAttribute("stroke-width", "4.5");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "#007bff");

    const circumference = 2 * Math.PI * 21;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;
    circle.style.transition = "stroke-dashoffset 0.1s linear";
  
    svg.appendChild(circle);
    btn.appendChild(svg);
  
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = scrollTop / docHeight;
        const drawLength = circumference * scrollPercent;
  
        circle.style.strokeDashoffset = circumference - drawLength;

        /*
        var progressBar = document.getElementById('progress-bar');
        progressBar.style.width = scrollPercent + '%';

        var startColor = { r: 20, g: 40, b: 235 };
        var midColor = { r: 60, g: 120, b: 246 };
        var endColor = { r: 160, g: 210, b: 253 };
        var r, g, b;

        if (scrollPercent < 0.5) {
            r = startColor.r + (midColor.r - startColor.r) * (scrollPercent / 0.5) ;
            g = startColor.g + (midColor.g - startColor.g) * (scrollPercent / 0.5) ;
            b = startColor.b + (midColor.b - startColor.b) * (scrollPercent / 0.5) ;
        } else {
            r = midColor.r + (endColor.r - midColor.r) * ((scrollPercent - 0.5) / 0.5);
            g = midColor.g + (endColor.g - midColor.g) * ((scrollPercent - 0.5) / 0.5);
            b = midColor.b + (endColor.b - midColor.b) * ((scrollPercent - 0.5) / 0.5);
        }

        var color = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
        progressBar.style.backgroundColor = color;
        */
      }
    });
});
