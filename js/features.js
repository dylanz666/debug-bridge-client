let currentPid = "";
let currentAgent = "";
let loadAllOutput = true;
let startLine = 0;
let executeCommandIntervalId = null;
let loadOutputIntervalId = null;
let liveScreenshotInterval = null;
let agents = [];
let agentNames = [];

function pingAgent() {
    if ("" == currentAgent || null == currentAgent || undefined == currentAgent) {
        alert("Please set agent info!");
        return
    }
    let pingButton = document.getElementById('pingButton');
    fetch(`http://${currentAgent}/ping`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => {
            if (response.ok) {
                getScreenshot();
                return response.json();
            }
            pingButton.innerText = "Disconnected";
            pingButton.className = "red-button";
            throw new Error('Network response was not ok.');
        })
        .then(() => {
            pingButton.innerText = "Connected";
            pingButton.className = "green-button";
            getScreenshot();
        })
        .catch(error => {
            console.error('Error:', error);
            pingButton.innerText = "Disconnected";
            pingButton.className = "red-button";
        });
}

/* function addAgent() {
    agent = window.prompt('please input agent info with format: <ip:port>', '');
} */

function clearCommand() {
    document.getElementById('command-input').value = "";
}

function setAgentIps() {
    for (const key in window.agents) {
        if (window.agents.hasOwnProperty(key)) {
            agentNames.push(key);
            agents.push(window.agents[key]);
        }
    }

    var agentSelectBox = document.getElementById("agentSelectBox");
    for (var i = 0; i < agents.length; i++) {
        var option = document.createElement("option");
        option.value = agents[i];
        option.text = agents[i];
        agentSelectBox.appendChild(option);
    }

    currentAgent = document.getElementById("agentSelectBox").value;
    document.getElementById("agentName").innerText = "Name: " + agentNames[agents.indexOf(currentAgent)];
}

function getPids() {
    document.getElementById("pid").innerHTML = "";
    fetch(`http://${currentAgent}/bridge/pids`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Network response was not ok.');
        })
        .then(data => {
            // update pid select
            var pidElement = document.getElementById("pid");
            pidElement.innerHTML = "";
            for (var i = 0; i < data.pids.length; i++) {
                var option = document.createElement("option");
                option.value = data.pids[i];
                option.text = data.pids[i];
                pidElement.appendChild(option);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function executeCommand() {
    if (null != executeCommandIntervalId) {
        clearInterval(executeCommandIntervalId);
    }
    if (null != loadOutputIntervalId) {
        clearInterval(loadOutputIntervalId);
    }
    document.getElementById('output-content').innerHTML = "";
    startLine = 0;
    loadAllOutput = true;

    var cmd = document.getElementById("command-input").value;
    if ("" == cmd || null == cmd || undefined == cmd) {
        alert("Please input command!");
        return
    }

    fetch(`http://${currentAgent}/bridge/run`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': 'Bearer YOUR_TOKEN'
        },
        body: JSON.stringify({ command: cmd })
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Network response was not ok.');
        })
        .then(data => {
            currentPid = data.pid;
            getPids();
            startLine = 0;
            executeCommandIntervalId = setInterval(loadOutputByApi, 1000);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function loadOutputByApi() {
    if (loadAllOutput == true) {
        fetch(`http://${currentAgent}/bridge/content/all?pid=${currentPid}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Network response was not ok.');
            })
            .then(data => {
                const contentContainer = document.getElementById('output-content');
                const contentEntry = document.createElement('span');
                const br = document.createElement('br');
                contentEntry.innerHTML = `<span style="background-color: yellow">Conducted command: ${data.command}</span>`;
                contentEntry.appendChild(br);
                contentContainer.appendChild(contentEntry);
                content = data.content;
                for (let i in content) {
                    showContent(content[i]);
                }
                startLine = content.length + 1;
                loadAllOutput = false;
            })
            .catch(error => {
                console.error('Error:', error);
            });
        return;
    }
    fetch(`http://${currentAgent}/bridge/content?pid=${currentPid}&start_line=${startLine}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Network response was not ok.');
        })
        .then(data => {
            content = data.content;
            for (let i in content) {
                showContent(content[i]);
            }
            startLine += content.length;
            loadAllOutput = false;
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function loadOutputByPid() {
    if (null != loadOutputIntervalId) {
        clearInterval(loadOutputIntervalId);
    }
    currentPid = document.getElementById("pid").value;
    if ("" == currentPid || null == currentPid) {
        return;
    }
    loadOutputIntervalId = setInterval(loadOutputByApi, 1000);
}

function loadAllContent() {
    currentPid = document.getElementById("pid").value;
    if ("" == currentPid || null == currentPid) {
        return;
    }
    loadAllOutput = true;
    loadOutputByApi();
}

function clearPids() {
    fetch(`http://${currentAgent}/bridge/pids/clear`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': 'Bearer YOUR_TOKEN'
        }
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Network response was not ok.');
        })
        .then(data => {
            getPids();
            document.getElementById("output-content").innerHTML = "";
            alert(data.message);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function showContent(message) {
    const contentContainer = document.getElementById('output-content');
    const contentEntry = document.createElement('span');
    const br = document.createElement('br');
    contentEntry.textContent = message;
    contentEntry.appendChild(br);
    contentContainer.appendChild(contentEntry);
    contentContainer.scrollTop = contentContainer.scrollHeight;
}

function clearPid() {
    var pid = document.getElementById("pid").value;
    if ("" == pid || null == pid || undefined == pid) {
        alert("Please select pid first!");
        return;
    }
    fetch(`http://${currentAgent}/bridge/pid/clear?pid=${pid}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': 'Bearer YOUR_TOKEN'
        }
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Network response was not ok.');
        })
        .then(data => {
            getPids();
            document.getElementById("output-content").innerHTML = "";
            alert(data.message);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function stopPid() {
    var pid = document.getElementById("pid").value;
    if ("" == pid || null == pid || undefined == pid) {
        alert("Please select pid first!");
        return;
    }
    clearInterval(executeCommandIntervalId);
    clearInterval(loadOutputIntervalId);
    fetch(`http://${currentAgent}/bridge/pid/stop?pid=${pid}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Network response was not ok.');
        })
        .then(data => {
            alert(data.message);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function clearOutput() {
    document.getElementById("output-content").innerHTML = "";
}

function getScreenshot() {
    let refreshButton = document.getElementById('refresh-screenshot')
    refreshButton.innerText = "Refreshing";
    refreshButton.className = "gray-button";

    document.getElementById("screenshot").src = `http://${currentAgent}/bridge/screenshot?timestamp=${new Date().getTime()}`;

    setTimeout(function () {
        refreshButton.innerText = "Refresh";
        refreshButton.className = "green-button";
    }, 1000);
}

function liveScreenshot() {
    let liveScreenshotElement = document.getElementById("live-screenshot");
    if (null != liveScreenshotInterval) {
        clearInterval(liveScreenshotInterval);
        liveScreenshotElement.className = "sky-blue-button";
        liveScreenshotElement.innerText = "Live";
        return
    }
    liveScreenshotElement.className = "red-button";
    liveScreenshotElement.innerText = "Stop Live";
    liveScreenshotInterval = setInterval(function () {
        document.getElementById("screenshot").src = `http://${currentAgent}/bridge/screenshot?timestamp=${new Date().getTime()}`;
    }, 1000);
}

let desktopWidth = 0;
let desktopHeight = 0;
function getDesktopScreenSize() {
    fetch(`http://${currentAgent}/bridge/screen_size`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Network response was not ok.');
        })
        .then(data => {
            desktopWidth = data.width;
            desktopHeight = data.height;
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

window.onload = setAgentIps();
window.onload = getPids();
window.onload = getDesktopScreenSize();
pingAgent();

// agent select box
document.getElementById('agentSelectBox').addEventListener('change', function () {
    let pingButton = document.getElementById("pingButton");
    pingButton.innerText = "Connecting...";
    pingButton.className = "gray-button";
    currentAgent = document.getElementById("agentSelectBox").value;
    document.getElementById("agentName").innerText = "Name: " + agentNames[agents.indexOf(currentAgent)];
    pingAgent();
});

// screenshot
const screenshotElement = document.getElementById('screenshot');
const bigScreenshotModel = document.getElementById('big-screenshot-model');
const closeModal = document.getElementById('closeModal');
const bigScreenshotElement = document.getElementById('big-screenshot');
// screenshotElement.ondblclick = function () {

// }

// Enlarge the image
function zoomInScreenshot() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = screenshotElement.naturalWidth;
    canvas.height = screenshotElement.naturalHeight;
    ctx.drawImage(screenshotElement, 0, 0);
    const imgDataUrl = canvas.toDataURL();

    bigScreenshotElement.src = imgDataUrl;
    bigScreenshotModel.style.display = 'flex';
}

closeModal.onclick = function () {
    bigScreenshotModel.style.display = 'none';
}

window.onclick = function (event) {
    if (event.target === bigScreenshotModel) {
        bigScreenshotModel.style.display = 'none';
    }
}

// mouse move: event
let offsetXElement = document.getElementById("offset-x");
let offsetYElement = document.getElementById("offset-y");
let remoteX = 0;
let remoteY = 0;
function getMousePosition(event) {
    // get picture's bounding
    let rect = screenshotElement.getBoundingClientRect();
    // calculate mouse x,y
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;
    // get picture's width,height
    let width = rect.width;
    let height = rect.height;
    // calculate x,y for remote server's desktop
    remoteX = ((x / width) * desktopWidth).toFixed(0);
    remoteY = ((y / height) * desktopHeight).toFixed(0);
    // show mouse position of remote server's desktop
    offsetXElement.value = remoteX;
    offsetYElement.value = remoteY;
}

function postRemoteAction(action, startX, startY, endX = 0, endY = 0) {
    fetch(`http://${currentAgent}/bridge/screen_action`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: action,
            start_x: startX,
            start_y: startY,
            end_x: endX,
            end_y: endY
        })
    })
        .then(response => {
            if (response.ok) {
                getScreenshot();
                return response.json();
            }
            throw new Error('Network response was not ok.');
        })
        .then(data => {
            console.log(data);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// mouse event: click
function remoteClick() {
    postRemoteAction("click", remoteX, remoteY);
}
// mouse event: double click
function remoteDoubleClick() {
    postRemoteAction("double_click", remoteX, remoteY);
}

// slider
const slider = document.getElementById('slider');
const screenshotContainer = document.getElementById('screenshot-container');
const intialSreenshotContainerWidth = screenshotContainer.clientWidth;
const contentContainer = document.getElementById('output-content');
const intialContentContainerWidth = contentContainer.clientWidth;
slider.addEventListener('input', function () {
    const value = slider.value;
    const max = slider.max;
    const percentage = (value / max);

    let scaleRate = percentage.toFixed(4) - 0.6
    let screenshotContainerScale = 1 - scaleRate;
    screenshotContainer.style.transform = `scale(${screenshotContainerScale})`;

    contentContainer.style.width = intialContentContainerWidth + intialSreenshotContainerWidth * scaleRate + "px";
});