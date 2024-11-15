# debug-bridge-client
* Provide web pages to communicate with debug bridge agent.
* Set up this project with first version 1.0.0 on: 11/15/2024.

# How to configure agent servers?
* Put your agent server configure to agents.js, like below:
```
window.agents = {
    "x415": "127.0.0.1:8001",
    "x417": "127.0.0.2:8001",
    "x418": "127.0.0.3:8001"
};
```
* Then you can open index.html to use this client.