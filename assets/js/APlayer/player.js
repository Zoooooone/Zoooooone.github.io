const musicPlay = new APlayer({
    container: document.getElementById("aplayer"),
    autoplay: false,
    lrcType: 3,
    audio: [
        {
            name: "Nuit Silencieuse",
            artist: "Days",
            url: "/assets/audio/Days - Nuit Silencieuse.mp3",
            cover: "/assets/img/audio-cover/Nuit Silencieuse.jpg",
            lrc: "/assets/audio/lrc/Nuit Silencieuse.lrc"
        },
        {
            name: "No differences ＜a0v＞ -Instrumental-",
            artist: "澤野弘之",
            url: "/assets/audio/澤野弘之 - No differences ＜a0v＞ -Instrumental-.mp3",
            cover: "/assets/img/audio-cover/no-differances.jpg",
            lrc: "/assets/audio/lrc/no-differances.lrc"
        },
        {
            name: "κ",
            artist: "α·Pav",
            url: "/assets/audio/α·Pav - κ.mp3",
            cover: "/assets/img/audio-cover/κ.jpg",
            lrc: "/assets/audio/lrc/κ.lrc"
        },
        {
            name: "Towards the Light",
            artist: "Jacoo",
            url: "/assets/audio/Jacoo - Towards the Light.mp3",
            cover: "/assets/img/audio-cover/towards-the-light.jpg",
            lrc: "/assets/audio/lrc/towards-the-light.lrc"
        },
        {
            name: "日落大道",
            artist: "梁博",
            url: "/assets/audio/梁博 - 日落大道.mp3",
            cover: "/assets/img/audio-cover/日落大道.jpg",
            lrc: "/assets/audio/lrc/日落大道.lrc"
        },
        {
            name: "Tremble (Original Mix)",
            artist: "Vicetone",
            url: "/assets/audio/Vicetone - Tremble (Original Mix).mp3",
            cover: "/assets/img/audio-cover/tremble.jpg",
            lrc: "/assets/audio/lrc/tremble.lrc"
        },
        {
            name: "Bangarang",
            artist: "Skrillex,Sirah",
            url: "/assets/audio/Skrillex,Sirah - Bangarang.mp3",
            cover: "/assets/img/audio-cover/bangarang.jpg",
            lrc: "/assets/audio/lrc/bangarang.lrc"
        },
    ]
});

const colorThief = new ColorThief();
const image = new Image();
const xhr = new XMLHttpRequest();
const setTheme = (index) => {
    if (!musicPlay.list.audios[index].theme) {
        xhr.onload = function(){
            let coverUrl = URL.createObjectURL(this.response);
            image.onload = function(){
                let color = colorThief.getColor(image);
                musicPlay.theme(`rgb(${color[0]}, ${color[1]}, ${color[2]})`, index);
                URL.revokeObjectURL(coverUrl)
            };
            image.src = coverUrl;
        }
        xhr.open("GET", musicPlay.list.audios[index].cover, true);
        xhr.responseType = "blob";
        xhr.send();
    }
};

setTheme(musicPlay.list.index);
musicPlay.on('listswitch', (index) => {
    setTheme(index.index);
});
