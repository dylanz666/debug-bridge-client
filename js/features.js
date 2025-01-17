let currentPid = "";
let currentAgent = "";
let loadAllOutput = true;
let startLine = 0;
let executeCommandIntervalId = null;
let loadOutputIntervalId = null;
let liveScreenshotInterval = null;
let agents = [];
let agentNames = [];
let agentName = "";
let emptyContentIndex = 0;

function pingAgent() {
    if ("" == currentAgent || null == currentAgent || undefined == currentAgent) {
        alert("Please set agent info!");
        return
    }

    let results = agents.filter((agent) => {
        return agent.host == currentAgent;
    });
    if (results.length == 1) {
        agentName = agentNames[agents.indexOf(results[0])];
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
            pingButton.innerText = `${agentName} - Disconnected`;
            pingButton.className = "red-button";
            throw new Error('Network response was not ok.');
        })
        .then(() => {
            pingButton.innerText = `${agentName} - Connected`;
            pingButton.className = "green-button";
            getScreenshot();
        })
        .catch(error => {
            console.error('Error:', error);
            pingButton.innerText = `${agentName} - Disconnected`;
            pingButton.className = "red-button";
        });
}

/* function addAgent() {
    agent = window.prompt('please input agent info with format: <ip:port>', '');
} */

function clearCommand() {
    document.getElementById('command-input').value = "";
}

function setAgents() {
    for (const key in window.agents) {
        if (window.agents.hasOwnProperty(key)) {
            agentNames.push(key);
            agents.push(window.agents[key]);
        }
    }

    var agentSelectBox = document.getElementById("agentSelectBox");
    for (var i = 0; i < agents.length; i++) {
        var option = document.createElement("option");
        option.value = agents[i].host;
        option.text = agents[i].host + `(${agentNames[i]})`;
        agentSelectBox.appendChild(option);
    }

    currentAgent = document.getElementById("agentSelectBox").value;
    let results = agents.filter((agent) => {
        return agent.host == currentAgent;
    });
    if (results.length == 1) {
        const storedDefaultDirectory = localStorage.getItem('defaultDirectory');
        // default directory
        document.getElementById("default-directory").value = storedDefaultDirectory ? storedDefaultDirectory : results[0].defaultDirectory;
        // deafult command       
        document.getElementById("command-input").value = results[0].defaultCommand;
    }
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
        executeCommandIntervalId = null;
    }
    if (null != loadOutputIntervalId) {
        clearInterval(loadOutputIntervalId);
        loadOutputIntervalId = null;
    }
    document.getElementById('output-content').innerHTML = "";
    startLine = 0;
    loadAllOutput = true;

    let cmd = document.getElementById("command-input").value;
    if ("" == cmd || null == cmd || undefined == cmd) {
        alert("Please input command!");
        return
    }
    localStorage.setItem("command", cmd);
    let defaultDirectory = document.getElementById("default-directory").value;
    localStorage.setItem("defaultDirectory", defaultDirectory);
    cmd = `cd ${document.getElementById("default-directory").value} && ${cmd}`

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
                contentEntry.innerHTML = `<span style="background-color: yellow">${data.command}</span>`;
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
            emptyContentIndex = content.length == 0 ? (emptyContentIndex + 1) : 0;
            if (emptyContentIndex == 120) {
                clearInterval(executeCommandIntervalId);
                executeCommandIntervalId = null;
                clearInterval(loadOutputIntervalId);
                loadOutputIntervalId = null;
                emptyContentIndex = 0;
            }
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
    currentPid = document.getElementById("pid").value;
    if ("" == currentPid || null == currentPid) {
        alert("Please select pid first!");
        return;
    }
    if (null != executeCommandIntervalId) {
        clearInterval(executeCommandIntervalId);
        executeCommandIntervalId = null;
    }
    if (null != loadOutputIntervalId) {
        clearInterval(loadOutputIntervalId);
        loadOutputIntervalId = null;
    }
    emptyContentIndex = 0;
    loadOutputIntervalId = setInterval(loadOutputByApi, 1000);
}

function loadAllContent() {
    currentPid = document.getElementById("pid").value;
    if ("" == currentPid || null == currentPid) {
        alert("Please select pid first!");
        return;
    }
    if (null != executeCommandIntervalId) {
        clearInterval(executeCommandIntervalId);
        executeCommandIntervalId = null;
    }
    if (null != loadOutputIntervalId) {
        clearInterval(loadOutputIntervalId);
        loadOutputIntervalId = null;
    }
    emptyContentIndex = 0;
    document.getElementById("output-content").innerHTML = "";
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
                if (null != executeCommandIntervalId) {
                    clearInterval(executeCommandIntervalId);
                    executeCommandIntervalId = null;
                }
                if (null != loadOutputIntervalId) {
                    clearInterval(loadOutputIntervalId);
                    loadOutputIntervalId = null;
                }
                emptyContentIndex = 0;
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
    const lowerCaseMessage = message.toLowerCase();
    if (lowerCaseMessage.indexOf("error") > -1 || lowerCaseMessage.indexOf("fail") > -1) {
        contentEntry.style.backgroundColor = "red";
        contentEntry.style.color = "white";
    }
    if (lowerCaseMessage.indexOf("passed") > -1 || lowerCaseMessage.indexOf("success") > -1) {
        contentEntry.style.backgroundColor = "lightgreen";
    }
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
                if (null != executeCommandIntervalId) {
                    clearInterval(executeCommandIntervalId);
                    executeCommandIntervalId = null;
                }
                if (null != loadOutputIntervalId) {
                    clearInterval(loadOutputIntervalId);
                    loadOutputIntervalId = null;
                }
                emptyContentIndex = 0;
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
    if (null != executeCommandIntervalId) {
        clearInterval(executeCommandIntervalId);
        executeCommandIntervalId = null;
    }
    if (null != loadOutputIntervalId) {
        clearInterval(loadOutputIntervalId);
        loadOutputIntervalId = null;
    }
    emptyContentIndex = 0;
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

// unify getting screenshot
let useAdb = false;
function getScreenshot() {
    if (useAdb) {
        screenshotElement.removeAttribute('crossorigin');
    } else {
        screenshotElement.setAttribute('crossorigin', 'anonymous');
    }
    showPleaseWaitInImg();
    if (!useAdb) {
        getServerScreenshot();
        return;
    }
    const intervalId = setInterval(() => {
        if (currentDeviceId) {
            getAdbScreenshot();
            clearInterval(intervalId);
        }
    }, 100);
}

function getServerScreenshot() {
    let refreshButton = document.getElementById('refresh-screenshot');
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
        liveScreenshotInterval = null;
        liveScreenshotElement.className = "sky-blue-button";
        liveScreenshotElement.innerText = "Live";
        return
    }
    liveScreenshotElement.className = "red-button";
    liveScreenshotElement.innerText = "Stop Live";
    const interval = useAdb ? 3500 : 1000;
    liveScreenshotInterval = setInterval(function () {
        let element = document.getElementById("screenshot");
        element.setAttribute('crossorigin', 'anonymous');
        if (useAdb) {
            element.src = `http://${currentAgent}/bridge/adb_screenshot?device_id=${currentDeviceId}&timestamp=${new Date().getTime()}`;
            return
        }
        element.src = `http://${currentAgent}/bridge/screenshot?timestamp=${new Date().getTime()}`;
    }, interval);
}

let desktopWidth = 0;
let desktopHeight = 0;
function getScreenSize(currentDeviceId) {
    const parameters = currentDeviceId ? `?device_id=${currentDeviceId}` : '';
    fetch(`http://${currentAgent}/bridge/screen_size${parameters}`, {
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

function loadCommandFromStorage() {
    const storedCommand = localStorage.getItem('command');
    document.getElementById("command-input").value = storedCommand ? storedCommand : "";
}

// agent select box
document.getElementById('agentSelectBox').addEventListener('change', function () {
    let liveScreenshotElement = document.getElementById("live-screenshot");
    if (null != liveScreenshotInterval) {
        clearInterval(liveScreenshotInterval);
        liveScreenshotInterval = null;
        liveScreenshotElement.className = "sky-blue-button";
        liveScreenshotElement.innerText = "Live";
    }

    // mock: close switch
    const toggleSwitch = document.getElementById('toggleSwitch');
    toggleSwitch.checked = false;
    const event = new Event('change', {
        bubbles: true,
        cancelable: true
    });
    toggleSwitch.dispatchEvent(event);

    let pingButton = document.getElementById("pingButton");
    pingButton.innerText = "Connecting...";
    pingButton.className = "gray-button";
    currentAgent = document.getElementById("agentSelectBox").value;
    localStorage.setItem("defaultDirectory", "");
    let results = agents.filter((agent) => {
        return agent.host == currentAgent;
    });
    if (results.length == 1) {
        // default directory
        document.getElementById("default-directory").value = results[0].defaultDirectory;
        // deafult command       
        document.getElementById("command-input").value = results[0].defaultCommand;
    }
    pingAgent();
    getPids();
    getScreenSize();
});

// screenshot
const screenshotElement = document.getElementById('screenshot');
const bigScreenshotModel = document.getElementById('big-screenshot-model');
const closeModal = document.getElementById('closeModal');
const bigScreenshotElement = document.getElementById('big-screenshot');
let isMousedown = false;
// mouse hover
let hoverTimer;
let lastMousePosition = { x: null, y: null };
let isHovering = false;
screenshotElement.addEventListener('mouseover', function () {
    screenshotElement.focus();
    hoverTimer = setTimeout(function () {
        if (!isMousedown) {
            postRemoteAction("hover", remoteX, remoteY);
            isHovering = true;
        }
    }, 2000);
});
screenshotElement.addEventListener('mousemove', function (event) {
    screenshotElement.focus();
    const currentMousePosition = { x: event.clientX, y: event.clientY };
    if (lastMousePosition.x === currentMousePosition.x && lastMousePosition.y === currentMousePosition.y) {
        return;
    }

    clearTimeout(hoverTimer);
    isHovering = false;
    lastMousePosition = currentMousePosition;
    hoverTimer = setTimeout(function () {
        if (!isMousedown) {
            postRemoteAction("hover", remoteX, remoteY);
            isHovering = true;
        }
    }, 2000);
});
screenshotElement.addEventListener('mouseout', function () {
    clearTimeout(hoverTimer);
    isHovering = false;
    lastMousePosition = { x: null, y: null };
});
// drag
screenshotElement.addEventListener('dragstart', (event) => {
    // prevent default drag action of image
    event.preventDefault();
});
// contextmenu
screenshotElement.addEventListener('contextmenu', function (event) {
    // prevent default contextmenu action of image
    event.preventDefault();

    postRemoteAction("mouse_right", remoteX, remoteY);
});
// select or click
let mouseDownX = 0;
let mouseDownY = 0;
screenshotElement.addEventListener('mousedown', function (event) {
    // 0 is about mouse left
    if (event.button === 0) {
        isMousedown = true;
        mouseDownX = remoteX;
        mouseDownY = remoteY;
    }
});
screenshotElement.addEventListener('mouseup', function (event) {
    // 0 is about mouse left
    if (event.button === 0) {
        isMousedown = false;
        if (mouseDownX != remoteX || mouseDownY != remoteY) {
            // action: select text            
            postRemoteAction("select", mouseDownX, mouseDownY, remoteX, remoteY);
        } else {
            // action: click
            postRemoteAction("click", remoteX, remoteY);
        }
    }
});

// mouse event: double click
function remoteDoubleClick() {
    postRemoteAction("double_click", remoteX, remoteY);
}

// send key to remote
screenshotElement.addEventListener('keydown', function (event) {
    // combination keys
    if (event.ctrlKey) {
        postRemoteAction("keyboard_input", remoteX, remoteY, 0, 0, "Control", event.key);
        event.preventDefault();
        return
    }
    if (event.shiftKey) {
        postRemoteAction("keyboard_input", remoteX, remoteY, 0, 0, "Shift", event.key);
        event.preventDefault();
        return
    }
    if (event.altKey) {
        postRemoteAction("keyboard_input", remoteX, remoteY, 0, 0, "Alt", event.key);
        event.preventDefault();
        return
    }
    // arrows
    switch (event.key) {
        case 'ArrowUp':
            postRemoteAction("keyboard_input", remoteX, remoteY, 0, 0, "up");
            event.preventDefault();
            break;
        case 'ArrowDown':
            postRemoteAction("keyboard_input", remoteX, remoteY, 0, 0, "down");
            event.preventDefault();
            break;
        case 'ArrowLeft':
            postRemoteAction("keyboard_input", remoteX, remoteY, 0, 0, "left");
            event.preventDefault();
            break;
        case 'ArrowRight':
            postRemoteAction("keyboard_input", remoteX, remoteY, 0, 0, "right");
            event.preventDefault();
            break;
        default:
            // common keys
            postRemoteAction("keyboard_input", remoteX, remoteY, 0, 0, event.key);
            event.preventDefault();
            break;
    }
});
screenshotElement.setAttribute('tabindex', '0');

// mouse move
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

function postRemoteAction(action, startX, startY, endX = 0, endY = 0, mainKey = "", bindKey = "") {
    fetch(`http://${currentAgent}/bridge/screen_action`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            device_id: currentDeviceId,
            action: action,
            start_x: startX,
            start_y: startY,
            end_x: endX,
            end_y: endY,
            main_key: mainKey,
            bind_key: bindKey
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok.');
            }
            if (currentDeviceId) {
                setTimeout(getScreenshot, 500);
            } else {
                getScreenshot();
                setTimeout(getScreenshot, 500);
                setTimeout(getScreenshot, 1000);
            }
            return response.json();
        })
        .then(data => {
            // pass
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

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

// slider
const slider = document.getElementById('slider');
const screenshotContainer = document.getElementById('screenshot-container');
const intialScreenshotContainerWidth = screenshotContainer.getBoundingClientRect().width;
const contentContainer = document.getElementById('output-content');
const intialContentContainerWidth = contentContainer.getBoundingClientRect().width;
slider.addEventListener('input', function () {
    const value = slider.value;

    screenshotContainer.style.width = parseInt(intialScreenshotContainerWidth) - parseInt(value) + 300 + "px";

    contentContainer.style.width = parseInt(window.innerWidth - screenshotContainer.getBoundingClientRect().width) - 60 + "px";
});

let currentDeviceId = "";
function setAdbDevices() {
    fetch(`http://${currentAgent}/bridge/adb_devices`, {
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
            var adbSelectBox = document.getElementById("adbSelectBox");
            adbSelectBox.innerHTML = "";
            for (var i = 0; i < data.length; i++) {
                var option = document.createElement("option");
                option.value = data[i];
                option.text = data[i];
                adbSelectBox.appendChild(option);
            }
            currentDeviceId = document.getElementById("adbSelectBox").value;
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function getAdbScreenshot() {
    screenshotElement.setAttribute('crossorigin', 'anonymous');

    let refreshButton = document.getElementById('refresh-screenshot');
    refreshButton.innerText = "Refreshing";
    refreshButton.className = "gray-button";

    document.getElementById("screenshot").src = `http://${currentAgent}/bridge/adb_screenshot?device_id=${currentDeviceId}&timestamp=${new Date().getTime()}`;

    setTimeout(function () {
        refreshButton.innerText = "Refresh";
        refreshButton.className = "green-button";
    }, 1000);
}

// adb select box event listener
const adbSelectBox = document.getElementById('adbSelectBox');
adbSelectBox.addEventListener('change', function () {
    currentDeviceId = document.getElementById("adbSelectBox").value;
    getScreenSize(currentDeviceId);
    getScreenshot();
});

// switch event listener
const toggleSwitch = document.getElementById('toggleSwitch');
const wakeUpButton = document.getElementById('wakeUp');
const refreshDevicesButton = document.getElementById('refresh-devices');
const rebootButton = document.getElementById('reboot');
toggleSwitch.addEventListener('change', function () {
    let liveScreenshotElement = document.getElementById("live-screenshot");
    if (null != liveScreenshotInterval) {
        clearInterval(liveScreenshotInterval);
        liveScreenshotInterval = null;
        liveScreenshotElement.className = "sky-blue-button";
        liveScreenshotElement.innerText = "Live";
    }

    useAdb = this.checked;
    if (!this.checked) {
        currentDeviceId = "";
        getScreenSize();
    } else {
        setAdbDevices();
        const intervalId = setInterval(() => {
            if (currentDeviceId) {
                getScreenSize(currentDeviceId);
                clearInterval(intervalId);
            }
        }, 100);
    }
    adbSelectBox.style.display = this.checked ? 'inline' : 'none';
    wakeUpButton.style.display = this.checked ? 'inline' : 'none';
    refreshDevicesButton.style.display = this.checked ? 'inline' : 'none';
    rebootButton.style.display = this.checked ? 'inline' : 'none';
    getScreenshot();
});

function refreshDevices() {
    if (!useAdb) {
        currentDeviceId = "";
        getScreenSize();
    } else {
        setAdbDevices();
        const intervalId = setInterval(() => {
            if (currentDeviceId) {
                getScreenSize(currentDeviceId);
                clearInterval(intervalId);
            }
        }, 100);
    }
    adbSelectBox.style.display = useAdb ? 'inline' : 'none';
    wakeUpButton.style.display = useAdb ? 'inline' : 'none';
    refreshDevicesButton.style.display = useAdb ? 'inline' : 'none';
    getScreenshot();
}

function showPleaseWaitInImg() {
    const width = screenshotElement.width;
    const height = screenshotElement.height;
    if (screenshotElement.src && width && height) {
        screenshotElement.style.width = `${width}px`;
        screenshotElement.style.height = `${height}px`;
    }
    screenshotElement.src = "please-wait.webp";
}

function refreshScreenshot() {
    getScreenshot();
}

function wakeUpAndroidDevice() {
    cmd = `adb -s ${currentDeviceId} shell input keyevent KEYCODE_WAKEUP`;

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
            getScreenshot();
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function rebootAndroidDevice() {
    cmd = `adb -s ${currentDeviceId} reboot`;

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
            getScreenshot();
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// default to hide adb select box and wake up button
adbSelectBox.style.display = 'none';
wakeUpButton.style.display = 'none';
refreshDevicesButton.style.display = 'none';
rebootButton.style.display = 'none';

window.onload = loadCommandFromStorage();
window.onload = setAgents();
window.onload = getPids();
window.onload = getScreenSize();
pingAgent();