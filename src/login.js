"use strict";

var utils = require("./utils");
var cheerio = require("cheerio");
var log = require("npmlog");

var defaultLogRecordSize = 100;
log.maxRecordSize = defaultLogRecordSize;

function setOptions(globalOptions, options) {
  Object.keys(options).map(function (key) {
    switch (key) {
      case "logLevel":
        log.level = options.logLevel;
        globalOptions.logLevel = options.logLevel;
        break;
      case "logRecordSize":
        log.maxRecordSize = options.logRecordSize;
        globalOptions.logRecordSize = options.logRecordSize;
        break;
      case "selfListen":
        globalOptions.selfListen = options.selfListen;
        break;
      case "listenEvents":
        globalOptions.listenEvents = options.listenEvents;
        break;
      case "pageID":
        globalOptions.pageID = options.pageID.toString();
        break;
      case "updatePresence":
        globalOptions.updatePresence = options.updatePresence;
        break;
      case "forceLogin":
        globalOptions.forceLogin = options.forceLogin;
        break;
      case "userAgent":
        globalOptions.userAgent = options.userAgent;
        break;
      case "autoMarkDelivery":
        globalOptions.autoMarkDelivery = options.autoMarkDelivery;
        break;
      case "autoMarkRead":
        globalOptions.autoMarkRead = options.autoMarkRead;
        break;
      default:
        log.warn("setOptions", "Unrecognized option given to setOptions: " + key);
        break;
    }
  });
}

function buildAPI(globalOptions, html, jar) {
  var maybeCookie = jar.getCookies("https://www.facebook.com").filter(function (val) {
    return val.cookieString().split("=")[0] === "c_user";
  });

  if (maybeCookie.length === 0) {
    throw {
      error: "Error retrieving userID. Try logging in with a browser to verify."
    };
  }

  var userID = maybeCookie[0].cookieString().split("=")[1].toString();
  log.info("login", "Logged in");

  var clientID = (Math.random() * 2147483648 | 0).toString(16);

  var ctx = {
    userID,
    jar,
    clientID,
    globalOptions,
    loggedIn: true,
    access_token: "NONE",
    clientMutationId: 0,
    mqttClient: undefined,
    lastSeqId: 0,
    syncToken: undefined
  };

  var api = {
    setOptions: setOptions.bind(null, globalOptions),
    getAppState: () => utils.getAppState(jar)
  };

  const apiFuncNames = [
    "addUserToGroup", "changeAdminStatus", "changeArchivedStatus",
    "changeBlockedStatus", "changeGroupImage", "changeNickname",
    "changeThreadColor", "changeThreadEmoji", "createPoll",
    "deleteMessage", "deleteThread", "forwardAttachment",
    "getCurrentUserID", "getEmojiUrl", "getFriendsList",
    "getThreadHistory", "getThreadInfo", "getThreadList",
    "getThreadPictures", "getUserID", "getUserInfo",
    "handleMessageRequest", "listenMqtt", "logout",
    "markAsDelivered", "markAsRead", "markAsReadAll",
    "muteThread", "removeUserFromGroup", "resolvePhotoUrl",
    "searchForThread", "sendMessage", "sendTypingIndicator",
    "setMessageReaction", "setTitle", "threadColors",
    "unsendMessage", "getThreadListDeprecated",
    "getThreadHistoryDeprecated", "getThreadInfoDeprecated", "listen"
  ];

  var defaultFuncs = utils.makeDefaults(html, userID, ctx);
  apiFuncNames.map((v) => {
    api[v] = require("./src/" + v)(defaultFuncs, api, ctx);
  });

  return [ctx, defaultFuncs, api];
}

function login(loginData, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }

  var globalOptions = {
    selfListen: false,
    listenEvents: false,
    updatePresence: false,
    forceLogin: false,
    autoMarkDelivery: true,
    autoMarkRead: false,
    logRecordSize: defaultLogRecordSize,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  };

  setOptions(globalOptions, options);

  var jar = utils.getJar();
  if (loginData.appState) {
    loginData.appState.map((c) => {
      var str =
        c.key +
        "=" +
        c.value +
        "; expires=" +
        c.expires +
        "; domain=" +
        c.domain +
        "; path=" +
        c.path +
        ";";
      jar.setCookie(str, "http://" + c.domain);
    });

    return utils
      .get("https://www.facebook.com/", jar, null, globalOptions)
      .then(utils.saveCookies(jar))
      .then((res) => {
        var html = res.body;
        var stuff = buildAPI(globalOptions, html, jar);
        return callback(null, stuff[2]);
      })
      .catch((e) => {
        log.error("login", e.error || e);
        return callback(e);
      });
  } else {
    return callback({ error: "No appState or credentials provided." });
  }
}

module.exports = login;