const tags = Array.from(document.querySelectorAll('.tags-tag'));

/* color */
function getCurrentBaseColors() {
    const baseColor = getComputedStyle(document.documentElement).getPropertyValue('--tags-tag-color');
    const baseHoverColor = getComputedStyle(document.documentElement).getPropertyValue('--tags-tag-hover-color');
    return { baseColor, baseHoverColor };
}

function hexToRgb(hex) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function getColor(freq, maxFreq, minFreq, baseColor) {
    const { r, g, b } = hexToRgb(baseColor);
    const factor = (freq - minFreq) / (maxFreq - minFreq);
    const adjusment = 30 * factor;

    return `rgb(${Math.max(0, r + adjusment * 1.05)}, ${Math.max(0, g - adjusment * 1.2)}, ${Math.max(0, b + adjusment * 1.15)})`;
}

tags.sort((a, b) => a.getAttribute('freq') - b.getAttribute('freq'));
const freqs = tags.map(tag => parseInt(tag.getAttribute('freq'), 10));
const maxFreq = Math.max(...freqs);
const minFreq = Math.min(...freqs);

/* animation */
function setTagColors() {
    const { baseColor, baseHoverColor } = getCurrentBaseColors();

    tags.forEach((tag, index) => {
        const freq = parseInt(tag.getAttribute('freq'), 10);
        const bgColor = getColor(freq, maxFreq, minFreq, baseColor);
        const hoverColor = getColor(freq, maxFreq, minFreq, baseHoverColor);
    
        tag.querySelector('.tag').style.backgroundColor = bgColor;
        tag.querySelector('.tag').style.borderColor = bgColor;
        tag.querySelector('.tag').style.animationDelay = `${index * 0.04}s`;
    
        tag.querySelector('.tag').addEventListener('mouseover', () => {
            tag.querySelector('.tag').style.backgroundColor = hoverColor;
            tag.querySelector('.tag').style.borderColor = hoverColor;
        });
        tag.querySelector('.tag').addEventListener('mouseout', () => {
            tag.querySelector('.tag').style.backgroundColor = bgColor;
            tag.querySelector('.tag').style.borderColor = bgColor;
        });
    });
}

document.addEventListener('DOMContentLoaded', function () {
    setTagColors();

    /* mode toggle */
    const observer = new MutationObserver(() => {
        setTagColors();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
});
