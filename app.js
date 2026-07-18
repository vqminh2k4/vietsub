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

    // ─── Danh sách ngôn ngữ nguồn hỗ trợ ──────────────────────────────
    // code   : mã dùng cho Web Speech Recognition (BCP-47)
    // trCode : mã dùng cho MyMemory Translation API
    // label  : tên hiển thị (tiếng Việt) trong dropdown
    const LANGUAGES = [
        { code: 'en-US', trCode: 'en',    label: 'Tiếng Anh (Mỹ)' },
        { code: 'en-GB', trCode: 'en',    label: 'Tiếng Anh (Anh)' },
        { code: 'ja-JP', trCode: 'ja',    label: 'Tiếng Nhật' },
        { code: 'ko-KR', trCode: 'ko',    label: 'Tiếng Hàn' },
        { code: 'zh-CN', trCode: 'zh-CN', label: 'Tiếng Trung (Giản thể)' },
        { code: 'zh-TW', trCode: 'zh-TW', label: 'Tiếng Trung (Phồn thể)' },
        { code: 'fr-FR', trCode: 'fr',    label: 'Tiếng Pháp' },
        { code: 'de-DE', trCode: 'de',    label: 'Tiếng Đức' },
        { code: 'es-ES', trCode: 'es',    label: 'Tiếng Tây Ban Nha' },
        { code: 'it-IT', trCode: 'it',    label: 'Tiếng Ý' },
        { code: 'pt-BR', trCode: 'pt',    label: 'Tiếng Bồ Đào Nha (Brazil)' },
        { code: 'pt-PT', trCode: 'pt',    label: 'Tiếng Bồ Đào Nha (Bồ Đào Nha)' },
        { code: 'ru-RU', trCode: 'ru',    label: 'Tiếng Nga' },
        { code: 'th-TH', trCode: 'th',    label: 'Tiếng Thái' },
        { code: 'hi-IN', trCode: 'hi',    label: 'Tiếng Hindi' },
        { code: 'id-ID', trCode: 'id',    label: 'Tiếng Indonesia' },
        { code: 'ms-MY', trCode: 'ms',    label: 'Tiếng Mã Lai' },
        { code: 'ar-SA', trCode: 'ar',    label: 'Tiếng Ả Rập' },
        { code: 'nl-NL', trCode: 'nl',    label: 'Tiếng Hà Lan' },
        { code: 'pl-PL', trCode: 'pl',    label: 'Tiếng Ba Lan' },
        { code: 'tr-TR', trCode: 'tr',    label: 'Tiếng Thổ Nhĩ Kỳ' },
        { code: 'uk-UA', trCode: 'uk',    label: 'Tiếng Ukraina' },
        { code: 'sv-SE', trCode: 'sv',    label: 'Tiếng Thụy Điển' },
        { code: 'da-DK', trCode: 'da',    label: 'Tiếng Đan Mạch' },
        { code: 'no-NO', trCode: 'no',    label: 'Tiếng Na Uy' },
        { code: 'fi-FI', trCode: 'fi',    label: 'Tiếng Phần Lan' },
        { code: 'el-GR', trCode: 'el',    label: 'Tiếng Hy Lạp' },
        { code: 'he-IL', trCode: 'he',    label: 'Tiếng Do Thái' },
        { code: 'cs-CZ', trCode: 'cs',    label: 'Tiếng Séc' },
        { code: 'hu-HU', trCode: 'hu',    label: 'Tiếng Hungary' },
        { code: 'ro-RO', trCode: 'ro',    label: 'Tiếng Romania' },
        { code: 'fil-PH', trCode: 'tl',   label: 'Tiếng Philippines (Filipino)' },
        { code: 'bn-BD', trCode: 'bn',    label: 'Tiếng Bengal' },
        { code: 'ur-PK', trCode: 'ur',    label: 'Tiếng Urdu' },
        { code: 'ta-IN', trCode: 'ta',    label: 'Tiếng Tamil' },
        { code: 'te-IN', trCode: 'te',    label: 'Tiếng Telugu' },
        { code: 'km-KH', trCode: 'km',    label: 'Tiếng Khmer' },
        { code: 'lo-LA', trCode: 'lo',    label: 'Tiếng Lào' },
        { code: 'my-MM', trCode: 'my',    label: 'Tiếng Myanmar' },
    ];

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

        // Settings
        btnSettings: $('#btnSettings'),
        settingsModal: $('#settingsModal'),
        btnCloseSettings: $('#btnCloseSettings'),
        ttsBackendSelect: $('#ttsBackendSelect'),
        groupFishApi: $('#groupFishApi'),
        groupLocalApi: $('#groupLocalApi'),
        fishApiKeyInput: $('#fishApiKeyInput'),
        localApiUrlInput: $('#localApiUrlInput'),
        btnSaveSettings: $('#btnSaveSettings'),

        // Anime Hack
        animeVoiceToggle: $('#animeVoiceToggle'),
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

    function getLangByCode(code) {
        return LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
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

        // Settings Modal
        els.btnSettings.addEventListener('click', () => {
            els.ttsBackendSelect.value = localStorage.getItem('ttsBackend') || 'fish';
            els.fishApiKeyInput.value = localStorage.getItem('fishApiKey') || '';
            els.localApiUrlInput.value = localStorage.getItem('localApiUrl') || 'http://127.0.0.1:5000/tts';
            
            // Dispatch change to update UI
            els.ttsBackendSelect.dispatchEvent(new Event('change'));
            els.settingsModal.hidden = false;
        });

        els.ttsBackendSelect.addEventListener('change', () => {
            if (els.ttsBackendSelect.value === 'fish') {
                els.groupFishApi.style.display = 'block';
                els.groupLocalApi.style.display = 'none';
            } else {
                els.groupFishApi.style.display = 'none';
                els.groupLocalApi.style.display = 'block';
            }
        });

        els.btnCloseSettings.addEventListener('click', () => {
            els.settingsModal.hidden = true;
        });

        els.btnSaveSettings.addEventListener('click', () => {
            localStorage.setItem('ttsBackend', els.ttsBackendSelect.value);
            
            const key = els.fishApiKeyInput.value.trim();
            if (key) localStorage.setItem('fishApiKey', key);
            else localStorage.removeItem('fishApiKey');

            const localUrl = els.localApiUrlInput.value.trim();
            if (localUrl) localStorage.setItem('localApiUrl', localUrl);

            showToast('Đã lưu cài đặt AI!', 'success');
            els.settingsModal.hidden = true;
        });
    }

    // ─── Browser Compatibility Check ─────────────────────────────────
    function checkBrowserSupport() {
        const hasSpeechSynthesis = 'speechSynthesis' in window;
        const hasWebAudio = 'AudioContext' in window || 'webkitAudioContext' in window;

        if (hasSpeechSynthesis && hasWebAudio) {
            els.browserBadge.classList.add('badge-success');
            els.browserStatus.textContent = 'Trình duyệt hỗ trợ đầy đủ';
        } else {
            els.browserBadge.classList.add('badge-warning');
            els.browserStatus.textContent = `Thiếu Web Audio hoặc Speech Synthesis`;
            showToast('Trình duyệt không hỗ trợ đầy đủ. Vui lòng dùng Chrome, Edge hoặc Safari mới nhất.', 'warning');
        }
        return hasSpeechSynthesis && hasWebAudio;
    }

    // ─── Populate Source Language Dropdown ────────────────────────────
    function loadSourceLanguages() {
        if (!els.sourceLang) return;

        els.sourceLang.innerHTML = '';
        LANGUAGES.forEach((lang) => {
            const opt = document.createElement('option');
            opt.value = lang.code;
            opt.textContent = lang.label;
            els.sourceLang.appendChild(opt);
        });

        // Mặc định chọn Tiếng Anh (Mỹ)
        els.sourceLang.value = 'en-US';
    }

    // ─── Load Vietnamese Voices ──────────────────────────────────────
    function selectBestVietVoice(voices) {
        if (!voices || voices.length === 0) return null;
        // Ưu tiên giọng nữ HoaiMy (rất phổ biến trên Chrome tiếng Việt)
        const femaleKeywords = /hoaim|female|woman|girl|thu\b|my\b|lan\b|huong|mai|linh/i;
        return voices.find(v => femaleKeywords.test(v.name)) || voices[0];
    }

    function loadVoices() {
        const allVoices = state.synth ? state.synth.getVoices() : [];
        const vnVoices = allVoices.filter(v => v.lang.startsWith('vi'));
        
        if (vnVoices.length === 0) {
            // Giọng VN chưa load xong, đợi event voiceschanged sẽ gọi lại
            return;
        }
        
        state.vnVoices = vnVoices;
        els.vnVoice.innerHTML = '';
        vnVoices.forEach((voice, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${voice.name} (${voice.lang})`;
            els.vnVoice.appendChild(opt);
        });

        const best = selectBestVietVoice(vnVoices);
        state.selectedVoice = best;
        const idx = vnVoices.indexOf(best);
        if (idx >= 0) els.vnVoice.value = idx;
        
        console.log('✅ Giọng nữ được chọn:', best?.name);
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
    // ─── Whisper AI Recognition ─────────────────────────────────────────
    let whisperPipeline = null;

    async function loadWhisper() {
        if (whisperPipeline) return whisperPipeline;

        try {
            updateProgress(0, 'Đang tải thư viện Transformers.js...');
            const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
            
            // Tối ưu môi trường cho trình duyệt
            env.allowLocalModels = false;
            
            updateProgress(10, 'Đang chuẩn bị mô hình Whisper AI...');
            
            whisperPipeline = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
                progress_callback: (data) => {
                    if (data.status === 'progress') {
                        const loaded = Math.round(data.progress);
                        updateProgress(loaded, `Đang tải bộ não AI: ${loaded}% (Lần đầu sẽ mất vài phút)`);
                    }
                }
            });
            
            return whisperPipeline;
        } catch (error) {
            console.error('Failed to load Whisper:', error);
            throw new Error('Không thể tải mô hình AI. Vui lòng kiểm tra kết nối mạng.');
        }
    }

    async function extractAudio(videoUrl) {
        updateProgress(50, 'Đang trích xuất âm thanh từ video...');
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext({ sampleRate: 16000 });
            
            const response = await fetch(videoUrl);
            const arrayBuffer = await response.arrayBuffer();
            
            updateProgress(80, 'Đang giải mã âm thanh...');
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            
            // Whisper yêu cầu Float32Array ở 16kHz
            return audioBuffer.getChannelData(0);
        } catch (error) {
            console.error('Audio extraction error:', error);
            throw new Error('Không thể đọc âm thanh từ video này. Hãy thử video khác.');
        }
    }

    async function startWhisperRecognition() {
        const transcriber = await loadWhisper();
        
        const audioData = await extractAudio(state.videoURL);
        
        updateStatus('processing', 'AI Đang Nhận Dạng...');
        updateProgress(90, 'Đang phân tích giọng nói (Quá trình này phụ thuộc vào máy tính của bạn)...');

        const lang = els.sourceLang.value; // e.g. "en-US"
        const langCode = lang.split('-')[0]; // "en"

        const output = await transcriber(audioData, {
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: true,
            language: langCode,
            task: 'transcribe',
        });

        if (!output.chunks || output.chunks.length === 0) {
            // Nếu không có chunks, thử tự tạo chunk từ text
            if (output.text && output.text.trim().length > 0) {
                return [{
                    id: generateId(),
                    startTime: 0,
                    endTime: els.videoPlayer.duration || 5,
                    originalText: output.text.trim(),
                    vietnameseText: '',
                }];
            }
            throw new Error('Không nhận diện được giọng nói nào trong video.');
        }

        const results = output.chunks.map(chunk => {
            return {
                id: generateId(),
                startTime: chunk.timestamp[0],
                endTime: chunk.timestamp[1] || (chunk.timestamp[0] + 3), // fallback 3 giây nếu không có end
                originalText: chunk.text.trim(),
                vietnameseText: '',
            };
        });

        // Lọc bỏ câu trống
        return results.filter(r => r.originalText.length > 0);
    }

    // ─── Translation ─────────────────────────────────────────────────
    async function translateText(text, sourceLang) {
        // Lấy mã ngôn ngữ MyMemory tương ứng với mã Speech Recognition
        const from = getLangByCode(sourceLang).trCode;
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
    async function getFishAudioStream(text, apiKey) {
        const response = await fetch('https://api.fish.audio/v1/tts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                reference_id: "86ad223631bc4d278c2bbb780bb60d31"
            })
        });

        if (!response.ok) {
            throw new Error(`Fish Audio Error: ${response.status}`);
        }
        
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }

    async function getLocalAudioStream(text, localUrl) {
        // Applio Gradio API (/run/enforce_terms)
        const baseUrl = localUrl.replace(/\/$/, ""); // Remove trailing slash
        let apiUrl = baseUrl;
        
        // Auto-fix URL if user just entered http://127.0.0.1:6969
        if (!apiUrl.includes("/run/enforce_terms") && !apiUrl.includes("/api/predict")) {
            apiUrl = baseUrl + "/run/enforce_terms";
        }

        const payload = {
            data: [
                true, // terms_checkbox
                "",   // input_tts_path
                text, // tts_text
                "vi-VN-HoaiMyNeural", // tts_voice
                0,    // tts_rate
                els.animeVoiceToggle.checked ? 6 : 0, // pitch (pitch up slightly for anime)
                0.75, // index_rate
                1,    // rms_mix_rate
                0.5,  // protect
                "rmvpe", // f0_method
                "",   // output_tts_path
                "",   // output_rvc_path
                "Kurumi.pth", // model_file (User must put this in logs)
                "added_IVF354_Flat_nprobe_1_Kurumi_v2.index", // index_file
                false, // split_audio
                false, // autotune
                1,     // autotune_strength
                false, // proposed_pitch
                0.9,   // proposed_pitch_threshold
                false, // clean_audio
                0.7,   // clean_strength
                "mp3", // export_format
                "contentvec", // embedder_model
                "",    // embedder_model_custom
                0      // sid
            ]
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Applio Local API Error: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Gradio returns { data: ["Success message", { name: "/path/to/file.mp3", ... }] }
        if (!result.data || !result.data[1] || !result.data[1].name) {
            console.error("Lỗi parse API Applio:", result);
            throw new Error("Không nhận được file âm thanh từ Applio");
        }

        const audioFilePath = result.data[1].name;
        // Fetch the actual audio file from Gradio's /file= endpoint
        const audioResponse = await fetch(`${baseUrl}/file=${audioFilePath}`);
        
        if (!audioResponse.ok) {
            throw new Error("Không thể tải file âm thanh từ Gradio server");
        }

        const blob = await audioResponse.blob();
        return URL.createObjectURL(blob);
    }

    function fallbackTTS(text, resolve) {
        // Fallback cuối cùng: Google TTS giọng nữ (khi Applio chưa bật)
        const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=vi&client=gtx&q=${encodeURIComponent(text)}`;
        const audio = new Audio(ttsUrl);
        audio.playbackRate = parseFloat(state.speechRate) || 1;
        
        state.currentAudio = audio;
        audio.onended = () => { state.currentAudio = null; resolve(); };
        audio.onerror = () => {
            // Cuối cùng dùng Web Speech (giọng nữ đã chọn)
            if (!state.synth) { resolve(); return; }
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'vi-VN';
            utterance.rate = parseFloat(state.speechRate) || 1;
            utterance.pitch = 1.2;
            utterance.volume = 1;
            if (state.selectedVoice) utterance.voice = state.selectedVoice;
            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();
            state.synth.speak(utterance);
        };
        audio.play().catch(() => audio.onerror());
    }

    function speakVietnamese(text) {
        return new Promise(async (resolve) => {
            let resolved = false;
            const safeResolve = () => { if (!resolved) { resolved = true; resolve(); } };

            if (state.currentAudio) {
                state.currentAudio.pause();
                state.currentAudio = null;
            }

            const ttsBackend = localStorage.getItem('ttsBackend') || 'local';
            const localApiUrl = localStorage.getItem('localApiUrl') || 'http://127.0.0.1:6969';
            const fishApiKey = localStorage.getItem('fishApiKey');

            try {
                let audioUrl = null;

                // Ưu tiên 1: Kurumi Local AI (Applio)
                if (ttsBackend === 'local') {
                    try {
                        audioUrl = await getLocalAudioStream(text, localApiUrl);
                    } catch (e) {
                        console.warn('⚠️ Applio chưa bật hoặc lỗi, lùi về Google TTS:', e.message);
                    }
                }

                // Ưu tiên 2: Fish Audio
                if (!audioUrl && ttsBackend === 'fish' && fishApiKey) {
                    try {
                        audioUrl = await getFishAudioStream(text, fishApiKey);
                    } catch (e) {
                        console.warn('⚠️ Fish Audio lỗi, lùi về Google TTS:', e.message);
                    }
                }

                // Nếu có audio từ AI (Kurumi hoặc Fish)
                if (audioUrl) {
                    const audio = new Audio(audioUrl);
                    audio.playbackRate = parseFloat(state.speechRate) || 1;
                    state.currentAudio = audio;

                    audio.onended = () => {
                        state.currentAudio = null;
                        URL.revokeObjectURL(audioUrl);
                        safeResolve();
                    };
                    audio.onerror = () => {
                        console.warn('Lỗi phát audio Kurumi, lùi về Google TTS');
                        fallbackTTS(text, safeResolve);
                    };
                    audio.play().catch(() => fallbackTTS(text, safeResolve));
                    return;
                }

                // Dự phòng: Google TTS giọng nữ
                fallbackTTS(text, safeResolve);

            } catch (error) {
                console.error(error);
                fallbackTTS(text, safeResolve);
            }
        });
    }

    async function playVietnameseAudio() {
        if (state.segments.length === 0) {
            showToast('Chưa có nội dung để phát. Vui lòng dịch video trước.', 'warning');
            return;
        }

        state.isVNPlaying = !state.isVNPlaying;

        if (!state.isVNPlaying) {
            if (state.currentAudio) {
                state.currentAudio.pause();
                state.currentAudio = null;
            }
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

        // KHÔNG mute video gốc — để âm thanh gốc chạy song song với giọng Việt
        // (Nếu muốn tắt tiếng gốc, dùng nút "Tắt/Bật Tiếng Gốc" riêng)
        els.videoPlayer.currentTime = 0;
        if (els.videoPlayer.paused) els.videoPlayer.play();

        for (let i = 0; i < state.segments.length; i++) {
            if (!state.isVNPlaying) break;

            const seg = state.segments[i];
            highlightSegment(seg.id);

            // Đợi video đến đúng thời điểm phát của đoạn này
            els.videoPlayer.currentTime = seg.startTime;

            // Cập nhật phụ đề
            els.subtitleOriginal.textContent = seg.originalText;
            els.subtitleVietnamese.textContent = seg.vietnameseText;
            els.subtitleOverlay.classList.add('visible');

            // Phát tiếng Việt song song với video
            if (seg.vietnameseText && !seg.vietnameseText.startsWith('[Lỗi')) {
                await speakVietnamese(seg.vietnameseText);
            }

            // Khoảng ngắng ngắn giữa các đoạn
            await delay(200);
        }

        state.isVNPlaying = false;
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
            updateStatus('processing', 'Khởi động AI...');
            
            const rawSegments = await startWhisperRecognition();

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
        loadSourceLanguages();

        // Load voices: Chrome cần event voiceschanged mới có danh sách giọng
        if (state.synth) {
            // Thử load ngay
            loadVoices();
            // Lắng nghe khi danh sách giọng được load xong (bắt buộc với Chrome)
            state.synth.addEventListener('voiceschanged', () => {
                loadVoices();
            });
            // Thử lần nữa sau 500ms đề phòng Edge/Firefox
            setTimeout(loadVoices, 500);
        }

        initUpload();
        initVideoControls();
        bindEvents();
        initAnimations();

        console.log('✨ VietDub khởi động thành công!');
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();