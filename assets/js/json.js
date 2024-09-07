async function asyncLoadJSON(file) {
    const request = new Request(file);
    const response = await fetch(request);
    const data = await response.json();
    return data;
}
