import { MusicPlayer } from '/assets/js/addon/player.js';

document.addEventListener('DOMContentLoaded', () => {
    const playerElement = document.getElementById('aplayer');
    if (playerElement) {
        const playlistPath = playerElement.dataset.playlist;
        if (playlistPath) {
            new MusicPlayer('aplayer', playlistPath);
        }
    }
});