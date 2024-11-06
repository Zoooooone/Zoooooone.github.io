document.addEventListener('DOMContentLoaded', function() {
    loadCategoryAnimation();
});

function loadCategoryAnimation() {
    document.querySelectorAll('.card.categories').forEach((card, index) => {
        card.style.animation = `slideIn 0.5s ease-out ${index * 0.2}s forwards`;
    });
}