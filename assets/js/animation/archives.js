document.addEventListener('DOMContentLoaded', function () {
    loadArchivesAnimation()
});

function loadArchivesAnimation() {
    const listItems = document.querySelectorAll('.pl-xl-3 .year, .pl-xl-3 ul.list-unstyled li');
    listItems.forEach((item, index) => {
        item.style.animation = `slideIn 0.5s ease-out ${index * 0.05}s forwards`;
    });
}