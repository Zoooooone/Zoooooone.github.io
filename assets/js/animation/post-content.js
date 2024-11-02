document.addEventListener('DOMContentLoaded', function () {
    const elements = document.querySelectorAll('.fade-in-element');
    elements.forEach((element, index) => {
        element.style.animation = `fadeInUp 0.6s ease-out forwards ${index * 0.2}s`;
    });
});