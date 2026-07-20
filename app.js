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
        resultAvatar: document.getElementById('resultAvatar'),
        resultTitle: document.getElementById('resultTitle'),
        resultCanvas: document.getElementById('resultCanvas'),
        processingCanvas: document.getElementById('processingCanvas')
    };

    // Visualizer state
    let visCtx = null;
    let audioCtx = null;
    let analyser = null;
    let dataArray = null;
    let bufferLength = null;
    let sourceNode = null;
    let visParticles = [];
    let visAnimationId = null;

    // State
    const state = {
        isProcessing: false,
        isPlaying: false,
        serverUrl: 'https://subway-percent-senior.ngrok-free.dev',
        isDuetMode: false,
        selectedVoice: 'kurumi',
        selectedVoice2: null,
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
    
    // Duet Toggle
    const duetToggle = document.getElementById('duetToggle');
    if (duetToggle) {
        duetToggle.addEventListener('change', (e) => {
            state.isDuetMode = e.target.checked;
            document.body.classList.toggle('is-duet', state.isDuetMode);
            
            // If turned off, revert to single selection
            if (!state.isDuetMode) {
                state.selectedVoice2 = null;
                voiceOptions.forEach(o => {
                    if (o.dataset.voice !== state.selectedVoice) {
                        o.classList.remove('active');
                    }
                });
                updateTheme(state.selectedVoice);
            }
        });
    }

    // Voice Selection
    const voiceOptions = document.querySelectorAll('.voice-option');
    voiceOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const voice = opt.dataset.voice;
            
            if (state.isDuetMode) {
                // Duet Mode Logic
                if (opt.classList.contains('active')) {
                    // Cannot deselect if it's the only one
                    if (!state.selectedVoice2) return;
                    
                    opt.classList.remove('active');
                    if (state.selectedVoice === voice) {
                        state.selectedVoice = state.selectedVoice2;
                        state.selectedVoice2 = null;
                    } else {
                        state.selectedVoice2 = null;
                    }
                } else {
                    // Select new voice
                    if (state.selectedVoice && state.selectedVoice2) {
                        // Already 2 selected, replace the second one
                        document.querySelector(`.voice-option[data-voice="${state.selectedVoice2}"]`).classList.remove('active');
                        state.selectedVoice2 = voice;
                        opt.classList.add('active');
                    } else if (state.selectedVoice) {
                        state.selectedVoice2 = voice;
                        opt.classList.add('active');
                    }
                }
                
                // Set theme to Duet or primary voice
                if (state.selectedVoice && state.selectedVoice2) {
                    updateTheme('duet');
                } else {
                    updateTheme(state.selectedVoice);
                }
            } else {
                // Solo Mode Logic
                voiceOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                state.selectedVoice = voice;
                state.selectedVoice2 = null;
                updateTheme(state.selectedVoice);
            }
        });
    });
    
    function updateTheme(voiceMode) {
        const root = document.documentElement;
        const chibiImg = document.getElementById('chibiImage');
        
        if (voiceMode === 'duet') {
            const v1 = state.selectedVoice;
            const v2 = state.selectedVoice2;
            const name1 = v1.charAt(0).toUpperCase() + v1.slice(1);
            const name2 = v2.charAt(0).toUpperCase() + v2.slice(1);
            
            // Dynamic Split Screen (V2 on left, V1 on right as requested)
            const bgLeft = `song ca/${v2}_trai.png`;
            const bgRight = `song ca/${v1}_phai.png`;
            
            document.body.style.backgroundImage = `
                linear-gradient(to right, rgba(0,0,0,0) 40%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0) 60%),
                url('${bgLeft.replace(' ', '%20')}'), 
                url('${bgRight.replace(' ', '%20')}')
            `;
            document.body.style.backgroundPosition = `center, left center, right center`;
            document.body.style.backgroundSize = `100% 100%, 50% 100%, 50% 100%`;
            document.body.style.backgroundRepeat = `no-repeat, no-repeat, no-repeat`;
            // Temporarily use Kurumi's theme colors for Duet until phase 2
            root.style.setProperty('--clr-red', '#d31027'); 
            root.style.setProperty('--clr-red-bright', '#ff2a3a');
            root.style.setProperty('--clr-red-dark', '#8b0000');
            root.style.setProperty('--clr-border', 'rgba(220, 20, 40, 0.5)');
            root.style.setProperty('--clr-border-glow', 'rgba(255, 30, 50, 0.8)');
            
            document.querySelector('.hero-eyebrow').innerHTML = `DUET MODE <svg viewBox="0 0 24 24"><path d="M12 18.5l-3-2-2-4 1-3 3 1 1-1v4l2 1zM20 9l-4-1-2 3v3l2 4 4 1-1-3 2-2-3-3zM4 9l4-1 2 3v3l-2 4-4 1 1-3-2-2 3-3z"/></svg>`;
            document.querySelector('.hero-title').innerHTML = `${name2} <span class="highlight">x</span> ${name1}`;
            document.querySelector('.hero-desc').textContent = `Paste a YouTube link or upload your audio file. Our AI will split the vocals and create a stunning duet cover.`;
            const procTitle = document.getElementById('processingMainTitle');
            if (procTitle) procTitle.textContent = `${name2} & ${name1} are singing...`;
            if (els.resultTitle) els.resultTitle.textContent = `${name2} x ${name1} Duet`;
            els.resultAvatar.style.backgroundImage = `url('avatar/avatar_${state.selectedVoice}.png')`;
            const subtitle = document.getElementById('logoSubtitle');
            if (subtitle) subtitle.textContent = `AI DUET COVER`;
            return;
        }
        
        if (voiceMode === 'elaina') {
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
                const procTitle = document.getElementById('processingMainTitle');
                if (procTitle) procTitle.textContent = `Elaina is singing...`;
                if (els.resultTitle) els.resultTitle.textContent = `Elaina (Wandering Witch)`;
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
                const procTitle = document.getElementById('processingMainTitle');
                if (procTitle) procTitle.textContent = `Miku is singing...`;
                if (els.resultTitle) els.resultTitle.textContent = `Nakano Miku (Quintessential Quintuplets)`;
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
            const procTitle = document.getElementById('processingMainTitle');
            if (procTitle) procTitle.textContent = `Kurumi is singing...`;
            if (els.resultTitle) els.resultTitle.textContent = `Kurumi Tokisaki (Date A Live)`;
            els.resultAvatar.style.backgroundImage = `url('avatar/avatar_kurumi.png')`;
            const subtitle = document.getElementById('logoSubtitle');
            if (subtitle) subtitle.textContent = `時崎狂三 AI Cover`;
        }
    }

    els.btnGenerate.addEventListener('click', () => {
        const url = els.urlInput.value.trim();
        if (!url) {
            showToast('Please enter a YouTube or music URL', 'error');
            return;
        }
        if (url.toLowerCase() === 'test') {
            els.processingPanel.classList.remove('active');
            els.inputCard.style.display = 'none';
            els.resultPanel.classList.add('active');
            
            // Dùng fetch để tránh lỗi Live Server không stream được file nhạc
            fetch('test.mp3')
                .then(res => {
                    if (!res.ok) throw new Error("Không tìm thấy file test.mp3");
                    return res.blob();
                })
                .then(blob => {
                    const blobUrl = URL.createObjectURL(blob);
                    els.audioPlayer.src = blobUrl;
                    els.btnDownload.href = blobUrl;
                    els.btnDownload.download = 'test.mp3';
                    const srcLabel = document.getElementById('resultSourceLabel');
                    if (srcLabel) srcLabel.textContent = 'Test Mode (Local Audio)';
                })
                .catch(err => {
                    console.error(err);
                    alert("Lỗi load nhạc test: " + err.message + "\nBạn hãy tải lại trang (Ctrl+F5) nhé!");
                });
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
        els.urlInput.value = '';
        if (state.isPlaying) togglePlay();
        URL.revokeObjectURL(els.audioPlayer.src);
        resetUI();
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
        
        let voicePayload = state.selectedVoice;
        if (state.isDuetMode && state.selectedVoice2) {
            const n1 = state.selectedVoice.charAt(0).toUpperCase() + state.selectedVoice.slice(1);
            const n2 = state.selectedVoice2.charAt(0).toUpperCase() + state.selectedVoice2.slice(1);
            voicePayload = `Song ca (${n2} x ${n1})`;
        }
        
        try {
            const response = await fetch(state.apiEndpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': '1'
                },
                body: JSON.stringify({ 
                    url, 
                    voice: voicePayload,
                    primary_voice: state.selectedVoice,
                    secondary_voice: state.selectedVoice2,
                    is_duet: state.isDuetMode
                })
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
        
        let voicePayload = state.selectedVoice;
        if (state.isDuetMode && state.selectedVoice2) {
            const n1 = state.selectedVoice.charAt(0).toUpperCase() + state.selectedVoice.slice(1);
            const n2 = state.selectedVoice2.charAt(0).toUpperCase() + state.selectedVoice2.slice(1);
            voicePayload = `Song ca (${n2} x ${n1})`;
        }
        
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
                    voice: voicePayload,
                    primary_voice: state.selectedVoice,
                    secondary_voice: state.selectedVoice2,
                    is_duet: state.isDuetMode
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
        els.resultPanel.style.display = 'none';
        els.processingPanel.style.display = 'block';
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
        els.processingAvatarImg = avatarMap[state.selectedVoice] || 'avatar/avatar_kurumi.png';
        
        startProcessingVisualizer();
    }

    function showResult(blob, sourceText) {
        document.body.classList.add('is-playing');
        els.processingPanel.style.display = 'none';
        els.resultPanel.style.display = 'block';
        if (els.resultCanvas) els.resultCanvas.style.display = 'block';
        
        // Update Result Avatar and Title
        if (state.isDuetMode && state.selectedVoice && state.selectedVoice2) {
            // Use duet split avatar or first voice avatar
            els.resultAvatar.style.backgroundImage = `url('avatar/avatar_${state.selectedVoice}.png')`;
            const name1 = state.selectedVoice.charAt(0).toUpperCase() + state.selectedVoice.slice(1);
            const name2 = state.selectedVoice2.charAt(0).toUpperCase() + state.selectedVoice2.slice(1);
            if (els.resultTitle) els.resultTitle.textContent = `${name1} x ${name2}`;
            els.btnDownload.download = `${state.selectedVoice}_x_${state.selectedVoice2}_cover.mp3`;
        } else {
            const voice = state.selectedVoice || 'kurumi';
            els.resultAvatar.style.backgroundImage = `url('avatar/avatar_${voice}.png')`;
            const name1 = voice.charAt(0).toUpperCase() + voice.slice(1);
            if (els.resultTitle) els.resultTitle.textContent = `${name1} AI Cover`;
            els.btnDownload.download = `${voice}_cover.mp3`;
        }
        
        const audioUrl = URL.createObjectURL(blob);
        els.audioPlayer.src = audioUrl;
        els.btnDownload.href = audioUrl;
        els.resultSourceLabel.textContent = sourceText;
    }

    function resetUI() {
        document.body.classList.remove('is-playing');
        els.processingPanel.style.display = 'none';
        els.resultPanel.style.display = 'none';
        if (els.resultCanvas) els.resultCanvas.style.display = 'none';
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
        let tipInterval;
        if (els.processingTip) {
            els.processingTip.textContent = TIPS[0];
            tipInterval = setInterval(() => {
                tipIndex = (tipIndex + 1) % TIPS.length;
                els.processingTip.style.opacity = '0';
                setTimeout(() => {
                    els.processingTip.textContent = TIPS[tipIndex];
                    els.processingTip.style.opacity = '1';
                }, 300);
            }, 5000);
            els.processingTip.style.transition = 'opacity 0.3s ease';
        }

        state.progressInterval = setInterval(async () => {
            // Elapsed clock
            const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
            const eMin = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
            const eSec = (elapsedSec % 60).toString().padStart(2, '0');
            if (timerEl) timerEl.textContent = `${eMin}:${eSec}`;

            try {
                const r = await fetch(state.serverUrl + '/job/' + job_id, {
                    method: 'GET',
                    cache: 'no-store',
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
                } else if (data.status === 'queued') {
                    els.processingSubTitle.textContent = '⏳ Yêu cầu đã được duyệt! Đang xếp hàng chờ tới lượt...';
                    els.progressBar.style.width = '100%';
                    els.progressPercentageText.textContent = 'Queued';
                    els.progressBar.style.animation = 'pulse 1s infinite alternate';
                    if (etaEl) etaEl.textContent = 'Đang xếp hàng';
                    return;
                } else {
                    els.progressBar.style.animation = '';
                }
                
                if (data.status === 'done' || data.status === 'completed' || data.status === 'success') {
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
            if (!audioCtx) initVisualizer(); // Init audio context on first play interaction
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
            
            els.audioPlayer.play();
            els.iconPlay.style.display = 'none';
            els.iconPause.style.display = 'block';
        }
        state.isPlaying = !state.isPlaying;
        animateWaveform(state.isPlaying);
    }

    function initVisualizer() {
        if (!els.resultCanvas) return;
        
        visCtx = els.resultCanvas.getContext('2d');
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.2; // Tăng kịch trần độ nhạy của Web Audio API (Mặc định 0.8 rất chậm)
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        sourceNode = audioCtx.createMediaElementSource(els.audioPlayer);
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        
        // Init particles
        for(let i=0; i<30; i++) {
            visParticles.push({
                x: Math.random() * els.resultCanvas.width,
                y: Math.random() * els.resultCanvas.height,
                size: Math.random() * 2 + 1,
                speedX: (Math.random() - 0.5) * 1,
                speedY: (Math.random() - 0.5) * 1,
                alpha: Math.random() * 0.5 + 0.1
            });
        }
        
        drawVisualizer();
    }

    const VIS_THEMES = {
        'elaina': {
            glowColor: '#bc13fe',
            coreColor: '#f875ff',
            waveOffset: 120, 
            particles: { 
                type: 'text', 
                text: ['⭐', '✨', '🌙', '🦋', '🔮', '📖', '💎', '☄️'], 
                colors: 'rgba(255, 100, 255, ' 
            },
            drawBackground: function(ctx, w, h, time, intensity) {
                // Background: Bầu trời sao thiên hà
                ctx.save();
                ctx.fillStyle = `rgba(30, 10, 50, ${0.3 + intensity * 0.2})`;
                ctx.fillRect(0, 0, w, h);
                // Sao lấp lánh (vẽ vài điểm ngẫu nhiên bằng cách băm tọa độ theo thời gian)
                for(let i=0; i<30; i++) {
                    let x = (Math.sin(i*123 + time*0.2) * 0.5 + 0.5) * w;
                    let y = (Math.cos(i*321 + time*0.3) * 0.5 + 0.5) * h;
                    let r = Math.sin(time*5 + i) * 1.5 + 1.5;
                    ctx.fillStyle = `rgba(255, 200, 255, ${0.3 + intensity * 0.7})`;
                    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
                }
                ctx.restore();
            },
            drawRing: function(ctx, centerX, centerY, radius, time, intensity = 0) {
                ctx.save();
                ctx.translate(centerX, centerY);
                const scale = 1 + (intensity * 0.2); 
                ctx.scale(scale, scale);
                
                // Vòng phép thuật (Magic Glyphs)
                // Vòng 1 (Trong cùng)
                ctx.save();
                ctx.rotate(time * 1.2); // Tăng tốc độ quay
                ctx.beginPath();
                ctx.arc(0, 0, radius + 15, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(188, 19, 254, ${0.5 + intensity * 0.5})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
                // Vẽ Rune giả (các chấm và gạch)
                ctx.setLineDash([4, 6, 12, 6]);
                ctx.beginPath();
                ctx.arc(0, 0, radius + 12, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();

                // Vòng 2 (Giữa) quay ngược
                ctx.save();
                ctx.rotate(-time * 1.5); // Tăng tốc độ quay
                ctx.beginPath();
                ctx.arc(0, 0, radius + 25, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(248, 117, 255, ${0.7 + intensity * 0.5})`;
                ctx.lineWidth = 2 + (intensity * 2);
                ctx.stroke();
                
                // Ngôi sao 6 cánh (Star of David)
                ctx.beginPath();
                for(let i=0; i<6; i++) {
                    const a = i * Math.PI / 3;
                    const r2 = (i%2===0) ? radius + 25 : radius + 15;
                    ctx.lineTo(Math.cos(a)*r2, Math.sin(a)*r2);
                }
                ctx.closePath();
                ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
                ctx.stroke();
                ctx.restore();

                // Vòng 3 (Ngoài cùng)
                ctx.save();
                ctx.rotate(time * 0.3);
                ctx.beginPath();
                ctx.arc(0, 0, radius + 35, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(100, 50, 255, 0.4)`;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();

                ctx.restore();
            }
        },
        'kurumi': {
            glowColor: '#ff1e1e',
            coreColor: '#ffbaba',
            waveOffset: 120, 
            particles: { 
                type: 'text', 
                text: ['🌹', '🦋', '❤️', '🔥', '🩸', '⏰', '⚙️', '✨'], 
                colors: 'rgba(255, 30, 30, ' 
            },
            drawBackground: function(ctx, w, h, time, intensity) {
                // Không gian đỏ sương đen
                ctx.save();
                const grad = ctx.createRadialGradient(w/2, h/2, 50, w/2, h/2, w);
                grad.addColorStop(0, `rgba(40, 0, 0, ${0.2 + intensity * 0.3})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);

                // Đồng hồ Zafkiel mờ khổng lồ
                ctx.translate(w/2, h/2);
                ctx.rotate(time * 0.1); // Xoay rất chậm
                ctx.globalAlpha = 0.1 + intensity * 0.1;
                ctx.strokeStyle = '#ff1e1e';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(0, 0, h, 0, Math.PI*2); ctx.stroke();
                ctx.beginPath(); ctx.arc(0, 0, h - 20, 0, Math.PI*2); ctx.stroke();
                
                const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
                ctx.font = 'bold 30px "Times New Roman", serif';
                ctx.fillStyle = '#ff1e1e';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                for (let i = 0; i < 12; i++) {
                    const angle = (i * Math.PI / 6) - Math.PI / 2;
                    const nx = Math.cos(angle) * (h - 50);
                    const ny = Math.sin(angle) * (h - 50);
                    ctx.save(); ctx.translate(nx, ny); ctx.rotate(angle + Math.PI/2);
                    ctx.fillText(numerals[i], 0, 0); ctx.restore();
                }
                ctx.restore();
            },
            drawRing: function(ctx, centerX, centerY, radius, time, intensity = 0) {
                const rotation = (time * 2.5) % (Math.PI * 2); // Xoay nhanh hơn
                ctx.save();
                ctx.translate(centerX, centerY);
                
                const scale = 1 + (intensity * 0.35); 
                ctx.scale(scale, scale);
                ctx.rotate(rotation);
                
                // Outer ring
                ctx.beginPath();
                ctx.arc(0, 0, radius + 25, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 30, 30, ${0.7 + intensity * 0.8})`;
                ctx.lineWidth = 2 + (intensity * 6);
                ctx.stroke();
                
                // Inner ring
                ctx.beginPath();
                ctx.arc(0, 0, radius + 10, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 30, 30, ${0.4 + intensity * 0.7})`;
                ctx.lineWidth = 1 + (intensity * 4);
                ctx.stroke();
                
                // Roman Numerals
                const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
                ctx.font = 'bold 12px "Times New Roman", serif';
                ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                for (let i = 0; i < 12; i++) {
                    const angle = (i * Math.PI / 6) - Math.PI / 2;
                    const nx = Math.cos(angle) * (radius + 16);
                    const ny = Math.sin(angle) * (radius + 16);
                    ctx.save();
                    ctx.translate(nx, ny);
                    ctx.rotate(angle + Math.PI/2);
                    ctx.fillText(numerals[i], 0, 0);
                    ctx.restore();
                }
                ctx.restore();
            }
        },
        'miku': {
            glowColor: '#38bdf8', 
            coreColor: '#e0f2fe',
            waveOffset: 120, 
            particles: { 
                type: 'text', 
                text: ['🎵', '🌸', '🍃', '🦋', '💙', '✨'], 
                colors: 'rgba(56, 189, 248, ' 
            },
            drawBackground: function(ctx, w, h, time, intensity) {
                // Đêm yên bình, phản chiếu nước mờ ở dưới
                ctx.save();
                const grad = ctx.createLinearGradient(0, 0, 0, h);
                grad.addColorStop(0, `rgba(10, 20, 40, ${0.4 + intensity * 0.2})`);
                grad.addColorStop(0.7, 'rgba(5, 10, 25, 0.8)');
                grad.addColorStop(1, 'rgba(0, 30, 60, 0.9)'); // Mặt nước
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
                
                // Sóng nước gợn ở đáy
                ctx.beginPath();
                for(let x=0; x<=w; x+=20) {
                    let y = h - 20 + Math.sin(x*0.05 + time) * 5 + Math.cos(x*0.02 - time*0.5) * 3;
                    if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
                }
                ctx.lineTo(w, h); ctx.lineTo(0, h);
                ctx.fillStyle = `rgba(56, 189, 248, ${0.1 + intensity * 0.15})`;
                ctx.fill();
                ctx.restore();
            },
            drawRing: function(ctx, centerX, centerY, radius, time, intensity = 0) {
                ctx.save();
                ctx.translate(centerX, centerY);
                
                const scale = 1 + (intensity * 0.3);
                ctx.scale(scale, scale);
                
                // Music Player Arcs (Equalizer Vòng)
                ctx.globalAlpha = 0.8 + (intensity * 0.2);
                
                // Vòng tĩnh nền
                ctx.beginPath();
                ctx.arc(0, 0, radius + 15, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
                ctx.lineWidth = 4;
                ctx.stroke();

                // Các cung chạy (Arcs)
                ctx.lineWidth = 4 + (intensity * 4);
                ctx.lineCap = 'round';
                
                const numArcs = 4;
                for(let i=0; i<numArcs; i++) {
                    ctx.save();
                    ctx.rotate(time * (2 + i*0.5) + i * Math.PI/2); // Quay cung nhanh hơn
                    ctx.beginPath();
                    // Chiều dài cung thay đổi theo beat
                    let arcLen = Math.PI/3 + intensity * Math.PI/2;
                    ctx.arc(0, 0, radius + 15 + i*8, 0, arcLen);
                    ctx.strokeStyle = `rgba(56, 189, 248, ${0.6 + intensity*0.4})`;
                    ctx.stroke();
                    ctx.restore();
                }
                
                // Nốt nhạc bay ra từ nhẫn
                ctx.rotate(-time * 1.5);
                ctx.font = '14px Arial';
                ctx.fillStyle = `rgba(224, 242, 254, ${0.5 + intensity * 0.5})`;
                ctx.fillText('🎵', 0, -(radius + 35 + intensity * 10));
                ctx.fillText('♪', 0, radius + 35 + intensity * 10);
                
                ctx.restore();
            }
        }
    };

    function drawThemeVisualizer(ctx, canvas, dataArray, bufferLength, time, isSimulating, particlesArr) {
        if (state.isDuetMode && state.selectedVoice && state.selectedVoice2) {
            drawDuetVisualizer(ctx, canvas, dataArray, bufferLength, time, isSimulating, particlesArr);
            return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;
        const centerX = width / 2;
        
        const themeName = state.selectedVoice || 'elaina';
        const theme = VIS_THEMES[themeName] || VIS_THEMES['elaina'];
        
        ctx.clearRect(0, 0, width, height);

        // 1. Lõi Web Audio & Tính toán lực đập (globalIntensity)
        let intensity = 0;
        if (!isSimulating && dataArray) {
            let sum = 0;
            const beatLength = Math.floor(bufferLength / 3); // Lọc Bass (Low frequency)
            for (let i = 0; i < beatLength; i++) sum += dataArray[i];
            intensity = (sum / beatLength) / 255;
            
            // Làm mượt (Smooth interpolation)
            state.smoothIntensity = state.smoothIntensity || 0;
            state.smoothIntensity = state.smoothIntensity * 0.8 + intensity * 0.2;
            intensity = Math.pow(state.smoothIntensity, 1.5);
        } else {
            intensity = Math.max(0, Math.sin(time * 8)) * 0.4;
        }

        // Draw Theme Background
        if (theme.drawBackground) {
            theme.drawBackground(ctx, width, height, time, intensity);
        }

        // 5. Camera Shake
        ctx.save();
        if (intensity > 0.4) {
            const shake = (intensity - 0.4) * 8; // Rung tới 4px
            ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        }

        // 6. Background Reactive (Cập nhật CSS biến từ JS)
        document.body.style.filter = `brightness(${100 + intensity * 60}%)`;

        // 4. Hệ thống Hạt Vật Lý Mới (Advanced Physics Engine)
        if (intensity > 0.5 && Math.random() > 0.3 && particlesArr.length < 80) { // Giảm số lượng tối đa xuống 80 để mượt hơn
            particlesArr.push({
                x: centerX,
                y: centerY,
                size: Math.random() * 0.5 + 0.5, // Dùng size làm hệ số scale (0.5 -> 1.0) thay vì pixel
                speedX: (Math.random() - 0.5) * 15 * intensity,
                speedY: (Math.random() - 0.5) * 15 * intensity,
                alpha: 1.0,
                type: 'burst'
            });
        }
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '20px Arial'; // SET FONT 1 LẦN DUY NHẤT ĐỂ TRÁNH LAG (RẤT QUAN TRỌNG)
        
        particlesArr.forEach((p, idx) => {
            let speedMult = 1 + (intensity * 5); // Base speed multiplier cao hơn
            let char = theme.particles.text[idx % theme.particles.text.length];
            
            // Vật lý đặc trưng theo Theme
            if (themeName === 'kurumi') {
                // Hạt bay lên trên (lửa/bướm)
                p.speedY -= 0.15; // Gravity âm mạnh hơn để bốc cao
                if (char === '🦋') {
                    p.speedX += Math.sin(time*4 + idx)*0.5; // Bướm bay lắc mạnh
                }
            } else if (themeName === 'elaina') {
                // Bụi sao rơi xuống chéo
                p.speedY += 0.05; // Rơi nhanh hơn
                p.speedX += 0.03;
                if (char === '🦋') {
                    if (intensity < 0.3) speedMult = 0.3; // Bướm đậu khi hết bass
                    else speedMult = 6;
                }
            } else if (themeName === 'miku') {
                // Nốt nhạc trôi bồng bềnh nhẹ
                p.speedY -= 0.03;
                if (char === '🌸' || char === '🍃') {
                    p.speedY += 0.06; // Hoa rơi nhanh hơn
                    p.speedX += Math.sin(time*2 + idx)*0.2;
                }
            }
            
            // Cản gió (Friction) ít đi để bay được xa hơn
            p.speedX *= 0.99;
            p.speedY *= 0.99;
            
            p.x += p.speedX * speedMult;
            p.y += p.speedY * speedMult;
            
            if (p.type === 'burst') p.alpha -= 0.01;
            
            if (p.alpha <= 0 || p.x < -20 || p.x > width+20 || p.y < -20 || p.y > height+20) {
                if (p.type === 'burst') {
                    particlesArr.splice(idx, 1);
                    return;
                }
                // Respawn random edge
                p.x = Math.random() * width;
                p.y = (themeName === 'kurumi') ? height + 10 : (themeName === 'miku' && Math.random()>0.5 ? -10 : Math.random() * height);
                p.speedX = (Math.random() - 0.5) * 2;
                p.speedY = (Math.random() - 0.5) * 2;
                p.alpha = Math.random() * 0.5 + 0.3;
            }
            
            ctx.fillStyle = theme.particles.colors + p.alpha + ')';
            
            ctx.save();
            ctx.translate(p.x, p.y);
            // Xoay hạt ngẫu nhiên và Scale bằng hệ số (Thay vì đổi ctx.font)
            ctx.rotate(time * (idx%3===0 ? 1 : -1) * 0.5 + idx);
            // Kích thước thật = base size (20px) * p.size
            ctx.scale(p.size, p.size);
            ctx.fillText(char, 0, 0);
            ctx.restore();
        });

        // 8. Ring Particles (Orbiting)
        if (!state.orbitParticles) {
            state.orbitParticles = [];
            for (let i = 0; i < 15; i++) {
                state.orbitParticles.push({ 
                    angle: Math.random() * Math.PI * 2, 
                    dist: 90 + Math.random() * 30, 
                    speed: (Math.random() * 0.03 + 0.01) * (Math.random() > 0.5 ? 1 : -1),
                    char: ['✦', '✧', '✨'][Math.floor(Math.random() * 3)]
                });
            }
        }
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Font tĩnh 20px cho Orbit, dùng scale để phóng to
        ctx.font = '20px Arial'; 
        
        state.orbitParticles.forEach(op => {
            op.angle += op.speed * (1 + intensity * 3);
            const ox = centerX + Math.cos(op.angle) * (op.dist + intensity * 40);
            const oy = centerY + Math.sin(op.angle) * (op.dist + intensity * 40);
            
            ctx.fillStyle = theme.particles.colors + (0.5 + intensity * 0.5) + ')';
            
            ctx.save();
            ctx.translate(ox, oy);
            // Scale dựa trên bass
            const opScale = 0.5 + intensity * 0.5;
            ctx.scale(opScale, opScale);
            ctx.fillText(op.char, 0, 0);
            ctx.restore();
        });

        const avatarRadius = 75;
        
        // 2 & 7. Avatar Pulse & Bloom
        ctx.save();
        const avatarScale = 1 + (intensity * 0.15); // Scale 1 -> 1.15
        ctx.translate(centerX, centerY);
        ctx.scale(avatarScale, avatarScale);
        
        // Draw Avatar Image FIRST so rings go on top
        const avatarImg = new Image();
        const avatarMap = { 'kurumi': 'avatar/avatar_kurumi.png', 'elaina': 'avatar/avatar_elaina.png', 'miku': 'avatar/avatar_miku.png' };
        avatarImg.src = avatarMap[themeName] || 'avatar/avatar_kurumi.png';
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, avatarRadius, 0, Math.PI * 2);
        ctx.clip();
        
        // Bloom effect on avatar when bass is strong
        if (intensity > 0.4) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = 25 * intensity;
            ctx.shadowColor = theme.glowColor;
        }

        if (avatarImg.complete && avatarImg.naturalWidth > 0) {
            ctx.drawImage(avatarImg, -avatarRadius, -avatarRadius, avatarRadius * 2, avatarRadius * 2);
        }
        ctx.restore();

        // Draw avatar core ring
        ctx.beginPath();
        ctx.arc(0, 0, avatarRadius, 0, Math.PI * 2);
        ctx.strokeStyle = theme.coreColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.restore(); // Restore scale and translation for Avatar Image

        // Draw Avatar Ring (3. Ring rotating handled inside theme)
        theme.drawRing(ctx, centerX, centerY, avatarRadius, time, intensity);

        // 3. Sóng Âm (Waveform) - Smooth Interpolation
        const barWidth = 3;
        const spacing = 5;
        const waveOffset = theme.waveOffset || 115;
        const maxBars = Math.min(24, Math.floor((width/2 - waveOffset) / (barWidth + spacing)));
        const waveEnd = waveOffset + maxBars * (barWidth + spacing);
        
        ctx.lineCap = 'round';
        
        // Draw center axis line
        ctx.shadowBlur = 10 + (intensity * 30); // 6. Waveform glow
        ctx.shadowColor = theme.glowColor;
        ctx.strokeStyle = theme.glowColor;
        ctx.lineWidth = 1 + (intensity * 3);
        ctx.beginPath();
        ctx.moveTo(centerX + waveOffset - 5, centerY);
        ctx.lineTo(centerX + waveEnd, centerY);
        ctx.moveTo(centerX - waveOffset + 5, centerY);
        ctx.lineTo(centerX - waveEnd, centerY);
        ctx.stroke();
        
        ctx.shadowBlur = 15 + (intensity * 50); 
        ctx.shadowColor = theme.glowColor;
        ctx.strokeStyle = theme.coreColor;
        ctx.lineWidth = barWidth + (intensity * 4); 
        
        ctx.globalAlpha = Math.min(1, 0.6 + intensity * 0.8);

        // Smooth array logic
        state.smoothBars = state.smoothBars || new Array(maxBars).fill(0);

        for (let i = 0; i < maxBars; i++) {
            let targetVal = 0;
            let dropoff = Math.sin((i / maxBars) * Math.PI); // Window function
            
            if (isSimulating) {
                const wave1 = Math.sin(i * 0.5 + time * 8) * 15;
                const wave2 = Math.sin(i * 1.2 - time * 4) * 20;
                const wave3 = Math.sin(i * 0.2 + time * 2) * 25;
                let noise = Math.abs(wave1 + wave2 + wave3) * Math.pow(dropoff, 1.2);
                if (Math.random() > 0.8) noise += Math.random() * 20 * dropoff;
                targetVal = Math.max(2, noise + 4);
            } else {
                const dataIndex = Math.floor(i * (bufferLength / 2.5) / maxBars);
                const rVal = (dataArray ? dataArray[dataIndex] : 0) / 255;
                const beatScale = 1 + (intensity * 1.5); // Reduce jump height multiplier
                targetVal = Math.max(2, Math.pow(rVal, 1.3) * 60 * Math.pow(dropoff, 0.8) * beatScale + 4);
            }
            
            // Smooth Interpolation cho cột sóng (Lerp) - Giảm độ trễ, bám sát targetVal ngay lập tức
            state.smoothBars[i] = state.smoothBars[i] * 0.2 + targetVal * 0.8;
            const barHeight = Math.min(140, state.smoothBars[i]); // Cap max height to 140px
            
            const xOffset = waveOffset + i * (barWidth + spacing);
            
            // Draw Right Side
            ctx.beginPath();
            ctx.moveTo(centerX + xOffset, centerY - barHeight);
            ctx.lineTo(centerX + xOffset, centerY + barHeight);
            ctx.stroke();
            
            // Draw Left Side
            ctx.beginPath();
            ctx.moveTo(centerX - xOffset, centerY - barHeight);
            ctx.lineTo(centerX - xOffset, centerY + barHeight);
            ctx.stroke();
        }
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0; 
        
        ctx.restore(); // Restore Camera Shake
    }

    // ==========================================
    // DUET MODE VISUALIZER (Bản sắc Song Ca)
    // ==========================================
    function drawDuetVisualizer(ctx, canvas, dataArray, bufferLength, time, isSimulating, particlesArr) {
        const width = canvas.width;
        const height = canvas.height;
        const centerY = height / 2;
        const centerLeft = width * 0.25;
        const centerRight = width * 0.75;
        
        // Swap the character assignments to match the background (V2 on left, V1 on right)
        const theme1 = VIS_THEMES[state.selectedVoice2] || VIS_THEMES['elaina']; // Left
        const theme2 = VIS_THEMES[state.selectedVoice] || VIS_THEMES['kurumi']; // Right
        
        ctx.clearRect(0, 0, width, height);

        // --- 1. TÍNH TOÁN CƯỜNG ĐỘ (Intensity giả lập đối đáp) ---
        let iLeft = 0, iRight = 0;
        if (!isSimulating && dataArray) {
            // Chia dải tần: Bass/Mid cho Left, Mid/Treble cho Right
            let sumL = 0, sumR = 0;
            const third = Math.floor(bufferLength / 3);
            for (let i = 0; i < third; i++) sumL += dataArray[i];
            for (let i = third; i < third*2; i++) sumR += dataArray[i];
            
            iLeft = (sumL / third) / 255;
            iRight = (sumR / third) / 255;
            
            state.smoothILeft = (state.smoothILeft || 0) * 0.8 + iLeft * 0.2;
            state.smoothIRight = (state.smoothIRight || 0) * 0.8 + iRight * 0.2;
            iLeft = Math.pow(state.smoothILeft, 1.5);
            iRight = Math.pow(state.smoothIRight, 1.5);
        } else {
            iLeft = Math.max(0, Math.sin(time * 6)) * 0.4;
            iRight = Math.max(0, Math.cos(time * 6)) * 0.4;
        }

        const maxI = Math.max(iLeft, iRight);
        
        // Cập nhật brightness tổng
        document.body.style.filter = `brightness(${100 + maxI * 40}%)`;

        // Camera Shake tổng hợp
        ctx.save();
        if (maxI > 0.4) {
            const shake = (maxI - 0.4) * 6;
            ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        }

        // --- 3. HỆ THỐNG HẠT ĐA VÙNG (Dual Particle Engine) ---
        if (maxI > 0.4 && Math.random() > 0.4 && particlesArr.length < 100) {
            // Sinh hạt bên nào hát to hơn, hoặc cả 2
            if (iLeft > 0.3) {
                particlesArr.push({
                    x: centerLeft, y: centerY, side: 1,
                    size: Math.random() * 0.5 + 0.5,
                    speedX: (Math.random() - 0.5) * 15 * iLeft,
                    speedY: (Math.random() - 0.5) * 15 * iLeft,
                    alpha: 1.0, type: 'burst'
                });
            }
            if (iRight > 0.3) {
                particlesArr.push({
                    x: centerRight, y: centerY, side: 2,
                    size: Math.random() * 0.5 + 0.5,
                    speedX: (Math.random() - 0.5) * 15 * iRight,
                    speedY: (Math.random() - 0.5) * 15 * iRight,
                    alpha: 1.0, type: 'burst'
                });
            }
        }
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '20px Arial';
        
        particlesArr.forEach((p, idx) => {
            const theme = p.side === 1 ? theme1 : theme2;
            const tName = p.side === 1 ? state.selectedVoice2 : state.selectedVoice;
            const iLocal = p.side === 1 ? iLeft : iRight;
            
            let speedMult = 1 + (iLocal * 5);
            let char = theme.particles.text[idx % theme.particles.text.length];
            
            // Vật lý tương tự single mode nhưng bị ảnh hưởng bởi side
            if (tName === 'kurumi') { p.speedY -= 0.15; if (char === '🦋') p.speedX += Math.sin(time*4+idx)*0.5; } 
            else if (tName === 'elaina') { p.speedY += 0.05; p.speedX += 0.03; if (char === '🦋') speedMult = iLocal<0.3?0.3:6; } 
            else if (tName === 'miku') { p.speedY -= 0.03; if (char === '🌸' || char === '🍃') { p.speedY+=0.06; p.speedX+=Math.sin(time*2+idx)*0.2; } }
            
            // Gió đối lưu về giữa
            if (p.side === 1) p.speedX += 0.02; // Bị đẩy về phải
            if (p.side === 2) p.speedX -= 0.02; // Bị đẩy về trái
            
            p.speedX *= 0.99; p.speedY *= 0.99;
            p.x += p.speedX * speedMult; p.y += p.speedY * speedMult;
            if (p.type === 'burst') p.alpha -= 0.01;
            
            if (p.alpha <= 0 || p.x < -20 || p.x > width+20 || p.y < -20 || p.y > height+20) {
                if (p.type === 'burst') { particlesArr.splice(idx, 1); return; }
                p.side = Math.random() > 0.5 ? 1 : 2;
                p.x = p.side === 1 ? Math.random() * (width/2) : (width/2) + Math.random() * (width/2);
                p.y = Math.random() * height;
                p.speedX = (Math.random() - 0.5) * 2;
                p.speedY = (Math.random() - 0.5) * 2;
                p.alpha = Math.random() * 0.5 + 0.3;
            }
            
            ctx.fillStyle = theme.particles.colors + p.alpha + ')';
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(time * (idx%3===0?1:-1)*0.5 + idx);
            ctx.scale(p.size, p.size);
            ctx.fillText(char, 0, 0);
            ctx.restore();
        });

        // --- 4. SONG SINH AVATAR & RINGS ---
        const drawSideAvatar = (side, cx, iLocal, themeObj, tName) => {
            const avatarRadius = 60; // Nhỏ hơn một chút
            
            // Orbit Particles
            if (!state[`orbitParticles${side}`]) {
                state[`orbitParticles${side}`] = [];
                for (let i=0; i<10; i++) state[`orbitParticles${side}`].push({ angle: Math.random()*Math.PI*2, dist: 75+Math.random()*20, speed: (Math.random()*0.03+0.01)*(Math.random()>0.5?1:-1), char: ['✦','✧','✨'][Math.floor(Math.random()*3)] });
            }
            ctx.font = '16px Arial';
            state[`orbitParticles${side}`].forEach(op => {
                op.angle += op.speed * (1 + iLocal * 3);
                const ox = cx + Math.cos(op.angle) * (op.dist + iLocal * 30);
                const oy = centerY + Math.sin(op.angle) * (op.dist + iLocal * 30);
                ctx.fillStyle = themeObj.particles.colors + (0.5+iLocal*0.5) + ')';
                ctx.save(); ctx.translate(ox,oy); ctx.scale(0.5+iLocal*0.5, 0.5+iLocal*0.5); ctx.fillText(op.char, 0, 0); ctx.restore();
            });

            ctx.save();
            const avatarScale = 1 + (iLocal * 0.15);
            ctx.translate(cx, centerY);
            ctx.scale(avatarScale, avatarScale);
            
            const avatarImg = new Image();
            avatarImg.src = `avatar/avatar_${tName}.png`;
            ctx.save();
            ctx.beginPath(); ctx.arc(0, 0, avatarRadius, 0, Math.PI * 2); ctx.clip();
            if (iLocal > 0.3) { ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 20 * iLocal; ctx.shadowColor = themeObj.glowColor; }
            if (avatarImg.complete && avatarImg.naturalWidth > 0) ctx.drawImage(avatarImg, -avatarRadius, -avatarRadius, avatarRadius*2, avatarRadius*2);
            ctx.restore();
            
            ctx.beginPath(); ctx.arc(0, 0, avatarRadius, 0, Math.PI*2); ctx.strokeStyle = themeObj.coreColor; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore();
            
            themeObj.drawRing(ctx, cx, centerY, avatarRadius, time, iLocal);
        };

        // Moved drawSideAvatar calls to the end to ensure they draw ON TOP of the center line!
        // --- 5. SÓNG ÂM XUYÊN THẤU (Continuous Dual Waveform) ---
        const barWidth = 3;
        const spacing = 4;
        const maxBars = Math.floor(width / (barWidth + spacing)) - 10;
        const totalWaveWidth = maxBars * (barWidth + spacing);
        const startX = (width - totalWaveWidth) / 2;
        
        ctx.lineCap = 'round';
        ctx.lineWidth = barWidth + (maxI * 2);
        
        // Gradient line trục X
        const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
        lineGrad.addColorStop(0, theme1.glowColor);
        lineGrad.addColorStop(1, theme2.glowColor);
        
        ctx.shadowBlur = 10 + maxI * 20;
        ctx.shadowColor = maxI > 0.2 ? (iLeft > iRight ? theme1.glowColor : theme2.glowColor) : theme1.glowColor;
        ctx.strokeStyle = lineGrad;
        
        ctx.beginPath();
        ctx.moveTo(startX, centerY);
        ctx.lineTo(startX + totalWaveWidth, centerY);
        ctx.stroke();

        ctx.shadowBlur = 15 + maxI * 40;
        ctx.globalAlpha = Math.min(1, 0.7 + maxI * 0.8);
        
        state.smoothDuetBars = state.smoothDuetBars || new Array(maxBars).fill(0);
        
        for (let i = 0; i < maxBars; i++) {
            let targetVal = 0;
            // Xác định xem vạch này thuộc nửa trái hay phải
            const ratio = i / maxBars; 
            const side = ratio < 0.5 ? 1 : 2;
            const iLocal = side === 1 ? iLeft : iRight;
            const tColor = side === 1 ? theme1.coreColor : theme2.coreColor;
            
            // Bỏ qua vùng bên trong Avatar (WaveOffset)
            const xPos = startX + i * (barWidth + spacing);
            const distToLeft = Math.abs(xPos - centerLeft);
            const distToRight = Math.abs(xPos - centerRight);
            if (distToLeft < 75 || distToRight < 75) continue; // Khoảng trống cho Avatar
            
            if (isSimulating) {
                targetVal = Math.max(2, Math.abs(Math.sin(i*0.1 + time*5)*15) + 4);
            } else {
                // Map i vào dataArray (chỉ lấy nửa đầu của FFT cho bass/mid)
                const dataIndex = Math.floor(ratio * (bufferLength / 3));
                const rVal = (dataArray ? dataArray[dataIndex] : 0) / 255;
                const dropoff = Math.sin(ratio * Math.PI); // Ở 2 mép thấp, ở giữa cao
                targetVal = Math.max(2, Math.pow(rVal, 1.3) * 70 * Math.pow(dropoff, 0.5) * (1 + iLocal) + 4);
            }
            
            state.smoothDuetBars[i] = state.smoothDuetBars[i] * 0.2 + targetVal * 0.8;
            const barHeight = Math.min(120, state.smoothDuetBars[i]);
            
            // Vẽ gradient cho từng cọc sóng gần vùng trung tâm
            if (ratio > 0.4 && ratio < 0.6) {
                ctx.strokeStyle = lineGrad;
            } else {
                ctx.strokeStyle = tColor;
            }
            
            ctx.beginPath();
            ctx.moveTo(xPos, centerY - barHeight);
            ctx.lineTo(xPos, centerY + barHeight);
            ctx.stroke();
        }
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
        
        // Vẽ Avatar LÊN TRÊN CÙNG để che đi đường line xuyên tâm
        drawSideAvatar(1, centerLeft, iLeft, theme1, state.selectedVoice2);
        drawSideAvatar(2, centerRight, iRight, theme2, state.selectedVoice);
        
        ctx.restore(); // Restore camera shake
    }

    let lastDrawTime = Date.now();
    
    function drawVisualizer() {
        visAnimationId = requestAnimationFrame(drawVisualizer);
        if (!els.resultCanvas) return;
        
        const now = Date.now();
        const dt = (now - lastDrawTime) / 1000;
        lastDrawTime = now;
        
        // Calculate intensity independently for time accumulation
        let timeIntensity = 0;
        if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            const beatLength = Math.floor(bufferLength / 3);
            for (let i = 0; i < beatLength; i++) sum += dataArray[i];
            timeIntensity = Math.pow((sum / beatLength) / 255, 1.5);
        }
        
        // Accumulate time (speed up on bass)
        state.accumTime = (state.accumTime || 0) + dt * (1 + timeIntensity * 3);

        drawThemeVisualizer(visCtx, els.resultCanvas, dataArray, bufferLength, state.accumTime, false, visParticles);
    }
    
    // -- Processing Simulation Visualizer --
    let procVisAnimationId = null;
    let procParticles = [];
    
    function startProcessingVisualizer() {
        const canvas = els.processingCanvas;
        if (!canvas) return;
        
        // Initialize particles if empty
        if (procParticles.length === 0) {
            for(let i=0; i<30; i++) {
                procParticles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 1,
                    speedX: (Math.random() - 0.5) * 1.5,
                    speedY: (Math.random() - 0.5) * 1.5,
                    alpha: Math.random() * 0.5 + 0.1
                });
            }
        }
        
        if (procVisAnimationId) cancelAnimationFrame(procVisAnimationId);
        simulateProcessingVisualizer();
    }

    function simulateProcessingVisualizer() {
        if (!state.isProcessing) return;
        procVisAnimationId = requestAnimationFrame(simulateProcessingVisualizer);
        if (!els.processingCanvas) return;
        drawThemeVisualizer(els.processingCanvas.getContext('2d'), els.processingCanvas, null, 0, Date.now()/1000, true, procParticles);
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