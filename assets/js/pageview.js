const isBlogger = document.cookie.split('; ').find(row => row.startsWith('blogger_visit='));

if (!isBlogger && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
import('https://unpkg.com/@waline/client@3.0.0-alpha.8/dist/pageview.js')
    .then(({ pageviewCount }) => {
    pageviewCount({
        serverURL: 'https://waline-beige-eight.vercel.app/',
        path: window.location.pathname,
        update: true
    });
    })
    .catch(error => {
    console.error("Error loading pageviewCount:", error);
    });
} else {
import('https://unpkg.com/@waline/client@2.15.8/dist/pageview.mjs')
    .then(({ pageviewCount }) => {
    pageviewCount({
        serverURL: 'https://waline-beige-eight.vercel.app/',
        path: window.location.pathname,
        update: false
    });
    })
    .catch(error => {
    console.error("Error loading pageviewCount:", error);
    });
console.log("In local environment, pageview count is not updated.");
}