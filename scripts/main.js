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

    const div = document.createElement('div');
    div.textContent = `Error: ${err.message}`;
    logs.appendChild(div);
});

peer.on('connection', function (incomingConn) {
    if (
        destId.value !== incomingConn.peer // if request is from the peer we requested connection, then don't ask for confirmation
        && !confirm(`'${incomingConn.peer}' is requesting to connect. Allow connection?`)
    ) {
        incomingConn.close();
        return;
    }

    conn = incomingConn;

    conn.on('data', function (data) {
        if (data.type === 'file') {
            const f = new Blob([data.content], {
                type: data.mime,
            });
            
            const div = document.createElement('div');
            
            const link = document.createElement('a');
            link.href = `${URL.createObjectURL(f)}`;
            link.download = `${data.name}`;
            link.target = "_blank";
            link.textContent = `${data.name}(${data.size})`;
            link.addEventListener('click', () => {
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            });
            div.appendChild(link);

            logs.appendChild(div);

        } else if (data.type === 'message') {
            const div = document.createElement('div');
            div.textContent = `Received: ${data.content}`;
            logs.appendChild(div);
        }

    });

    conn.on('close', function () {
        const div = document.createElement('div');
        div.textContent = `Disconnected`;
        logs.appendChild(div);

        destId.disabled = false;
        connectButton.disabled = false;
        disconnectButton.disabled = true;
        sendMessageButton.disabled = true;
    });

    // try to auto-connect back to peer whose incoming connection we accepted
    if (
        !destId.value
        || destId.value !== conn.peer
    ) {
        destId.value = conn.peer;
        connectButton.click();
    }

});

let conn;

peer.on('open', function (id) {
    peerId.textContent = id;
    new QRCode(document.getElementById("qrcode"), {
        text: `${window.location.origin}${window.location.pathname}#${id}`,
        width: 100,
        height: 100,
        colorDark : "blue",
        colorLight : "white",
        correctLevel : QRCode.CorrectLevel.H
    });
    
   
    connectButton.removeEventListener('click', handleConnect); // remove any pre-existing event listeners
    connectButton.addEventListener('click', handleConnect);

    // try to connect to another peer if id is available in url
    if (window.location.hash?.substring(1)) {
        destId.value = window.location.hash.substring(1);
        connectButton.click();
        window.location.hash = "";
    }
});

disconnectButton.addEventListener('click', function (event) {
    event.preventDefault();

    conn?.close();
    peer?.destroy();

    window.location.reload();
});

sendMessageButton.addEventListener('click', async function (event) {
    event.preventDefault();

    let messageContent = message.value;
    let fileContent = file.files[0];

    if (messageContent !== "") {
        conn.send({ 'type': 'message', 'content': messageContent });
        
        const div = document.createElement('div');
        div.textContent = `Sent: ${messageContent}`;
        logs.appendChild(div);

        message.value = ""; // Clear the input field
    }

    if (fileContent) {
        conn.send({
            'type': 'file',
            'name': fileContent.name,
            'size': returnFileSize(fileContent.size),
            'content': await fileContent.arrayBuffer(),
            'mime': fileContent.type
        });
        
        const div = document.createElement('div');
        div.textContent = `Sent: ${fileContent.name}, ${returnFileSize(fileContent.size)}`;
        logs.appendChild(div);

        file.value = ""; // Clear the input field
    }
});

copyIdButton.addEventListener('click', function (e) {
    e.preventDefault();

    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${peerId.textContent}`);
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

function handleConnect(event) {
    event.preventDefault();
    destIdLabel.textContent = "Connecting to: ";
    connectButton.disabled = true;
    disconnectButton.disabled = true;


    conn = peer.connect(destId.value);
    conn.on('open', function () {
        destId.disabled = true;
        connectButton.disabled = true;
        disconnectButton.disabled = false;
        destIdLabel.textContent = "Connected to: ";

        sendMessageButton.disabled = false;

    });

    conn.on('error', function (err) {
        const div = document.createElement('div');
        div.textContent = `Error: ${err.message}`;
        logs.appendChild(div);
    });

}





