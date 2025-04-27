function sendMessage() {
    const input = document.getElementById('textInput');
    const text = input.value.trim();
    input.value = '';
    addMessage(text);
}

document.querySelectorAll('.btn-recomendation').forEach(function (button) {
    button.addEventListener('click', function () {
        let text = this.textContent;
        addMessage(text);
    });
});

function addMessage(text) {
    if (text !== '') {
        const messageBox = document.getElementById('chatBox');
        const div = document.createElement('div');
        div.className = 'message sent';
        div.innerText = text;
        messageBox.appendChild(div);
        messageBox.scrollTop = messageBox.scrollHeight;

        fetch('server/save_message.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'message=' + encodeURIComponent(usuario + ': ' + text)
        });
    }
}

function parsearMensaje(str) {
    let sinTildes = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let limpio = sinTildes.replace(/[^\w\s]/gi, '');
    return limpio.toLowerCase();
}

function parsearUrl(str){
    let text = parsearMensaje(str);

    return text.replaceAll(' ', '_');
}

function loadMessages() {
    fetch('server/get_messages.php')
        .then(res => res.text())
        .then(text => {
            const chatBox = document.getElementById('chatBox');
            chatBox.innerHTML = '';
            const lines = text.split('\n');
            lines.forEach(line => {
                if (line.trim() !== '') {
                    const div = document.createElement('div');
                    const isUser = line.startsWith(usuario + ':');
                    div.className = 'message ' + (isUser ? 'sent' : 'received');

                    if (usuario == "Persona 2") {
                        const image = parsearUrl(line.split(': ')[1]) + ".png";
                        
                        if (!isUser) {
                            div.innerHTML = `<img src="/storage/gestos/${image}" style="height:50px"/>`;
                        } else {
                            div.innerText = line.replace(usuario + ': ', '').replace('Persona 1: ', '').replace('Persona 2: ', '');
                        }
                    } else {
                        div.innerText = line.replace(usuario + ': ', '').replace('Persona 1: ', '').replace('Persona 2: ', '');
                    }
                    chatBox.appendChild(div);
                }
            });
            chatBox.scrollTop = chatBox.scrollHeight;
        });
}

loadMessages();

setInterval(loadMessages, 2000);