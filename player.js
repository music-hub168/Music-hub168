(function () {
  "use strict";

  // ---- Your tracks. To add a song later, copy one block and change it. ----
  // url: relative path to the MP3 in this repo (spaces written as %20).
  // fallbackUrl: optional second address, tried only if url fails to load.
  // Leave url as "" for a track that has no audio file yet.
  var TRACKS = [
    {
      id: "nene-song",
      title: "Nene song",
      artist: "NINI CHILL",
      note: "Instrumental",
      url: "Nene%20song.mp3",
      fallbackUrl: "https://raw.githubusercontent.com/music-hub168/Music-hub168/refs/heads/main/Nene%20song.mp3"
    },
    {
      id: "soft-clouds",
      title: "Soft Clouds",
      artist: "NINI CHILL",
      note: "Instrumental",
      url: ""
    },
    {
      id: "slow-days",
      title: "Slow Days",
      artist: "NINI CHILL",
      note: "Instrumental",
      url: ""
    }
  ];

  var THEME_KEY = "nini-theme";
  var FAV_KEY = "nini-favorites";
  var THEME_COLORS = { cozy: "#f5f2e9", bw: "#ffffff" };

  function $(id) { return document.getElementById(id); }
  function readStore(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function writeStore(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
  function hasAudio(t) { return typeof t.url === "string" && t.url.length > 0; }
  function fmt(s) {
    if (!isFinite(s) || s < 0) { return "0:00"; }
    var m = Math.floor(s / 60);
    var r = Math.floor(s % 60);
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  // ---- Elements ----
  var btnCozy = $("theme-cozy");
  var btnBw = $("theme-bw");
  var metaTheme = $("meta-theme-color");
  var libraryList = $("library-list");
  var favoritesList = $("favorites-list");
  var favoritesEmpty = $("favorites-empty");
  var titleEl = $("player-title");
  var artistEl = $("player-artist");
  var btnPlay = $("btn-play");
  var btnPrev = $("btn-prev");
  var btnNext = $("btn-next");
  var iconPlay = $("icon-play");
  var iconPause = $("icon-pause");
  var seek = $("seek");
  var timeCurrent = $("time-current");
  var timeTotal = $("time-total");
  var statusEl = $("player-status");

  // ---- Theme ----
  function applyTheme(name, save) {
    if (name !== "bw") { name = "cozy"; }
    document.documentElement.setAttribute("data-theme", name);
    if (metaTheme) { metaTheme.setAttribute("content", THEME_COLORS[name]); }
    btnCozy.setAttribute("aria-pressed", name === "cozy" ? "true" : "false");
    btnBw.setAttribute("aria-pressed", name === "bw" ? "true" : "false");
    if (save) { writeStore(THEME_KEY, name); }
  }
  btnCozy.addEventListener("click", function () { applyTheme("cozy", true); });
  btnBw.addEventListener("click", function () { applyTheme("bw", true); });

  // ---- Favorites ----
  var favs = [];
  try {
    var parsed = JSON.parse(readStore(FAV_KEY) || "[]");
    if (Array.isArray(parsed)) { favs = parsed; }
  } catch (e) { favs = []; }

  function isFav(id) { return favs.indexOf(id) !== -1; }
  function toggleFav(id) {
    var pos = favs.indexOf(id);
    if (pos === -1) { favs.push(id); } else { favs.splice(pos, 1); }
    writeStore(FAV_KEY, JSON.stringify(favs));
  }

  // ---- Player state ----
  var audio = new Audio();
  audio.preload = "metadata";
  var cur = -1;
  var playing = false;
  var dragging = false;
  var wantPlay = false;
  var triedFallback = false;

  function setStatus(msg) { statusEl.textContent = msg; }

  function metaText(t) { return t.artist + (t.note ? " \u00B7 " + t.note : ""); }

  // Shows a message in the player bar (visible to everyone) and to screen readers
  function showProblem(msg) {
    artistEl.textContent = msg;
    setStatus(msg);
  }
  function clearProblem() {
    if (cur !== -1) { artistEl.textContent = metaText(TRACKS[cur]); }
    setStatus("");
  }

  function playableIndexes() {
    var list = [];
    for (var i = 0; i < TRACKS.length; i++) {
      if (hasAudio(TRACKS[i])) { list.push(i); }
    }
    return list;
  }

  function step(dir) {
    var list = playableIndexes();
    if (list.length === 0) { return -1; }
    var pos = list.indexOf(cur);
    if (pos === -1) { return list[0]; }
    return list[(pos + dir + list.length) % list.length];
  }

  function updatePlayUi() {
    iconPlay.hidden = playing;
    iconPause.hidden = !playing;
    btnPlay.setAttribute("aria-label", playing ? "Pause" : "Play");
  }

  function updateSeekUi() {
    var d = audio.duration;
    var pct = (isFinite(d) && d > 0) ? (audio.currentTime / d) * 100 : 0;
    if (!dragging) { seek.value = String(Math.round(pct * 10)); }
    seek.style.setProperty("--p", (Number(seek.value) / 10) + "%");
    timeCurrent.textContent = fmt(audio.currentTime);
    seek.setAttribute("aria-valuetext", fmt(audio.currentTime) + " of " + fmt(d));
  }

  function loadTrack(i) {
    cur = i;
    triedFallback = false;
    var t = TRACKS[i];
    audio.src = t.url;
    titleEl.textContent = t.title;
    artistEl.textContent = metaText(t);
    seek.value = "0";
    timeCurrent.textContent = "0:00";
    timeTotal.textContent = "0:00";
    seek.style.setProperty("--p", "0%");
    setStatus("");
  }

  function startPlay() {
    wantPlay = true;
    var p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch(function (err) {
        // A source swap or quick track change interrupts play(); that is not a failure.
        if (err && err.name === "AbortError") { return; }
        wantPlay = false;
        playing = false;
        updatePlayUi();
        renderLists();
        showProblem("Tap Play to start this track.");
      });
    }
  }

  function userPause() {
    wantPlay = false;
    audio.pause();
  }

  function playIndex(i) {
    if (i < 0 || !hasAudio(TRACKS[i])) { return; }
    if (i !== cur) { loadTrack(i); }
    startPlay();
  }

  btnPlay.addEventListener("click", function () {
    if (cur === -1) { return; }
    if (audio.paused) { startPlay(); } else { userPause(); }
  });

  btnPrev.addEventListener("click", function () {
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    playIndex(step(-1));
  });

  btnNext.addEventListener("click", function () {
    playIndex(step(1));
  });

  audio.addEventListener("play", function () {
    playing = true;
    clearProblem();
    updatePlayUi();
    renderLists();
  });
  audio.addEventListener("pause", function () {
    playing = false; updatePlayUi(); renderLists();
  });
  audio.addEventListener("ended", function () {
    playing = false;
    updatePlayUi();
    if (playableIndexes().length > 1) {
      playIndex(step(1));
    } else {
      wantPlay = false;
      audio.currentTime = 0;
      renderLists();
    }
  });
  audio.addEventListener("timeupdate", updateSeekUi);
  audio.addEventListener("loadedmetadata", function () {
    timeTotal.textContent = fmt(audio.duration);
    updateSeekUi();
  });
  audio.addEventListener("durationchange", function () {
    timeTotal.textContent = fmt(audio.duration);
  });
  audio.addEventListener("error", function () {
    var t = cur === -1 ? null : TRACKS[cur];
    // First failure: try the backup address once, if the track has one.
    if (t && t.fallbackUrl && !triedFallback) {
      triedFallback = true;
      audio.src = t.fallbackUrl;
      audio.load();
      if (wantPlay) { startPlay(); }
      return;
    }
    wantPlay = false;
    playing = false;
    updatePlayUi();
    renderLists();
    showProblem("This track could not be loaded.");
  });

  // Seek bar
  seek.addEventListener("pointerdown", function () { dragging = true; });
  document.addEventListener("pointerup", function () { dragging = false; });
  document.addEventListener("pointercancel", function () { dragging = false; });
  seek.addEventListener("input", function () {
    var d = audio.duration;
    if (isFinite(d) && d > 0) {
      audio.currentTime = (Number(seek.value) / 1000) * d;
    }
    updateSeekUi();
  });

  // ---- Track lists ----
  function makeRow(t, i) {
    var li = document.createElement("li");
    var isCurrent = i === cur;
    li.className = "track" + (isCurrent ? " is-current" : "");

    var art = document.createElement("div");
    art.className = "track-art";
    art.setAttribute("aria-hidden", "true");
    art.textContent = "\u266B";
    li.appendChild(art);

    var info = document.createElement("div");
    info.className = "track-info";
    var h = document.createElement("h3");
    h.className = "track-title";
    h.textContent = t.title;
    info.appendChild(h);
    var sub = document.createElement("p");
    sub.className = "track-sub";
    sub.textContent = metaText(t);
    info.appendChild(sub);

    if (!hasAudio(t)) {
      var soon = document.createElement("span");
      soon.className = "track-badge";
      soon.textContent = "Audio coming soon";
      info.appendChild(soon);
    } else if (isCurrent) {
      var now = document.createElement("span");
      now.className = "track-badge now";
      now.textContent = playing ? "Now playing" : "Selected";
      info.appendChild(now);
    }
    li.appendChild(info);

    var actions = document.createElement("div");
    actions.className = "track-actions";

    var fav = document.createElement("button");
    fav.type = "button";
    fav.className = "fav-btn";
    fav.setAttribute("data-action", "fav");
    fav.setAttribute("data-index", String(i));
    var on = isFav(t.id);
    fav.setAttribute("aria-pressed", on ? "true" : "false");
    fav.setAttribute("aria-label", (on ? "Remove " : "Add ") + t.title + (on ? " from favorites" : " to favorites"));
    fav.textContent = on ? "\u2665\uFE0E" : "\u2661\uFE0E";
    actions.appendChild(fav);

    if (hasAudio(t)) {
      var pb = document.createElement("button");
      pb.type = "button";
      pb.className = "btn";
      pb.setAttribute("data-action", "play");
      pb.setAttribute("data-index", String(i));
      var showPause = isCurrent && playing;
      pb.textContent = showPause ? "Pause" : "Play";
      pb.setAttribute("aria-label", (showPause ? "Pause " : "Play ") + t.title);
      actions.appendChild(pb);
    }

    li.appendChild(actions);
    return li;
  }

  function renderLists() {
    // Remember which button had focus so it keeps focus after re-render
    var ae = document.activeElement;
    var keep = null;
    if (ae && ae.getAttribute && ae.getAttribute("data-action")) {
      var ul = ae.closest("ul");
      if (ul && ul.id) {
        keep = { list: ul.id, action: ae.getAttribute("data-action"), index: ae.getAttribute("data-index") };
      }
    }

    libraryList.textContent = "";
    favoritesList.textContent = "";
    var favCount = 0;
    for (var i = 0; i < TRACKS.length; i++) {
      libraryList.appendChild(makeRow(TRACKS[i], i));
      if (isFav(TRACKS[i].id)) {
        favoritesList.appendChild(makeRow(TRACKS[i], i));
        favCount++;
      }
    }
    favoritesEmpty.hidden = favCount > 0;

    if (keep) {
      var target = $(keep.list).querySelector(
        'button[data-action="' + keep.action + '"][data-index="' + keep.index + '"]'
      );
      if (target) { target.focus(); }
    }
  }

  function onListClick(e) {
    var b = e.target.closest("button[data-action]");
    if (!b) { return; }
    var i = Number(b.getAttribute("data-index"));
    var action = b.getAttribute("data-action");
    if (action === "play") {
      if (i === cur && !audio.paused) { userPause(); } else { playIndex(i); }
    } else if (action === "fav") {
      toggleFav(TRACKS[i].id);
      renderLists();
    }
  }
  libraryList.addEventListener("click", onListClick);
  favoritesList.addEventListener("click", onListClick);

  // ---- Bottom navigation highlight ----
  var navLinks = document.querySelectorAll(".nav-link");
  function setActive(name) {
    for (var i = 0; i < navLinks.length; i++) {
      var on = navLinks[i].getAttribute("data-section") === name;
      if (on) { navLinks[i].setAttribute("aria-current", "page"); }
      else { navLinks[i].removeAttribute("aria-current"); }
    }
  }
  for (var n = 0; n < navLinks.length; n++) {
    navLinks[n].addEventListener("click", function () {
      setActive(this.getAttribute("data-section"));
    });
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      for (var k = 0; k < entries.length; k++) {
        if (entries[k].isIntersecting) { setActive(entries[k].target.id); }
      }
    }, { rootMargin: "-35% 0px -55% 0px", threshold: 0 });
    ["home", "library", "favorites"].forEach(function (id) {
      var el = $(id);
      if (el) { io.observe(el); }
    });
  }

  // ---- Start ----
  var saved = readStore(THEME_KEY);
  applyTheme(saved === "bw" ? "bw" : "cozy", false);

  var firstPlayable = playableIndexes();
  if (firstPlayable.length > 0) {
    loadTrack(firstPlayable[0]);
  } else {
    btnPlay.disabled = true;
    seek.disabled = true;
    titleEl.textContent = "No playable tracks yet";
  }
  btnPrev.disabled = firstPlayable.length < 2;
  btnNext.disabled = firstPlayable.length < 2;
  updatePlayUi();
  updateSeekUi();
  renderLists();
})();
