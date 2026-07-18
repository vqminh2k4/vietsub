/**
 * VietDub — Video Translation to Vietnamese
 * Main Application Logic
 * Uses: Web Speech API, MyMemory Translation API, Web Speech Synthesis
 */

(function () {
    'use strict';

    // ─── Configuration ───────────────────────────────────────────────
    const CONFIG = {
        TRANSLATION_API: 'https://api.mymemory.translated.net/get',
        MAX_CHUNK_LENGTH: 450,
        SPEECH_RECOGNITION_TIMEOUT: 5000,
        TOAST_DURATION: 4000,
        SUPPORTED_FORMATS: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
    };

    // ─── State ───────────────────────────────────────────────────────
    const state = {
        videoFile: null,
        videoURL: null,
        segments: [],          // { id, startTime, endTime, originalText, vietnameseText }
        isProcessing: false,
        isPlaying: false,
        isEditable: false,
        currentSegmentIndex: -1,
        recognition: null,
        synth: window.speechSynthesis,
        vnVoices: [],
        selectedVoice: null,
        speechRate: 1.0,
        isMuted: false,
        isVNPlaying: false,
    };

    // ─── DOM Elements ────────────────────────────────────────────────
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const els = {
        // Upload
        uploadSection: $('#uploadSection'),
        uploadArea: $('#uploadArea'),
        fileInput: $('#fileInput'),

        // Workspace
        workspace: $('#workspace'),
        videoPlayer: $('#videoPlayer'),
        videoContainer: $('#videoContainer'),

        // Subtitles
        subtitleOverlay: $('#subtitleOverlay'),
        subtitleOriginal: $('#subtitleOriginal'),
        subtitleVietnamese: $('#subtitleVietnamese'),

        // Video controls
        btnPlayPause: $('#btnPlayPause'),
        iconPlay: $('.icon-play'),
        iconPause: $('.icon-pause'),
        videoProgress: $('#videoProgress'),
        videoProgressFill: $('#videoProgressFill'),
        videoTime: $('#videoTime'),
        btnMuteOriginal: $('#btnMuteOriginal'),

        // Control panel
        sourceLang: $('#sourceLang'),
        vnVoice: $('#vnVoice'),
        speechRate: $('#speechRate'),
        rateValue: $('#rateValue'),
        fileName: $('#fileName'),
        fileMeta: $('#fileMeta'),

        // Action buttons
        btnStartProcess: $('#btnStartProcess'),
        btnPlayVN: $('#btnPlayVN'),
        btnExportSRT: $('#btnExportSRT'),
        btnNewVideo: $('#btnNewVideo'),

        // Status
        processingStatus: $('#processingStatus'),
        statusBadge: $('#statusBadge'),
        statusText: $('#statusText'),
        progressFill: $('#progressFill'),
        statusDetail: $('#statusDetail'),

        // Transcript
        transcriptSection: $('#transcriptSection'),
        segmentListOriginal: $('#segmentListOriginal'),
        segmentListVietnamese: $('#segmentListVietnamese'),
        btnToggleEdit: $('#btnToggleEdit'),
        btnClearTranscript: $('#btnClearTranscript'),

        // Browser
        browserBadge: $('#browserBadge'),
        browserStatus: $('#browserStatus'),

        // Toast
        toastContainer: $('#toastContainer'),

        // URL Input
        urlInput: $('#urlInput'),
        btnUrlSubmit: $('#btnUrlSubmit'),
    };

    // ─── Utilities ───────────────────────────────────────────────────
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function formatFileSize(bytes) {
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function generateId() {
        return 'seg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ─── Toast Notifications ─────────────────────────────────────────
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} slide-in-right`;
        const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        `;
        els.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, CONFIG.TOAST_DURATION);
    }

    // ─── Browser Compatibility Check ─────────────────────────────────
    function checkBrowserSupport() {
        const hasSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
        const hasSpeechSynthesis = 'speechSynthesis' in window;

        if (hasSpeechRecognition && hasSpeechSynthesis) {
            els.browserBadge.classList.add('badge-success');
            els.browserStatus.textContent = 'Trình duyệt hỗ trợ đầy đủ';
        } else {
            els.browserBadge.classList.add('badge-warning');
            const missing = [];
            if (!hasSpeechRecognition) missing.push('Speech Recognition');
            if (!hasSpeechSynthesis) missing.push('Speech Synthesis');
            els.browserStatus.textContent = `Thiếu: ${missing.join(', ')}`;
            showToast('Trình duyệt không hỗ trợ đầy đủ. Vui lòng dùng Chrome hoặc Edge.', 'warning');
        }
        return hasSpeechRecognition && hasSpeechSynthesis;
    }

    // ─── Load Vietnamese Voices ──────────────────────────────────────
    function loadVoices() {
        const voices = state.synth.getVoices();
        state.vnVoices = voices.filter(v => v.lang.startsWith('vi'));

        els.vnVoice.innerHTML = '';

        if (state.vnVoices.length === 0) {
            // Try all voices
            const fallback = voices.filter(v => v.lang.includes('vi') || v.name.toLowerCase().includes('viet'));
            if (fallback.length > 0) {
                state.vnVoices = fallback;
            } else {
                // Add default option
                const opt = document.createElement('option');
                opt.value = 'default';
                opt.textContent = 'Giọng mặc định (không tìm thấy giọng VN)';
                els.vnVoice.appendChild(opt);
                return;
            }
        }

        state.vnVoices.forEach((voice, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${voice.name} (${voice.lang})`;
            els.vnVoice.appendChild(opt);
        });

        state.selectedVoice = state.vnVoices[0];
    }

    // ─── Upload Handler ──────────────────────────────────────────────
    function initUpload() {
        const area = els.uploadArea;

        // Click to upload
        area.addEventListener('click', () => els.fileInput.click());
        area.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') els.fileInput.click();
        });

        // File input change
        els.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleFile(e.target.files[0]);
        });

        // Drag and drop
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });

        area.addEventListener('dragleave', () => {
            area.classList.remove('dragover');
        });

        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
        });
    }

    function handleFile(file) {
        // Check format
        if (!CONFIG.SUPPORTED_FORMATS.includes(file.type) && !file.name.match(/\.(mp4|webm|ogg|mov)$/i)) {
            showToast('Định dạng không hỗ trợ. Vui lòng chọn MP4, WebM, OGG hoặc MOV.', 'error');
            return;
        }

        state.videoFile = file;
        state.videoURL = URL.createObjectURL(file);
        state.segments = [];

        showWorkspace(file.name, formatFileSize(file.size));

        els.videoPlayer.addEventListener('loadedmetadata', () => {
            els.fileMeta.textContent = `${formatFileSize(file.size)} • ${formatTime(els.videoPlayer.duration)}`;
        }, { once: true });

        showToast(`Đã tải video: ${file.name}`, 'success');
    }

    function showWorkspace(name, meta) {
        els.uploadSection.hidden = true;
        els.workspace.hidden = false;
        els.workspace.classList.add('slide-up');

        els.videoPlayer.src = state.videoURL;
        els.fileName.textContent = name;
        els.fileMeta.textContent = meta || '';
    }

    // ─── URL Video Handler ───────────────────────────────────────────
    function detectPlatform(url) {
        if (/youtube\.com|youtu\.be/i.test(url)) return 'YouTube';
        if (/tiktok\.com/i.test(url)) return 'TikTok';
        if (/instagram\.com/i.test(url)) return 'Instagram';
        if (/facebook\.com|fb\.watch/i.test(url)) return 'Facebook';
        if (/twitter\.com|x\.com/i.test(url)) return 'Twitter/X';
        return 'Video';
    }

    function showUrlLoading(platform) {
        const overlay = document.createElement('div');
        overlay.className = 'url-loading-overlay';
        overlay.id = 'urlLoadingOverlay';
        overlay.innerHTML = `
            <div class="url-loading-card">
                <div class="spinner-large"></div>
                <h3>Đang tải video từ ${platform}...</h3>
                <p>Vui lòng đợi trong giây lát</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    function hideUrlLoading() {
        const overlay = document.getElementById('urlLoadingOverlay');
        if (overlay) overlay.remove();
    }

    async function handleUrlSubmit() {
        const url = els.urlInput.value.trim();
        if (!url) {
            showToast('Vui lòng nhập link video.', 'warning');
            els.urlInput.focus();
            return;
        }

        // Validate URL
        try { new URL(url); } catch {
            showToast('Link không hợp lệ. Vui lòng kiểm tra lại.', 'error');
            return;
        }

        const platform = detectPlatform(url);
        showUrlLoading(platform);

        try {
            // Try Cobalt API (open-source video downloader)
            const videoBlob = await downloadViaCobalt(url);

            if (videoBlob) {
                state.videoURL = URL.createObjectURL(videoBlob);
                state.videoFile = new File([videoBlob], `${platform}_video.mp4`, { type: 'video/mp4' });
                state.segments = [];

                hideUrlLoading();
                showWorkspace(`${platform} Video`, formatFileSize(videoBlob.size));

                els.videoPlayer.addEventListener('loadedmetadata', () => {
                    els.fileMeta.textContent = `${formatFileSize(videoBlob.size)} • ${formatTime(els.videoPlayer.duration)}`;
                }, { once: true });

                showToast(`Đã tải video từ ${platform}!`, 'success');
                return;
            }
        } catch (err) {
            console.warn('Cobalt API error:', err);
        }

        // Fallback: try direct URL (for direct video links)
        try {
            const resp = await fetch(url, { method: 'HEAD', mode: 'cors' });
            const contentType = resp.headers.get('content-type') || '';
            if (contentType.startsWith('video/')) {
                state.videoURL = url;
                state.segments = [];
                hideUrlLoading();
                showWorkspace(`${platform} Video`, '');
                showToast(`Đã tải video từ link trực tiếp!`, 'success');
                return;
            }
        } catch (e) {
            console.warn('Direct URL failed:', e);
        }

        hideUrlLoading();

        // Show helpful instructions
        showToast(
            `Không thể tải tự động từ ${platform}. Hãy tải video về máy trước rồi upload lên.`,
            'warning'
        );
        showDownloadGuide(platform, url);
    }

    async function downloadViaCobalt(url) {
        // List of public Cobalt API instances
        const cobaltAPIs = [
            'https://api.cobalt.tools',
        ];

        for (const apiBase of cobaltAPIs) {
            try {
                const resp = await fetch(`${apiBase}/`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: url,
                        downloadMode: 'auto',
                        filenameStyle: 'basic',
                    }),
                });

                if (!resp.ok) continue;

                const data = await resp.json();

                if (data.status === 'tunnel' || data.status === 'redirect') {
                    const downloadUrl = data.url;
                    if (downloadUrl) {
                        const videoResp = await fetch(downloadUrl);
                        if (videoResp.ok) {
                            return await videoResp.blob();
                        }
                    }
                }

                if (data.status === 'picker' && data.picker?.length > 0) {
                    // Get the first video option
                    const videoOption = data.picker.find(p => p.type === 'video') || data.picker[0];
                    if (videoOption?.url) {
                        const videoResp = await fetch(videoOption.url);
                        if (videoResp.ok) {
                            return await videoResp.blob();
                        }
                    }
                }
            } catch (e) {
                console.warn(`Cobalt API ${apiBase} failed:`, e);
                continue;
            }
        }

        return null;
    }

    function showDownloadGuide(platform, url) {
        const guides = {
            'YouTube': {
                steps: [
                    'Cách 1: Thêm "ss" trước youtube.com → ssyoutube.com/...',
                    'Cách 2: Dùng trang cobalt.tools — dán link và tải',
                    'Cách 3: Dùng ứng dụng yt-dlp trên máy tính',
                ],
            },
            'TikTok': {
                steps: [
                    'Cách 1: Dùng trang snaptik.app — dán link TikTok',
                    'Cách 2: Dùng trang cobalt.tools — dán link và tải',
                    'Cách 3: Trong app TikTok → Chia sẻ → Lưu video',
                ],
            },
        };

        const guide = guides[platform] || {
            steps: [
                'Dùng trang cobalt.tools — dán link video và tải về',
                'Sau đó upload file video lên VietDub',
            ],
        };

        // Show guide as a toast sequence
        guide.steps.forEach((step, i) => {
            setTimeout(() => showToast(step, 'info'), (i + 1) * 800);
        });
    }

    // ─── Video Player Controls ───────────────────────────────────────
    function initVideoControls() {
        const video = els.videoPlayer;

        els.btnPlayPause.addEventListener('click', togglePlayPause);

        video.addEventListener('play', () => {
            els.iconPlay.hidden = true;
            els.iconPause.hidden = false;
            state.isPlaying = true;
        });

        video.addEventListener('pause', () => {
            els.iconPlay.hidden = false;
            els.iconPause.hidden = true;
            state.isPlaying = false;
        });

        video.addEventListener('timeupdate', () => {
            const progress = (video.currentTime / video.duration) * 100;
            els.videoProgressFill.style.width = `${progress}%`;
            els.videoTime.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
            updateSubtitles(video.currentTime);
        });

        // Seek
        els.videoProgress.addEventListener('click', (e) => {
            const rect = els.videoProgress.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            video.currentTime = ratio * video.duration;
        });

        // Mute
        els.btnMuteOriginal.addEventListener('click', () => {
            state.isMuted = !state.isMuted;
            video.muted = state.isMuted;
            els.btnMuteOriginal.classList.toggle('muted', state.isMuted);
            showToast(state.isMuted ? 'Đã tắt âm gốc' : 'Đã bật âm gốc', 'info');
        });

        // Speech rate
        els.speechRate.addEventListener('input', () => {
            state.speechRate = parseFloat(els.speechRate.value);
            els.rateValue.textContent = state.speechRate.toFixed(1) + 'x';
        });

        // Voice selection
        els.vnVoice.addEventListener('change', () => {
            const idx = parseInt(els.vnVoice.value);
            if (!isNaN(idx) && state.vnVoices[idx]) {
                state.selectedVoice = state.vnVoices[idx];
            }
        });
    }

    function togglePlayPause() {
        if (els.videoPlayer.paused) {
            els.videoPlayer.play();
        } else {
            els.videoPlayer.pause();
        }
    }

    // ─── Subtitle Display ────────────────────────────────────────────
    function updateSubtitles(currentTime) {
        const segment = state.segments.find(s =>
            currentTime >= s.startTime && currentTime <= s.endTime
        );

        if (segment) {
            els.subtitleOriginal.textContent = segment.originalText;
            els.subtitleVietnamese.textContent = segment.vietnameseText || '';
            els.subtitleOverlay.classList.add('visible');

            // Highlight active segment in transcript
            highlightSegment(segment.id);
        } else {
            els.subtitleOverlay.classList.remove('visible');
        }
    }

    function highlightSegment(segId) {
        if (state.currentSegmentIndex === segId) return;
        state.currentSegmentIndex = segId;

        $$('.segment-item').forEach(el => el.classList.remove('active'));
        const activeEls = $$(`.segment-item[data-id="${segId}"]`);
        activeEls.forEach(el => {
            el.classList.add('active');
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }

    // ─── Speech Recognition ──────────────────────────────────────────
    function createRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return null;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        return recognition;
    }

    async function startSpeechRecognition() {
        return new Promise((resolve, reject) => {
            const recognition = createRecognition();
            if (!recognition) {
                reject(new Error('Speech Recognition không được hỗ trợ'));
                return;
            }

            const lang = els.sourceLang.value;
            recognition.lang = lang;

            const results = [];
            let segmentStart = 0;
            let lastResultTime = Date.now();

            recognition.onresult = (event) => {
                lastResultTime = Date.now();
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        const text = event.results[i][0].transcript.trim();
                        if (text) {
                            const currentTime = els.videoPlayer.currentTime;
                            results.push({
                                id: generateId(),
                                startTime: segmentStart,
                                endTime: currentTime,
                                originalText: text,
                                vietnameseText: '',
                            });
                            segmentStart = currentTime;

                            // Update UI in real-time
                            updateProgress(
                                Math.min(90, (currentTime / els.videoPlayer.duration) * 100),
                                `Đã nhận dạng: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`
                            );
                            renderSegments(results);
                        }
                    }
                }
            };

            recognition.onerror = (event) => {
                console.warn('Speech recognition error:', event.error);
                if (event.error === 'no-speech') {
                    // Continue listening
                    return;
                }
                if (event.error !== 'aborted') {
                    showToast(`Lỗi nhận dạng: ${event.error}`, 'warning');
                }
            };

            recognition.onend = () => {
                if (state.isProcessing && els.videoPlayer.currentTime < els.videoPlayer.duration - 0.5) {
                    // Restart if video is still playing
                    try {
                        recognition.start();
                    } catch (e) {
                        console.warn('Could not restart recognition:', e);
                    }
                } else {
                    resolve(results);
                }
            };

            // Start playing video and recognition
            els.videoPlayer.currentTime = 0;
            els.videoPlayer.play();
            recognition.start();

            state.recognition = recognition;

            // Monitor video end
            els.videoPlayer.addEventListener('ended', () => {
                setTimeout(() => {
                    try {
                        recognition.stop();
                    } catch (e) { }
                    resolve(results);
                }, 1500);
            }, { once: true });

            // Also set a safety timeout based on video duration
            const safetyTimeout = (els.videoPlayer.duration + 10) * 1000;
            setTimeout(() => {
                if (state.isProcessing) {
                    try { recognition.stop(); } catch (e) { }
                    resolve(results);
                }
            }, safetyTimeout);
        });
    }

    // ─── Translation ─────────────────────────────────────────────────
    async function translateText(text, sourceLang) {
        // Map speech recognition lang codes to MyMemory lang codes
        const langMap = {
            'en-US': 'en', 'en-GB': 'en', 'ja': 'ja', 'ko': 'ko',
            'zh-CN': 'zh-CN', 'fr': 'fr', 'de': 'de', 'es': 'es',
            'th': 'th', 'ru': 'ru', 'pt': 'pt', 'hi': 'hi',
        };

        const from = langMap[sourceLang] || 'en';
        const to = 'vi';

        try {
            const url = `${CONFIG.TRANSLATION_API}?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.responseStatus === 200 && data.responseData) {
                return data.responseData.translatedText;
            }

            // Fallback: return original with note
            console.warn('Translation API returned unexpected status:', data);
            return `[Lỗi dịch] ${text}`;
        } catch (error) {
            console.error('Translation error:', error);
            return `[Lỗi dịch] ${text}`;
        }
    }

    async function translateAllSegments(segments) {
        const translated = [];
        for (let i = 0; i < segments.length; i++) {
            const seg = { ...segments[i] };
            updateProgress(
                ((i + 1) / segments.length) * 100,
                `Đang dịch đoạn ${i + 1}/${segments.length}: "${seg.originalText.substring(0, 40)}..."`
            );

            seg.vietnameseText = await translateText(seg.originalText, els.sourceLang.value);
            translated.push(seg);

            // Small delay to avoid rate limiting
            await delay(300);
        }
        return translated;
    }

    // ─── Text-to-Speech (Vietnamese) ─────────────────────────────────
    function speakVietnamese(text) {
        return new Promise((resolve) => {
            if (!state.synth) { resolve(); return; }

            state.synth.cancel(); // Cancel any ongoing speech

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'vi-VN';
            utterance.rate = state.speechRate;
            utterance.pitch = 1;
            utterance.volume = 1;

            if (state.selectedVoice) {
                utterance.voice = state.selectedVoice;
            }

            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();

            state.synth.speak(utterance);
        });
    }

    async function playVietnameseAudio() {
        if (state.segments.length === 0) {
            showToast('Chưa có nội dung để phát. Vui lòng dịch video trước.', 'warning');
            return;
        }

        state.isVNPlaying = !state.isVNPlaying;

        if (!state.isVNPlaying) {
            state.synth.cancel();
            els.btnPlayVN.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                    <path d="M4 2L15 9L4 16V2Z"/>
                </svg>
                Phát Giọng Việt
            `;
            return;
        }

        els.btnPlayVN.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <path d="M4 3H7V15H4zM11 3H14V15H11z"/>
            </svg>
            Dừng Giọng Việt
        `;

        // Mute original audio
        els.videoPlayer.muted = true;
        els.videoPlayer.currentTime = 0;
        els.videoPlayer.play();

        for (let i = 0; i < state.segments.length; i++) {
            if (!state.isVNPlaying) break;

            const seg = state.segments[i];
            highlightSegment(seg.id);

            // Seek video to segment start
            els.videoPlayer.currentTime = seg.startTime;

            // Update subtitles
            els.subtitleOriginal.textContent = seg.originalText;
            els.subtitleVietnamese.textContent = seg.vietnameseText;
            els.subtitleOverlay.classList.add('visible');

            // Speak Vietnamese
            if (seg.vietnameseText && !seg.vietnameseText.startsWith('[Lỗi')) {
                await speakVietnamese(seg.vietnameseText);
            }

            // Small pause between segments
            await delay(200);
        }

        state.isVNPlaying = false;
        els.videoPlayer.muted = state.isMuted;
        els.btnPlayVN.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                <path d="M4 2L15 9L4 16V2Z"/>
            </svg>
            Phát Giọng Việt
        `;
        showToast('Đã phát xong tất cả đoạn tiếng Việt!', 'success');
    }

    // ─── Processing Pipeline ─────────────────────────────────────────
    async function startProcessing() {
        if (state.isProcessing) return;
        state.isProcessing = true;

        els.btnStartProcess.disabled = true;
        els.processingStatus.hidden = false;

        try {
            // Step 1: Speech Recognition
            updateStatus('processing', 'Đang nhận dạng giọng nói...');
            updateProgress(5, 'Đang phát video và nhận dạng giọng nói...');

            const rawSegments = await startSpeechRecognition();

            if (rawSegments.length === 0) {
                showToast('Không nhận dạng được giọng nói. Hãy thử chọn đúng ngôn ngữ gốc hoặc kiểm tra video có âm thanh.', 'warning');
                resetProcessing();
                return;
            }

            showToast(`Đã nhận dạng ${rawSegments.length} đoạn văn bản!`, 'success');

            // Step 2: Translation
            updateStatus('processing', 'Đang dịch sang tiếng Việt...');
            els.videoPlayer.pause();

            const translatedSegments = await translateAllSegments(rawSegments);

            state.segments = translatedSegments;
            renderSegments(state.segments);

            showToast('Dịch thuật hoàn tất!', 'success');

            // Step 3: Done
            updateStatus('completed', 'Hoàn tất!');
            updateProgress(100, `Đã dịch ${state.segments.length} đoạn. Nhấn "Phát Giọng Việt" để nghe.`);

            els.btnPlayVN.disabled = false;
            els.btnExportSRT.disabled = false;

        } catch (error) {
            console.error('Processing error:', error);
            updateStatus('error', 'Lỗi xử lý');
            showToast('Đã xảy ra lỗi: ' + error.message, 'error');
        }

        state.isProcessing = false;
        els.btnStartProcess.disabled = false;
    }

    // ─── UI Updates ──────────────────────────────────────────────────
    function updateStatus(type, text) {
        els.statusBadge.className = `status-badge ${type}`;
        els.statusText.textContent = text;
    }

    function updateProgress(percent, detail) {
        els.progressFill.style.width = `${percent}%`;
        els.statusDetail.textContent = detail;
    }

    function renderSegments(segments) {
        if (segments.length === 0) return;

        els.segmentListOriginal.innerHTML = '';
        els.segmentListVietnamese.innerHTML = '';

        segments.forEach((seg, i) => {
            // Original
            const origEl = document.createElement('div');
            origEl.className = 'segment-item';
            origEl.dataset.id = seg.id;
            origEl.innerHTML = `
                <div class="segment-time">${formatTime(seg.startTime)} → ${formatTime(seg.endTime)}</div>
                <div class="segment-text" ${state.isEditable ? 'contenteditable="true"' : ''}>${seg.originalText}</div>
            `;
            origEl.addEventListener('click', () => {
                els.videoPlayer.currentTime = seg.startTime;
                highlightSegment(seg.id);
            });

            // Vietnamese
            const vnEl = document.createElement('div');
            vnEl.className = 'segment-item';
            vnEl.dataset.id = seg.id;
            vnEl.innerHTML = `
                <div class="segment-time">${formatTime(seg.startTime)} → ${formatTime(seg.endTime)}</div>
                <div class="segment-text vn-text" ${state.isEditable ? 'contenteditable="true"' : ''}>${seg.vietnameseText || '<em>Đang dịch...</em>'}</div>
            `;
            vnEl.addEventListener('click', () => {
                els.videoPlayer.currentTime = seg.startTime;
                highlightSegment(seg.id);
            });

            // Handle edit
            if (state.isEditable) {
                const origText = origEl.querySelector('.segment-text');
                origText.addEventListener('blur', () => {
                    state.segments[i].originalText = origText.textContent;
                });

                const vnText = vnEl.querySelector('.segment-text');
                vnText.addEventListener('blur', () => {
                    state.segments[i].vietnameseText = vnText.textContent;
                });
            }

            els.segmentListOriginal.appendChild(origEl);
            els.segmentListVietnamese.appendChild(vnEl);
        });
    }

    function resetProcessing() {
        state.isProcessing = false;
        els.btnStartProcess.disabled = false;
        els.processingStatus.hidden = true;
        try { state.recognition?.stop(); } catch (e) { }
    }

    // ─── Export SRT ──────────────────────────────────────────────────
    function exportSRT() {
        if (state.segments.length === 0) {
            showToast('Chưa có phụ đề để xuất.', 'warning');
            return;
        }

        function formatSRTTime(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            const ms = Math.floor((seconds % 1) * 1000);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
        }

        let srt = '';
        state.segments.forEach((seg, i) => {
            srt += `${i + 1}\n`;
            srt += `${formatSRTTime(seg.startTime)} --> ${formatSRTTime(seg.endTime)}\n`;
            srt += `${seg.vietnameseText || seg.originalText}\n\n`;
        });

        const blob = new Blob([srt], { type: 'text/srt;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (state.videoFile?.name?.replace(/\.[^.]+$/, '') || 'vietdub') + '_vi.srt';
        a.click();
        URL.revokeObjectURL(url);

        showToast('Đã xuất file phụ đề SRT!', 'success');
    }

    // ─── Event Bindings ──────────────────────────────────────────────
    function bindEvents() {
        els.btnStartProcess.addEventListener('click', startProcessing);
        els.btnPlayVN.addEventListener('click', playVietnameseAudio);
        els.btnExportSRT.addEventListener('click', exportSRT);

        // URL submit
        els.btnUrlSubmit.addEventListener('click', handleUrlSubmit);
        els.urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleUrlSubmit();
        });

        els.btnNewVideo.addEventListener('click', () => {
            // Reset everything
            state.synth.cancel();
            state.isVNPlaying = false;
            state.segments = [];
            state.isProcessing = false;
            if (state.videoURL) URL.revokeObjectURL(state.videoURL);

            els.workspace.hidden = true;
            els.uploadSection.hidden = false;
            els.fileInput.value = '';
            els.btnPlayVN.disabled = true;
            els.btnExportSRT.disabled = true;
            els.processingStatus.hidden = true;
            els.segmentListOriginal.innerHTML = '<div class="empty-state"><p>Chưa có nội dung. Nhấn "Bắt Đầu Dịch" để bắt đầu.</p></div>';
            els.segmentListVietnamese.innerHTML = '<div class="empty-state"><p>Bản dịch sẽ hiển thị ở đây.</p></div>';
        });

        els.btnToggleEdit.addEventListener('click', () => {
            state.isEditable = !state.isEditable;
            els.btnToggleEdit.textContent = state.isEditable ? '✅' : '✏️';
            showToast(state.isEditable ? 'Đã bật chế độ chỉnh sửa' : 'Đã tắt chế độ chỉnh sửa', 'info');
            renderSegments(state.segments);
        });

        els.btnClearTranscript.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn xóa tất cả bản dịch?')) {
                state.segments = [];
                els.segmentListOriginal.innerHTML = '<div class="empty-state"><p>Chưa có nội dung. Nhấn "Bắt Đầu Dịch" để bắt đầu.</p></div>';
                els.segmentListVietnamese.innerHTML = '<div class="empty-state"><p>Bản dịch sẽ hiển thị ở đây.</p></div>';
                els.btnPlayVN.disabled = true;
                els.btnExportSRT.disabled = true;
                showToast('Đã xóa tất cả bản dịch.', 'info');
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.contentEditable === 'true') return;

            if (e.code === 'Space' && !els.workspace.hidden) {
                e.preventDefault();
                togglePlayPause();
            }
        });
    }

    // ─── Feature: Intersection Observer for Animations ───────────────
    function initAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        $$('.fade-in').forEach(el => observer.observe(el));
    }

    // ─── Initialize ──────────────────────────────────────────────────
    function init() {
        checkBrowserSupport();
        loadVoices();

        // Voices may load asynchronously
        if (state.synth) {
            state.synth.addEventListener('voiceschanged', loadVoices);
        }

        initUpload();
        initVideoControls();
        bindEvents();
        initAnimations();

        console.log('🎬 VietDub initialized successfully!');
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
