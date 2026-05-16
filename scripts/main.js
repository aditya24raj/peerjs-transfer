import { words } from './words.js';

function generatePassphrase(words, count = 4) {
    let parts = [];
    for (let i = 0; i < count; i++) {
        parts.push(words[Math.floor(Math.random() * words.length)]);
    }
    return parts.join("-");
}

let phrase = generatePassphrase(words, 4);
let peer = new Peer(phrase);

peer.on('error', function (err) {
    if (err.type === 'unavailable-id') {
        window.location.reload();
    }

    logs.innerHTML += `<div>Error: ${err.message}</div>`;
});

peer.on('connection', function (conn) {
    if (!confirm(`'${conn.peer}' is requesting to connect. Allow connection?`)) {
        conn.close();
        return;
    }

    conn.on('data', function (data) {
        if (data.type === 'file') {
            const f = new Blob([data.content], {
                type: data.mime,
            });
            logs.innerHTML += `<div>Received: <a href=${URL.createObjectURL(f)} download=${data.name} target="_blank">${data.name}(${data.size})</a></div>`;

        } else if (data.type === 'message') {
            logs.innerHTML += `<div>Received: ${data.content}</div>`;
        }

    });

    if (!destId.value) {
        destId.value = conn.peer;
        connectButton.click();
    }

});

let conn;

peer.on('open', function (id) {
    peerId.textContent = id;

    connectButton.addEventListener('click', function (event) {
        event.preventDefault();

        conn = peer.connect(destId.value);
        conn.on('open', function () {
            destId.disabled = true;
            connectButton.disabled = true;
            disconnectButton.disabled = false;
            destIdLabel.textContent = "Connected to: ";

            sendMessageButton.disabled = false;

        });

        conn.on('error', function (err) {
            logs.innerHTML += `<div>Error: ${err.message}</div>`;
        });

    });
});

disconnectButton.addEventListener('click', function (event) {
    event.preventDefault();

    conn?.close();
    peer?.destroy();

    window.location.reload();
});

sendMessageButton.addEventListener('click', function (event) {
    event.preventDefault();

    let messageContent = message.value;
    let fileContent = file.files[0];

    if (messageContent !== "") {
        conn.send({ 'type': 'message', 'content': messageContent });
        logs.innerHTML += `<div>Sent: ${messageContent}</div>`;
        message.value = ""; // Clear the input field
    }

    if (fileContent) {
        conn.send({
            'type': 'file',
            'name': fileContent.name,
            'size': returnFileSize(fileContent.size),
            'content': await fileContent.arrayBuffer()
        });

        logs.innerHTML += `<div>Sent: ${fileContent.name}, ${returnFileSize(fileContent.size)}</div>`;
        file.value = ""; // Clear the input field
    }
});

copyIdButton.addEventListener('click', function (e) {
    e.preventDefault();

    navigator.clipboard.writeText(peerId.textContent);
    copyIdButton.textContent = "copied!";
    setTimeout(() => {
        copyIdButton.textContent = "copy";
    }, 1000);
});

function returnFileSize(number) {
    if (number < 1e3) {
        return `${number} bytes`;
    } else if (number >= 1e3 && number < 1e6) {
        return `${(number / 1e3).toFixed(1)} KB`;
    }
    return `${(number / 1e6).toFixed(1)} MB`;
}





