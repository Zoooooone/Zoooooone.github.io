function setBloggerCookie() {
    document.cookie = "blogger_visit=true; max-age=31536000; path=/";
    alert('Blogger cookie set!');
}
async function verifyPassword() {
    const password = prompt("Please enter the password: ");
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const passwordHash = "d5a71d4f65f0c41f6c4a87574910392fb0fb293e6e09cfaf130be42efc60b3b9"; 

    if(hashHex === passwordHash) {
        setBloggerCookie();
    } else {
        alert("Password is incorrect");
    }
}