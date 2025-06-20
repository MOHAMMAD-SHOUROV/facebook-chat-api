"use strict";

const utils = require("./utils");
const log = require("npmlog");
const mqtt = require("mqtt");

function listenMqtt(api, options, logMessage) {
  const cookie = Array.isArray(options.appState)
  ? options.appState.map(e => `${e.key}=${e.value}`).join(";")
  : "";

  const client = mqtt.connect("wss://edge-chat.facebook.com/chat", {
    wsOptions: {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Cookie": cookie
      }
    }
  });

  client.on("connect", () => {
    log.info("MQTT", "✅ Connected to Facebook MQTT");
    client.subscribe("/t_ms");
  });

  client.on("message", (topic, message) => {
    if (topic === "/t_ms") {
      try {
        const data = JSON.parse(message.toString());
        if (data && Array.isArray(data.deltas)) {
          for (const delta of data.deltas) {
            logMessage(delta);
          }
        }
      } catch (e) {
        log.error("MQTT", "Error parsing message:", e);
      }
    }
  });

  client.on("error", (err) => {
    log.error("MQTT", "Connection error:", err);
  });

  return {
    stopListening: () => client.end(true)
  };
}

module.exports = listenMqtt;
