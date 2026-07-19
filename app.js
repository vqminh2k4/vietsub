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
        get apiEndpoint() {
            const saved = localStorage.getItem('kurumiServerUrl') || 'http://127.0.0.1:7869';
            return saved.replace(/\/$/, '') + '/cover';
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
    document.getElementById('btnCopyShareLink').addEventListener('click', () => {
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

    // Check server status on load
    updateServerStatus();


    // Setup Clock Ticks
    for (let i = 0; i < 60; i++) {
        if (i % 5 === 0) continue; // Skip main hours
        const tick = document.createElement('div');
        tick.className = 'clock-tick';
        tick.style.transform = `translateX(-50%) rotate(${i * 6}deg)`;
        els.clockTicks.appendChild(tick);
    }

    // Setup Fake Waveform
    for (let i = 0; i < 30; i++) {
        const bar = document.createElement('div');
        bar.className = 'wave-bar';
        bar.style.height = `${Math.random() * 40 + 10}%`;
        els.waveformDisplay.appendChild(bar);
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
        
        showProcessingPanel('Downloading and converting via YouTube...');
        simulateProgress();

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

            const blob = await response.blob();
            showResult(blob, `Cover from URL`);
            showToast('Conversion complete!', 'success');
        } catch (e) {
            console.error(e);
            showToast(e.message, 'error');
            resetUI();
        } finally {
            state.isProcessing = false;
            clearInterval(state.progressInterval);
        }
    }

    async function processFile(file) {
        if (state.isProcessing) return;
        state.isProcessing = true;
        
        showProcessingPanel(`Uploading and converting ${file.name}...`);
        simulateProgress(120); // Upto ~2 mins for direct files

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

            const blob = await response.blob();
            showResult(blob, `Cover of ${file.name}`);
            showToast('Conversion complete!', 'success');
        } catch (e) {
            console.error(e);
            showToast(e.message, 'error');
            resetUI();
        } finally {
            state.isProcessing = false;
            clearInterval(state.progressInterval);
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
        els.resultSourceLabel.textContent = sourceText;
    }

    function resetUI() {
        els.processingPanel.classList.remove('active');
        els.inputCard.style.display = 'block';
    }

    let progressSim = 0;
    let startTime = 0;
    function simulateProgress(estimatedSecs = 180) {
        progressSim = 0;
        startTime = Date.now();
        const timerEl = document.getElementById('processingTimer');
        
        const estMins = Math.floor(estimatedSecs / 60).toString().padStart(2, '0');
        const estSecs = (estimatedSecs % 60).toString().padStart(2, '0');
        const estText = `${estMins}:${estSecs}`;
        
        state.progressInterval = setInterval(() => {
            progressSim += (100 - progressSim) * 0.05;
            els.progressBar.style.width = `${progressSim}%`;
            
            if (progressSim > 20 && progressSim < 50) els.processingMsg.textContent = 'Extracting vocals...';
            if (progressSim > 50 && progressSim < 80) els.processingMsg.textContent = 'Applying Kurumi voice model...';
            if (progressSim > 80) els.processingMsg.textContent = 'Finalizing audio...';
            
            if (timerEl) {
                const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
                const mins = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
                const secs = (elapsedSeconds % 60).toString().padStart(2, '0');
                timerEl.textContent = `${mins}:${secs} / ~${estText}`;
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