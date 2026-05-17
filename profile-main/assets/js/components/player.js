(() => {
  const audio = document.getElementById("audio");
  const playBtn = document.getElementById("playBtn");
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const progressBar = document.getElementById("progressBar");
  const current = document.getElementById("current");
  const duration = document.getElementById("duration");
  const musicTitle = document.getElementById("musicTitle");
  const musicArtist = document.getElementById("musicArtist");
  const musicPlayer = document.getElementById("musicPlayer");
  const musicToggle = document.getElementById("musicToggle");
  const volumeSlider = document.getElementById("volumeSlider");
  const progress = document.querySelector(".progress");
  const canvas = document.getElementById("visualizer");

  if (
    !audio ||
    !playBtn ||
    !nextBtn ||
    !prevBtn ||
    !progressBar ||
    !current ||
    !duration ||
    !musicTitle ||
    !musicArtist ||
    !musicPlayer ||
    !musicToggle ||
    !volumeSlider ||
    !progress
  ) {
    return;
  }

  const playlist = [
    { title: "Bài 1", artist: "MP4 Music", src: "https://files.catbox.moe/343g0o.mp4" },
    { title: "Bài 2", artist: "MP4 Music", src: "https://files.catbox.moe/i6lum4.mp4" },
    { title: "Bài 3", artist: "MP4 Music", src: "https://files.catbox.moe/qoc2wv.mp4" },
    { title: "Bài 4", artist: "MP4 Music", src: "https://files.catbox.moe/6vryoo.mp4" },
    { title: "Bài 5", artist: "MP4 Music", src: "https://files.catbox.moe/gcbu9w.mp4" },
    { title: "Bài 6", artist: "MP Music", src: "https://files.catbox.moe/plsvn1.mp4" }
  ];

  let currentSong = 0;
  let isPlaying = false;
  let audioContext = null;
  let analyser = null;
  let dataArray = null;
  let canvasContext = null;
  let visualizerEnabled = false;

  audio.crossOrigin = "anonymous";
  audio.preload = "metadata";
  audio.volume = 0.7;

  function formatTime(time) {
    if (!Number.isFinite(time)) {
      return "0:00";
    }

    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? `0${sec}` : sec}`;
  }

  function setPlayIcon(isPause) {
    playBtn.innerHTML = isPause
      ? '<i class="fa-solid fa-pause"></i>'
      : '<i class="fa-solid fa-play"></i>';
  }

  function loadSong(index) {
    const song = playlist[index];

    musicTitle.textContent = song.title;
    musicArtist.textContent = song.artist;
    current.textContent = "0:00";
    duration.textContent = "0:00";
    progressBar.style.width = "0%";

    audio.src = song.src;
    audio.load();
  }

  async function playCurrentSong() {
    try {
      await audio.play();
      isPlaying = true;
      setPlayIcon(true);
    } catch (error) {
      console.error("Audio play failed:", error);
      isPlaying = false;
      setPlayIcon(false);
      musicArtist.textContent = "Không thể phát bài này";
    }
  }

  function pauseCurrentSong() {
    audio.pause();
    isPlaying = false;
    setPlayIcon(false);
  }

  function nextSong(autoplay = true) {
    currentSong = (currentSong + 1) % playlist.length;
    loadSong(currentSong);

    if (autoplay) {
      playCurrentSong();
    }
  }

  function previousSong() {
    currentSong = (currentSong - 1 + playlist.length) % playlist.length;
    loadSong(currentSong);
    playCurrentSong();
  }

  function drawVisualizer() {
    if (!visualizerEnabled || !canvas || !canvasContext || !analyser || !dataArray) {
      return;
    }

    requestAnimationFrame(drawVisualizer);
    analyser.getByteFrequencyData(dataArray);

    canvasContext.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    const barWidth = (canvas.clientWidth / dataArray.length) * 1.8;
    let x = 0;

    for (let index = 0; index < dataArray.length; index += 1) {
      const barHeight = dataArray[index] * 0.22;
      const gradient = canvasContext.createLinearGradient(0, 0, 0, canvas.clientHeight);

      gradient.addColorStop(0, "#00ffe1");
      gradient.addColorStop(0.5, "#00ff99");
      gradient.addColorStop(1, "#1877f2");

      canvasContext.fillStyle = gradient;
      canvasContext.shadowBlur = 16;
      canvasContext.shadowColor = "#00ffe1";
      canvasContext.fillRect(
        x,
        canvas.clientHeight - barHeight,
        barWidth,
        barHeight
      );

      x += barWidth + 2;
    }
  }

  function ensureVisualizer() {
    if (!canvas || visualizerEnabled || audioContext) {
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      canvasContext = canvas.getContext("2d");
      audioContext = new AudioContextClass();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      const source = audioContext.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      dataArray = new Uint8Array(analyser.frequencyBinCount);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      canvasContext.scale(dpr, dpr);

      visualizerEnabled = true;
      drawVisualizer();
    } catch (error) {
      console.warn("Visualizer disabled:", error);
      visualizerEnabled = false;

      if (canvas) {
        canvas.style.display = "none";
      }
    }
  }

  musicToggle.addEventListener("click", () => {
    musicPlayer.classList.toggle("active");
  });

  playBtn.addEventListener("click", async () => {
    ensureVisualizer();

    if (audioContext?.state === "suspended") {
      await audioContext.resume();
    }

    if (!isPlaying) {
      playCurrentSong();
    } else {
      pauseCurrentSong();
    }
  });

  nextBtn.addEventListener("click", () => nextSong(true));
  prevBtn.addEventListener("click", previousSong);

  audio.addEventListener("ended", () => nextSong(true));

  audio.addEventListener("loadedmetadata", () => {
    duration.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    const percent = audio.duration
      ? (audio.currentTime / audio.duration) * 100
      : 0;

    progressBar.style.width = `${percent}%`;
    current.textContent = formatTime(audio.currentTime);
    duration.textContent = formatTime(audio.duration);
  });

  audio.addEventListener("error", () => {
    console.warn("Audio source failed:", playlist[currentSong]?.src);
    musicArtist.textContent = "Nguồn nhạc lỗi, đang chuyển bài...";
    isPlaying = false;
    setPlayIcon(false);
    setTimeout(() => nextSong(true), 500);
  });

  progress.addEventListener("click", (event) => {
    const width = progress.clientWidth;
    const clickX = event.offsetX;

    if (audio.duration) {
      audio.currentTime = (clickX / width) * audio.duration;
    }
  });

  volumeSlider.addEventListener("input", () => {
    audio.volume = Number(volumeSlider.value);
  });

  setPlayIcon(false);
  loadSong(currentSong);
})();
