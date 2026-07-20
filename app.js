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
        
        toastContainer: document.getElementById('toastContainer'),
        
        // NEW HOYOVERSE UI ELEMENTS
        processingMainTitle: document.getElementById('processingMainTitle'),
        processingSubTitle: document.getElementById('processingSubTitle'),
        progressPercentageText: document.getElementById('progressPercentageText'),
        processingAvatarImg: document.getElementById('processingAvatarImg'),
        processingTip: document.getElementById('processingTip'),
        processingETA: document.getElementById('processingETA'),
        timelineSteps: [
            document.getElementById('step1'),
            document.getElementById('step2'),
            document.getElementById('step3'),
            document.getElementById('step4')
        ],
        timelineLines: [
            document.getElementById('timelineLine1'),
            document.getElementById('timelineLine2'),
            document.getElementById('timelineLine3')
        ],
        resultAvatar: document.querySelector('.result-avatar')
    };

    // State
    const state = {
        isProcessing: false,
        isPlaying: false,
        serverUrl: 'https://subway-percent-senior.ngrok-free.dev',
        selectedVoice: 'kurumi',
        get apiEndpoint() {
            return this.serverUrl + '/cover';
        }
    };

    // Check server status in background (optional, just for network tab)
    fetch(state.serverUrl + '/health', { headers: { 'ngrok-skip-browser-warning': '1' } }).catch(() => {});


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
    
    // Voice Selection
    const voiceOptions = document.querySelectorAll('.voice-option');
    voiceOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            // Update UI
            voiceOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            
            // Update State
            state.selectedVoice = opt.dataset.voice;
            
            // Swap Theme
            const root = document.documentElement;
            const chibiImg = document.getElementById('chibiImage');
            
            if (state.selectedVoice === 'elaina') {
                document.body.style.backgroundImage = "url('elaina/anh_nen.png')";
                if (chibiImg) {
                    chibiImg.src = "elaina/anh_nho - Copy.png";
                    chibiImg.className = "chibi-image chibi-elaina";
                }
                
                // Elaina Theme (Purple/White)
                root.style.setProperty('--clr-red', '#7e22ce'); 
                root.style.setProperty('--clr-red-bright', '#a855f7');
                root.style.setProperty('--clr-red-dark', '#4c1d95');
                root.style.setProperty('--clr-border', 'rgba(126, 34, 206, 0.5)');
                root.style.setProperty('--clr-border-glow', 'rgba(168, 85, 247, 0.8)');
                
                document.querySelector('.hero-eyebrow').innerHTML = `ELAINA • WANDERING WITCH <svg viewBox="0 0 24 24"><path d="M12 18.5l-3-2-2-4 1-3 3 1 1-1v4l2 1zM20 9l-4-1-2 3v3l2 4 4 1-1-3 2-2-3-3zM4 9l4-1 2 3v3l-2 4-4 1 1-3-2-2 3-3z"/></svg>`;
                document.querySelector('.hero-title').innerHTML = `Turn Any Song Into<br><span class="highlight">An Elaina Cover</span>`;
                document.querySelector('.hero-desc').textContent = `Paste a YouTube link or upload your audio file. Our AI will transform the vocals into Elaina's enchanting voice.`;
                document.querySelector('.processing-title').textContent = `Elaina is singing...`;
                document.querySelector('.result-info h3').textContent = `Elaina (Wandering Witch)`;
                els.resultAvatar.style.backgroundImage = `url('avatar/avatar_elaina.png')`;
                const subtitle = document.getElementById('logoSubtitle');
                if (subtitle) subtitle.textContent = `イレイナ AI Cover`;
            } else if (state.selectedVoice === 'miku') {
                document.body.style.backgroundImage = "url('miku/anh_nen.png')";
                if (chibiImg) {
                    chibiImg.src = "miku/anh_nho_backup.png";
                    chibiImg.className = "chibi-image chibi-miku";
                }
                
                // Miku Theme (Cyan/Teal)
                root.style.setProperty('--clr-red', '#06b6d4'); 
                root.style.setProperty('--clr-red-bright', '#22d3ee');
                root.style.setProperty('--clr-red-dark', '#0891b2');
                root.style.setProperty('--clr-border', 'rgba(6, 182, 212, 0.5)');
                root.style.setProperty('--clr-border-glow', 'rgba(34, 211, 238, 0.8)');
                
                document.querySelector('.hero-eyebrow').innerHTML = `NAKANO MIKU • QUINTESSENTIAL QUINTUPLETS <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
                document.querySelector('.hero-title').innerHTML = `Turn Any Song Into<br><span class="highlight">A Miku Cover</span>`;
                document.querySelector('.hero-desc').textContent = `Paste a YouTube link or upload your audio file. Our AI will transform the vocals into Nakano Miku's iconic voice.`;
                document.querySelector('.processing-title').textContent = `Miku is singing...`;
                document.querySelector('.result-info h3').textContent = `Nakano Miku (Quintessential Quintuplets)`;
                els.resultAvatar.style.backgroundImage = `url('avatar/avatar_miku.png')`;
                const subtitle = document.getElementById('logoSubtitle');
                if (subtitle) subtitle.textContent = `中野三玖 AI Cover`;
            } else {
                document.body.style.backgroundImage = "url('img/anh_nen.png')";
                if (chibiImg) {
                    chibiImg.src = "img/anh_nho.png";
                    chibiImg.className = "chibi-image chibi-kurumi";
                }
                
                // Kurumi Theme (Red/Black)
                root.style.setProperty('--clr-red', '#d31027'); 
                root.style.setProperty('--clr-red-bright', '#ff2a3a');
                root.style.setProperty('--clr-red-dark', '#8b0000');
                root.style.setProperty('--clr-border', 'rgba(220, 20, 40, 0.5)');
                root.style.setProperty('--clr-border-glow', 'rgba(255, 30, 50, 0.8)');
                
                document.querySelector('.hero-eyebrow').innerHTML = `TOKISAKI KURUMI • DATE A LIVE <svg viewBox="0 0 24 24"><path d="M12 18.5l-3-2-2-4 1-3 3 1 1-1v4l2 1zM20 9l-4-1-2 3v3l2 4 4 1-1-3 2-2-3-3zM4 9l4-1 2 3v3l-2 4-4 1 1-3-2-2 3-3z"/></svg>`;
                document.querySelector('.hero-title').innerHTML = `Turn Any Song Into<br><span class="highlight">A Kurumi Cover</span>`;
                document.querySelector('.hero-desc').textContent = `Paste a YouTube link or upload your audio file. Our AI will transform the vocals into Kurumi Tokisaki's enchanting voice.`;
                document.querySelector('.processing-title').textContent = `Kurumi is singing...`;
                document.querySelector('.result-info h3').textContent = `Kurumi Tokisaki`;
                els.resultAvatar.style.backgroundImage = `url('avatar/avatar_kurumi.png')`;
                const subtitle = document.getElementById('logoSubtitle');
                if (subtitle) subtitle.textContent = `時崎狂三 AI Cover`;
            }
        });
    });

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
                body: JSON.stringify({ url, voice: state.selectedVoice })
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
                    filename: file.name,
                    voice: state.selectedVoice
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
        els.processingMainTitle.textContent = "🎙 AI ĐANG TỔNG HỢP GIỌNG NÓI";
        els.processingSubTitle.textContent = msg;
        els.progressBar.style.width = '0%';
        els.progressPercentageText.textContent = '0%';
        
        // Reset timeline
        els.timelineSteps.forEach(el => el.classList.remove('active'));
        els.timelineSteps[0].classList.add('active');
        els.timelineLines.forEach(el => el.style.width = '0%');
        
        // Update Avatar based on selected voice
        const avatarMap = {
            'kurumi': 'avatar/avatar_kurumi.png',
            'elaina': 'avatar/avatar_elaina.png',
            'miku': 'avatar/avatar_miku.png'
        };
        els.processingAvatarImg.src = avatarMap[state.selectedVoice] || 'avatar/avatar_kurumi.png';
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

    const TIPS = [
        "💡 Mẹo: AI đang giữ nguyên cảm xúc bài hát, để bản cover chân thực nhất nhé!",
        "🎵 Đừng đóng trình duyệt trong lúc render.",
        "🎧 Nhâm nhi một tách trà trong lúc đợi nhé!",
        "✨ AI đang phân tích từng nhịp điệu của bài hát...",
        "🎙 Giọng của AI rất hợp với các bài hát nhẹ nhàng đấy!"
    ];

    function pollJob(job_id, sourceText) {
        startTime = Date.now();
        const timerEl = document.getElementById('processingTimer');
        const etaEl = els.processingETA;
        
        els.progressBar.style.width = '5%';
        els.progressPercentageText.textContent = '5%';
        els.processingSubTitle.textContent = 'Job started...';
        if (timerEl) timerEl.textContent = '00:00';
        if (etaEl) etaEl.textContent = '--:--';
        
        // Setup tips cycling
        let tipIndex = 0;
        els.processingTip.textContent = TIPS[0];
        const tipInterval = setInterval(() => {
            tipIndex = (tipIndex + 1) % TIPS.length;
            els.processingTip.style.opacity = '0';
            setTimeout(() => {
                els.processingTip.textContent = TIPS[tipIndex];
                els.processingTip.style.opacity = '1';
            }, 300);
        }, 5000);
        els.processingTip.style.transition = 'opacity 0.3s ease';

        state.progressInterval = setInterval(async () => {
            // Elapsed clock
            const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
            const eMin = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
            const eSec = (elapsedSec % 60).toString().padStart(2, '0');
            if (timerEl) timerEl.textContent = `${eMin}:${eSec}`;

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
                    els.processingSubTitle.textContent = '⏳ Đang chờ Admin phê duyệt yêu cầu trên điện thoại...';
                    els.progressBar.style.width = '100%';
                    els.progressPercentageText.textContent = 'Waiting';
                    els.progressBar.style.animation = 'pulse 1s infinite alternate';
                    if (etaEl) etaEl.textContent = 'Chờ duyệt';
                    return;
                } else {
                    els.progressBar.style.animation = '';
                }
                
                if (data.status === 'done') {
                    clearInterval(state.progressInterval);
                    clearInterval(tipInterval);
                    els.processingSubTitle.textContent = '✔ AI Cover hoàn tất. Đang chuẩn bị phát...';
                    els.progressBar.style.width = '100%';
                    els.progressBar.style.background = 'linear-gradient(90deg, #00f2fe, #4facfe)';
                    els.progressPercentageText.textContent = '100%';
                    
                    els.timelineSteps.forEach(el => el.classList.add('active'));
                    els.timelineLines.forEach(el => el.style.width = '100%');
                    
                    setTimeout(async () => {
                        try {
                            const dlRes = await fetch(state.serverUrl + '/download/' + job_id, {
                                headers: { 'ngrok-skip-browser-warning': '1' }
                            });
                            if (!dlRes.ok) throw new Error("Download failed");
                            
                            const blob = await dlRes.blob();
                            showResult(blob, sourceText);
                            showToast('Conversion complete!', 'success');
                            state.isProcessing = false;
                        } catch (e) {
                            showToast(e.message, 'error');
                            resetUI();
                        }
                    }, 1000);
                    return;
                }

                if (data.progress) {
                    const p = data.progress;
                    const label = STEP_LABELS[p.step] || 'Processing...';
                    els.processingSubTitle.textContent = label;

                    if (p.pct > 0) {
                        els.progressBar.style.width = `${p.pct}%`;
                        els.progressPercentageText.textContent = `${Math.floor(p.pct)}%`;
                        
                        // Update timeline
                        els.timelineSteps[0].classList.add('active'); // always active
                        if (p.pct > 25) { els.timelineLines[0].style.width = '100%'; els.timelineSteps[1].classList.add('active'); }
                        else { els.timelineLines[0].style.width = `${(p.pct/25)*100}%`; }
                        
                        if (p.pct > 50) { els.timelineLines[1].style.width = '100%'; els.timelineSteps[2].classList.add('active'); }
                        else if (p.pct > 25) { els.timelineLines[1].style.width = `${((p.pct-25)/25)*100}%`; }
                        
                        if (p.pct > 75) { els.timelineLines[2].style.width = '100%'; els.timelineSteps[3].classList.add('active'); }
                        else if (p.pct > 50) { els.timelineLines[2].style.width = `${((p.pct-50)/25)*100}%`; }
                    }

                    if (p.eta && p.step === 'separating') {
                        const parts = p.eta.split(':').map(Number);
                        const etaSec = (parts[0] || 0) * 60 + (parts[1] || 0);
                        etaEl.textContent = `${etaSec} giây`;
                    } else if (p.eta) {
                        etaEl.textContent = p.eta;
                    }
                }
            } catch (err) {
                console.error("Polling error:", err);
                if (err.message && err.message !== "Failed to fetch") {
                    clearInterval(state.progressInterval);
                    clearInterval(tipInterval);
                    showToast(err.message, 'error');
                    resetUI();
                    state.isProcessing = false;
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