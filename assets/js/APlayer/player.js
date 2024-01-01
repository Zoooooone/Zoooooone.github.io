var musicPlay = new APlayer({
    container: document.getElementById('aplayer'),
    autoplay: false,
    lrcType: 3,
    loop: 'all',
    order: 'random',
    audio: [
        {
            name: 'Nuit Silencieuse',
            artist: 'Days',
            url: '/assets/audio/Days - Nuit Silencieuse.mp3',
            cover: '/assets/img/audio-cover/Nuit Silencieuse.jpg',
            lrc: '/assets/audio/lrc/Nuit Silencieuse.lrc'
        },
        {
            name: 'No differences ＜a0v＞ -Instrumental-',
            artist: '澤野弘之',
            url: '/assets/audio/澤野弘之 - No differences ＜a0v＞ -Instrumental-.mp3',
            cover: '/assets/img/audio-cover/no-differances.jpg',
            lrc: '/assets/audio/lrc/no-differances.lrc'
        },
        {
            name: 'κ',
            artist: 'α·Pav',
            url: '/assets/audio/α·Pav - κ.mp3',
            cover: '/assets/img/audio-cover/κ.jpg',
            lrc: '/assets/audio/lrc/κ.lrc'
        },
        {
            name: 'Towards the Light',
            artist: 'Jacoo',
            url: '/assets/audio/Jacoo - Towards the Light.mp3',
            cover: '/assets/img/audio-cover/towards-the-light.jpg',
            lrc: '/assets/audio/lrc/towards-the-light.lrc'
        },
        {
            name: '日落大道',
            artist: '梁博',
            url: '/assets/audio/梁博 - 日落大道.mp3',
            cover: '/assets/img/audio-cover/日落大道.jpg',
            lrc: '/assets/audio/lrc/日落大道.lrc'
        },
        {
            name: 'Tremble (Original Mix)',
            artist: 'Vicetone',
            url: '/assets/audio/Vicetone - Tremble (Original Mix).mp3',
            cover: '/assets/img/audio-cover/tremble.jpg',
            lrc: '/assets/audio/lrc/tremble.lrc'
        },
        {
            name: 'Bangarang',
            artist: 'Skrillex,Sirah',
            url: '/assets/audio/Skrillex,Sirah - Bangarang.mp3',
            cover: '/assets/img/audio-cover/bangarang.jpg',
            lrc: '/assets/audio/lrc/bangarang.lrc'
        },
    ]
});