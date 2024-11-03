const initGallery = (id, data) => {
    const lgContainer = document.getElementById(id);
    const inlineGallery = lightGallery(lgContainer, {
        container: lgContainer,
        plugins: [lgZoom, lgThumbnail, lgAutoplay],
        dynamic: true,
        hash: false,
        closable: false,
        showMaximizeIcon: true,
        appendSubHtmlTo: ".lg-item",
        dynamicEl: data.map((item) => {
            return {
                src: item.src,
                thumb: item.src,
                subHtml: `<div class="lightGallery-captions">
                            <div class="lg-caption" style="margin-bottom: 0;">${item.title}</div>
                            <p style="margin-top: 0;">${item.description}</p>
                          </div>`
            };
        }),
        mode: "lg-fade",
        thumbWidth: 60,
        thumbHeight: "40px",
        thumbMargin: 5,
    });
    inlineGallery.openGallery();
}