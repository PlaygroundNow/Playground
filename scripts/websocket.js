(function () {
  let socket;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  function playgroundEventHandler(event) {
    const { type, payload } = JSON.parse(event);

    switch (type) {
      case "attribute-updated":
        attributeUpdated(payload);
        break;
      case "block-added":
        blockAdded(payload);
        break;
      case "run-script":
        runScript(payload);
        break;
      case "open-file":
        openFile(payload);
        break;
      case "process-stdout":
      case "process-stderr":
      case "process-exit":
        forward({ type, payload });
        break;
      default:
        console.warn(`Unhandled playground event type: ${type}`);
        break;
    }
  }

  function forward(detail) {
    const event = new CustomEvent("playground:process", { detail });
    document.dispatchEvent(event);
  }

  function openFile({ contents, location }) {
    console.log(location);
    if (contents) {
      const world = document.querySelector("world-block");

      const windowBlock = document.createElement("window-block");
      windowBlock.innerHTML = `
        <span slot="nav-title">${location}</span>
        <code-block location="${location}" static></code-block>
      `;
      windowBlock.querySelector("code-block").textContent = contents;

      windowBlock.setAttribute("x", Number(world.props["scroll-x"]) + world.offsetWidth / 3);
      windowBlock.setAttribute("y", Number(world.props["scroll-y"]) + world.offsetHeight / 3);

      world.appendChild(windowBlock);
    }
  }

  function runScript({ contents, location, processId }) {
    if (contents && !processId) {
      const world = document.querySelector("world-block");
      world?.evaluate?.(`(function(){${contents}\n})();`);
    }
  }

  function attributeUpdated({ author, position, attribute, value }) {
    const node = blockTree[position];

    const world = document.querySelector("world-block");
    if (author === world.store.playerId) return;
    if (!node) return;

    node.block.setAttribute(attribute, value, false);
  }

  function blockAdded({ author, parentPosition, position, blockName, attributes }) {
    const me = localStorage.getItem("playerId");
    if (author === me) return;

    const block = document.createElement(blockName);

    for (let attr of attributes) {
      block.setAttribute(attr.name, attr.value, false);
    }

    const node = blockTree[position];

    if (node) {
      // found existing node, insert before
      node.block.insertAdjacentElement("beforebegin", block);
    } else {
      const parentNode = blockTree[parentPosition];
      parentNode.block.appendChild(block, false);
    }
  }

  function connect() {
    const protocol = window.location.protocol === "http:" ? "ws://" : "wss://";
    const address = protocol + window.location.host + "/ws";

    socket = new WebSocket(address);

    socket.onmessage = function (msg) {
      if (msg.data) {
        playgroundEventHandler(msg.data);
      }
    };

    socket.onclose = function () {
      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
        setTimeout(() => {
          reconnectAttempts++;
          connect();
        }, delay);
      }
    };

    socket.onopen = function () {
      reconnectAttempts = 0;
      console.log(
        "%c🔌 Websocket Connected!",
        "background: #D1FAE5; color: #065F46; font-size: 12px; padding: 4px 8px; border-radius: 6px; font-weight: bold;"
      );
    };
  }

  function safeSend(data) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    } else if (socket.readyState === WebSocket.CONNECTING) {
      setTimeout(() => safeSend(data), 100);
    } else {
      connect();
      setTimeout(() => safeSend(data), 100);
    }
  }

  if ("WebSocket" in window) {
    connect();

    document.body.addEventListener("playground:event", function (e) {
      safeSend(JSON.stringify(event.detail));
    });

    console.log(
      "%c🔄 Live Reload Enabled!",
      "background: #D1FAE5; color: #065F46; font-size: 12px; padding: 4px 8px; border-radius: 6px; font-weight: bold;"
    );
  }
})();
