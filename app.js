/**
 * Kurumi Music Cover
 * App Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const els = {
        inputCard: document.getElementById('inputCard'),
        urlInput: document.getElementById('urlInput'),
        btnGenerate: document.getElementById('btnGenerate'),
        dropZone: document.getElementById('dropZone'),
        fileInput: document.getElementById('fileInput'),
        
        processingPanel: document.getElementById('processingPanel'),
        clockTicks: document.getElementById('clockTicks'),
        processingMsg: document.getElementById('processingMsg'),
        progressBar: document.getElementById('progressBar'),
        
        resultPanel: document.getElementById('resultPanel'),
        resultSourceLabel: document.getElementById('resultSourceLabel'),
        audioPlayer: document.getElementById('audioPlayer'),
        btnPlayPause: document.getElementById('btnPlayPause'),
        iconPlay: document.getElementById('iconPlay'),
        iconPause: document.getElementById('iconPause'),
        audioProgress: document.getElementById('audioProgress'),
        audioProgressFill: document.getElementById('audioProgressFill'),
        timeDisplay: document.getElementById('timeDisplay'),
        waveformDisplay: document.getElementById('waveformDisplay'),
        btnDownload: document.getElementById('btnDownload'),
        btnNewCover: document.getElementById('btnNewCover'),
        
        toastContainer: document.getElementById('toastContainer')
    };

    // State
    const state = {
        isProcessing: false,
        isPlaying: false,
        get serverUrl() {
            return (localStorage.getItem('kurumiServerUrl') || 'http://127.0.0.1:7869').replace(/\/$/, '');
        },
        get apiEndpoint() {
            return this.serverUrl + '/cover';
        }
    };

    // ─── Settings Modal ───────────────────────────────────────────────
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsClose = document.getElementById('settingsClose');
    const serverUrlInput = document.getElementById('serverUrlInput');
    const btnSaveSettings = document.getElementById('btnSaveSettings');
    const serverStatusDot = document.getElementById('serverStatusDot');
    const serverStatusText = document.getElementById('serverStatusText');

    function loadSettings() {
        serverUrlInput.value = localStorage.getItem('kurumiServerUrl') || 'http://127.0.0.1:7869';
    }

    // ── Tự động đọc ?server= từ URL (khi bạn bè mở share link) ──
    const urlParams = new URLSearchParams(window.location.search);
    const serverParam = urlParams.get('server');
    if (serverParam) {
        localStorage.setItem('kurumiServerUrl', serverParam);
        // Xoa param khoi URL cho gon (khong reload)
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
    }

    async function checkServerHealth(url) {
        try {
            const res = await fetch(url.replace(/\/$/, '') + '/health', { 
                signal: AbortSignal.timeout(3000),
                headers: { 'ngrok-skip-browser-warning': '1' }
            });
            return res.ok;
        } catch { return false; }
    }

    async function updateServerStatus() {
        const url = localStorage.getItem('kurumiServerUrl') || 'http://127.0.0.1:7869';
        serverStatusDot.style.background = '#888';
        serverStatusText.textContent = 'Đang kiểm tra...';
        const ok = await checkServerHealth(url);
        if (ok) {
            serverStatusDot.style.background = '#22c55e';
            serverStatusDot.style.boxShadow = '0 0 6px #22c55e';
            serverStatusText.textContent = 'Server Online ✓';
        } else {
            serverStatusDot.style.background = '#ef4444';
            serverStatusDot.style.boxShadow = '0 0 6px #ef4444';
            serverStatusText.textContent = 'Server Offline';
        }
    }

    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
        loadSettings();
        updateServerStatus();
    });
    settingsClose.addEventListener('click', () => settingsModal.style.display = 'none');
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.style.display = 'none'; });

    btnSaveSettings.addEventListener('click', () => {
        const val = serverUrlInput.value.trim();
        if (val) {
            localStorage.setItem('kurumiServerUrl', val);
            showToast('Đã lưu URL server!', 'success');
            updateServerStatus();
        }
    });

    // Copy Share Link
    const btnCopy = document.getElementById('btnCopyShareLink');
    if (btnCopy) {
        btnCopy.addEventListener('click', () => {
            const serverUrl = serverUrlInput.value.trim() || localStorage.getItem('kurumiServerUrl') || '';
            if (!serverUrl || serverUrl.includes('127.0.0.1')) {
                showToast('Hãy nhập URL tunnel (Cloudflare/ngrok) trước!', 'warning');
                return;
            }
            const shareLink = `${window.location.origin}${window.location.pathname}?server=${encodeURIComponent(serverUrl)}`;
            navigator.clipboard.writeText(shareLink).then(() => {
                showToast('✓ Đã copy link chia sẻ! Gửi cho bạn bè.', 'success');
            });
        });
    }

    // Check server status on load
    updateServerStatus();


    // Setup Clock Ticks
    for (let i = 0; i < 60; i++) {
        if (i % 5 === 0) continue; // Skip main hours
        const tick = document.createElement('div');
        tick.className = 'clock-tick';
        tick.style.transform = `translateX(-50%) rotate(${i * 6}deg)`;
        if (els.clockTicks) els.clockTicks.appendChild(tick);
    }

    // Setup Fake Waveform
    for (let i = 0; i < 30; i++) {
        const bar = document.createElement('div');
        bar.className = 'wave-bar';
        bar.style.height = `${Math.random() * 40 + 10}%`;
        if (els.waveformDisplay) els.waveformDisplay.appendChild(bar);
    }

    // Particles
    initParticles();

    // Event Listeners
    els.btnGenerate.addEventListener('click', () => {
        const url = els.urlInput.value.trim();
        if (!url) {
            showToast('Please enter a YouTube or music URL', 'error');
            return;
        }
        processUrl(url);
    });

    els.urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') els.btnGenerate.click();
    });

    els.dropZone.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) processFile(e.target.files[0]);
    });

    els.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        els.dropZone.classList.add('drag-active');
    });
    els.dropZone.addEventListener('dragleave', () => {
        els.dropZone.classList.remove('drag-active');
    });
    els.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        els.dropZone.classList.remove('drag-active');
        if (e.dataTransfer.files.length) processFile(e.dataTransfer.files[0]);
    });

    els.btnNewCover.addEventListener('click', () => {
        els.resultPanel.classList.remove('active');
        els.inputCard.style.display = 'block';
        els.urlInput.value = '';
        if (state.isPlaying) togglePlay();
        URL.revokeObjectURL(els.audioPlayer.src);
    });

    // Audio Player controls
    els.btnPlayPause.addEventListener('click', togglePlay);
    els.audioPlayer.addEventListener('timeupdate', updateProgress);
    els.audioPlayer.addEventListener('ended', () => {
        state.isPlaying = false;
        els.iconPlay.style.display = 'block';
        els.iconPause.style.display = 'none';
        animateWaveform(false);
    });
    els.audioProgress.addEventListener('click', (e) => {
        const rect = els.audioProgress.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        els.audioPlayer.currentTime = pos * els.audioPlayer.duration;
    });


    // Core Logic
    async function processUrl(url) {
        if (state.isProcessing) return;
        state.isProcessing = true;
        
        showProcessingPanel('Sending request to server...');
        
        try {
            const response = await fetch(state.apiEndpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': '1'
                },
                body: JSON.stringify({ url })
            });

            if (!response.ok) {
                const err = await response.json().catch(()=>({}));
                throw new Error(err.error || `Server error: ${response.status}`);
            }

            const data = await response.json();
            if (data.job_id) {
                pollJob(data.job_id, `Cover from URL`);
            } else {
                throw new Error("No job_id returned");
            }
        } catch (e) {
            console.error(e);
            showToast(e.message, 'error');
            resetUI();
            state.isProcessing = false;
        }
    }

    async function processFile(file) {
        if (state.isProcessing) return;
        state.isProcessing = true;
        
        showProcessingPanel(`Sending ${file.name} to server...`);
        
        try {
            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error("Failed to read file"));
                reader.readAsDataURL(file);
            });

            const response = await fetch(state.apiEndpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': '1'
                },
                body: JSON.stringify({ 
                    file_data: base64Data,
                    filename: file.name
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(()=>({}));
                throw new Error(err.error || `Server error: ${response.status}`);
            }

            const data = await response.json();
            if (data.job_id) {
                pollJob(data.job_id, `Cover of ${file.name}`);
            } else {
                throw new Error("No job_id returned");
            }
        } catch (e) {
            console.error(e);
            showToast(e.message, 'error');
            resetUI();
            state.isProcessing = false;
        }
    }

    function showProcessingPanel(msg) {
        els.inputCard.style.display = 'none';
        els.resultPanel.classList.remove('active');
        els.processingPanel.classList.add('active');
        els.processingMsg.textContent = msg;
        els.progressBar.style.width = '0%';
    }

    function showResult(blob, sourceText) {
        els.processingPanel.classList.remove('active');
        els.resultPanel.classList.add('active');
        
        const audioUrl = URL.createObjectURL(blob);
        els.audioPlayer.src = audioUrl;
        els.btnDownload.href = audioUrl;
        els.btnDownload.download = 'kurumi_cover.mp3';
        els.resultSourceLabel.textContent = sourceText;
    }

    function resetUI() {
        els.processingPanel.classList.remove('active');
        els.inputCard.style.display = 'block';
    }

    let startTime = 0;
    const STEP_LABELS = {
        'idle':        'Waiting...',
        'uploading':   '📤 Uploading file...',
        'downloading': '⬇️ Downloading audio...',
        'separating':  '🎵 Extracting vocals...',
        'converting':  '🎙️ Applying Kurumi voice...',
        'mixing':      '🎚️ Mixing vocals & music...',
        'encoding':    '🎧 Encoding MP3...',
    };

    function pollJob(job_id, sourceText) {
        startTime = Date.now();
        const timerEl = document.getElementById('processingTimer');

        // Reset bar
        els.progressBar.style.width = '5%';
        els.processingMsg.textContent = 'Job started...';
        if (timerEl) timerEl.textContent = '00:00';

        state.progressInterval = setInterval(async () => {
            // Elapsed clock (always updates)
            const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
            const eMin = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
            const eSec = (elapsedSec % 60).toString().padStart(2, '0');

            try {
                const r = await fetch(state.serverUrl + '/job/' + job_id, {
                    headers: { 'ngrok-skip-browser-warning': '1' }
                });
                if (!r.ok) throw new Error();
                const data = await r.json();

                if (data.status === 'error') {
                    throw new Error(data.error || "Server processing failed");
                }
                
                if (data.status === 'pending_approval') {
                    els.processingMsg.textContent = '⏳ Đang chờ Admin phê duyệt yêu cầu trên điện thoại...';
                    els.progressBar.style.width = '100%';
                    els.progressBar.style.animation = 'pulse 1s infinite alternate';
                    if (timerEl) timerEl.textContent = `${eMin}:${eSec} · Xin chờ...`;
                    return; // Skip other logic until approved
                } else {
                    // Xoa animation pulse neu da duyet
                    els.progressBar.style.animation = '';
                }
                
                if (data.status === 'done') {
                    clearInterval(state.progressInterval);
                    els.processingMsg.textContent = 'Downloading final MP3...';
                    
                    const dlRes = await fetch(state.serverUrl + '/download/' + job_id, {
                        headers: { 'ngrok-skip-browser-warning': '1' }
                    });
                    if (!dlRes.ok) throw new Error("Download failed");
                    
                    const blob = await dlRes.blob();
                    showResult(blob, sourceText);
                    showToast('Conversion complete!', 'success');
                    state.isProcessing = false;
                    return;
                }

                // If processing, update progress
                if (data.progress) {
                    const p = data.progress;
                    const label = STEP_LABELS[p.step] || 'Processing...';
                    els.processingMsg.textContent = label;

                    if (p.pct > 0) {
                        els.progressBar.style.width = `${p.pct}%`;
                    }

                    if (timerEl) {
                        if (p.eta && p.step === 'separating') {
                            const parts = p.eta.split(':').map(Number);
                            const etaSec = (parts[0] || 0) * 60 + (parts[1] || 0);
                            const finishTime = new Date(Date.now() + etaSec * 1000);
                            const hh = finishTime.getHours().toString().padStart(2, '0');
                            const mm = finishTime.getMinutes().toString().padStart(2, '0');
                            timerEl.textContent = `${eMin}:${eSec} · Dự kiến xong lúc ${hh}:${mm}`;
                        } else {
                            timerEl.textContent = `${eMin}:${eSec}`;
                        }
                    }
                }
            } catch (err) {
                console.error("Polling error:", err);
                if (err.message && err.message !== "Failed to fetch") {
                    clearInterval(state.progressInterval);
                    showToast(err.message, 'error');
                    resetUI();
                    state.isProcessing = false;
                } else {
                    if (timerEl) timerEl.textContent = `${eMin}:${eSec}`;
                }
            }
        }, 1000);
    }

    function togglePlay() {
        if (state.isPlaying) {
            els.audioPlayer.pause();
            els.iconPlay.style.display = 'block';
            els.iconPause.style.display = 'none';
        } else {
            els.audioPlayer.play();
            els.iconPlay.style.display = 'none';
            els.iconPause.style.display = 'block';
        }
        state.isPlaying = !state.isPlaying;
        animateWaveform(state.isPlaying);
    }

    function updateProgress() {
        const { currentTime, duration } = els.audioPlayer;
        if (!duration) return;
        const percent = (currentTime / duration) * 100;
        els.audioProgressFill.style.width = `${percent}%`;
        els.timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function animateWaveform(active) {
        const bars = document.querySelectorAll('.wave-bar');
        bars.forEach(bar => {
            if (active) {
                bar.classList.add('active');
                bar.style.height = `${Math.random() * 80 + 20}%`;
            } else {
                bar.classList.remove('active');
                bar.style.height = '20%';
            }
        });
        
        if (active) {
            state.waveInterval = setInterval(() => {
                bars.forEach(bar => {
                    bar.style.height = `${Math.random() * 80 + 20}%`;
                });
            }, 150);
        } else {
            clearInterval(state.waveInterval);
        }
    }

    // Toast
    function showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✓';
        if (type === 'error') icon = '✕';
        if (type === 'warning') icon = '⚠️';

        toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${msg}</span>`;
        els.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Particles Background
    function initParticles() {
        const canvas = document.getElementById('particles-canvas');
        const ctx = canvas.getContext('2d');
        let width, height;
        let particles = [];

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 2 + 0.5;
                this.speedY = Math.random() * -0.5 - 0.2;
                this.speedX = Math.random() * 0.4 - 0.2;
                this.opacity = Math.random() * 0.5 + 0.1;
            }
            update() {
                this.y += this.speedY;
                this.x += this.speedX;
                if (this.y < -10) {
                    this.y = height + 10;
                    this.x = Math.random() * width;
                }
            }
            draw() {
                ctx.fillStyle = `rgba(200, 16, 46, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let i = 0; i < 50; i++) particles.push(new Particle());

        function animate() {
            ctx.clearRect(0, 0, width, height);
            particles.forEach(p => { p.update(); p.draw(); });
            requestAnimationFrame(animate);
        }
        animate();
    }
});