export class MusicPlayer {
    constructor(containerId, playlistPath) {
        this.container = document.getElementById(containerId);
        this.playlistPath = playlistPath;
        this.colorThief = new ColorThief();
        this.image = new Image();
        this.xhr = new XMLHttpRequest();
        this.musicPlay = null;
        this.init();
    }

    async init() {
        const playlist = await this.loadPlaylist(this.playlistPath);
        this.createPlayer(playlist);
        this.setTheme(this.musicPlay.list.index);
        this.bindThemeSwitch();
    }

    async loadPlaylist(path) {
        const response = await fetch(path);
        if (!response.ok) {
            console.error(`Failed to load playlist from ${path}`);
            return [];
        }
        return await response.json();
    }

    createPlayer(playlist) {
        this.musicPlay = new APlayer({
            container: this.container,
            autoplay: false,
            lrcType: 3,
            audio: playlist,
        });
    }

    setTheme(index) {
        const audio = this.musicPlay.list.audios[index];
        if (!audio.theme) {
            this.xhr.onload = () => {
                const coverUrl = URL.createObjectURL(this.xhr.response);
                this.image.onload = () => {
                    const color = this.colorThief.getColor(this.image);
                    this.musicPlay.theme(`rgb(${color[0]}, ${color[1]}, ${color[2]})`, index);
                    URL.revokeObjectURL(coverUrl);
                };
                this.image.src = coverUrl;
            };
            this.xhr.open('GET', audio.cover, true);
            this.xhr.responseType = 'blob';
            this.xhr.send();
        }
    }

    bindThemeSwitch() {
        this.musicPlay.on('listswitch', (event) => {
            this.setTheme(event.index);
        });
    }
}