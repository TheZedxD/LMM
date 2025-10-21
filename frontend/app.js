// LMM Video Editor - Main Application
class VideoEditor {
    constructor() {
        this.mediaItems = [];
        this.timelineClips = [];
        this.selectedClip = null;
        this.zoom = 1;
        this.pixelsPerSecond = 50;
        this.isPlaying = false;
        this.currentTime = 0;
        this.socket = null;
        this.projectId = null;
        this.projectName = 'Untitled Project';

        this.init();
    }

    init() {
        // Initialize Socket.io
        this.socket = io();

        // DOM Elements
        this.elements = {
            uploadBtn: document.getElementById('uploadBtn'),
            fileInput: document.getElementById('fileInput'),
            mediaLibrary: document.getElementById('mediaLibrary'),
            videoPreview: document.getElementById('videoPreview'),
            previewPlayer: document.getElementById('previewPlayer'),
            timeline: document.getElementById('timeline'),
            videoTrack: document.querySelector('[data-track-type="video"]'),
            audioTrack: document.querySelector('[data-track-type="audio"]'),
            playBtn: document.getElementById('playBtn'),
            pauseBtn: document.getElementById('pauseBtn'),
            stopBtn: document.getElementById('stopBtn'),
            exportBtn: document.getElementById('exportBtn'),
            exportModal: document.getElementById('exportModal'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            propertiesContent: document.getElementById('propertiesContent'),
            playhead: document.getElementById('playhead'),
            currentTime: document.getElementById('currentTime'),
            totalTime: document.getElementById('totalTime'),
            zoomIn: document.getElementById('zoomIn'),
            zoomOut: document.getElementById('zoomOut'),
            clearTimeline: document.getElementById('clearTimeline'),
            newProject: document.getElementById('newProject'),
            saveProject: document.getElementById('saveProject'),
            loadProject: document.getElementById('loadProject'),
            loadProjectModal: document.getElementById('loadProjectModal'),
            projectsList: document.getElementById('projectsList')
        };

        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupDragAndDrop();
        this.drawTimelineRuler();
    }

    setupEventListeners() {
        // Upload
        this.elements.uploadBtn.addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        this.elements.fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // Playback controls
        this.elements.playBtn.addEventListener('click', () => this.play());
        this.elements.pauseBtn.addEventListener('click', () => this.pause());
        this.elements.stopBtn.addEventListener('click', () => this.stop());

        // Timeline controls
        this.elements.zoomIn.addEventListener('click', () => this.zoomTimeline(1.2));
        this.elements.zoomOut.addEventListener('click', () => this.zoomTimeline(0.8));
        this.elements.clearTimeline.addEventListener('click', () => this.clearTimeline());

        // Export
        this.elements.exportBtn.addEventListener('click', () => this.showExportModal());
        document.querySelector('.close-modal').addEventListener('click', () => this.hideExportModal());
        document.getElementById('cancelExport').addEventListener('click', () => this.hideExportModal());
        document.getElementById('startExport').addEventListener('click', () => this.exportVideo());

        // New Project
        this.elements.newProject.addEventListener('click', () => this.newProject());

        // Save/Load Project
        this.elements.saveProject.addEventListener('click', () => this.saveProject());
        this.elements.loadProject.addEventListener('click', () => this.showLoadProjectModal());

        // Modal close buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = btn.dataset.modal;
                if (modalId) {
                    document.getElementById(modalId).classList.remove('active');
                }
            });
        });

        // Preview player events
        this.elements.previewPlayer.addEventListener('timeupdate', () => this.updatePlayhead());
        this.elements.previewPlayer.addEventListener('ended', () => this.onVideoEnded());

        // Socket events
        this.socket.on('export-progress', (data) => {
            this.updateExportProgress(data.percent);
        });

        // Drag and drop on media library
        this.elements.mediaLibrary.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.mediaLibrary.classList.add('drag-over');
        });

        this.elements.mediaLibrary.addEventListener('dragleave', () => {
            this.elements.mediaLibrary.classList.remove('drag-over');
        });

        this.elements.mediaLibrary.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.mediaLibrary.classList.remove('drag-over');
            this.handleFileUpload(e.dataTransfer.files);
        });
    }

    setupDragAndDrop() {
        // Enable drag from media library to timeline
        this.elements.mediaLibrary.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('media-item')) {
                e.dataTransfer.setData('mediaId', e.target.dataset.mediaId);
                e.target.classList.add('dragging');
            }
        });

        this.elements.mediaLibrary.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
        });

        // Timeline drop zones
        [this.elements.videoTrack, this.elements.audioTrack].forEach(track => {
            track.addEventListener('dragover', (e) => {
                e.preventDefault();
                track.classList.add('drag-over');
            });

            track.addEventListener('dragleave', () => {
                track.classList.remove('drag-over');
            });

            track.addEventListener('drop', (e) => {
                e.preventDefault();
                track.classList.remove('drag-over');

                const mediaId = e.dataTransfer.getData('mediaId');
                if (mediaId) {
                    const rect = track.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const time = x / this.pixelsPerSecond;
                    this.addClipToTimeline(mediaId, track.dataset.trackType, time);
                }
            });
        });
    }

    async handleFileUpload(files) {
        this.showLoading();

        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const mediaItem = await response.json();
                    this.addMediaItem(mediaItem);
                } else {
                    alert('Failed to upload: ' + file.name);
                }
            } catch (error) {
                console.error('Upload error:', error);
                alert('Error uploading file: ' + error.message);
            }
        }

        this.hideLoading();
        this.elements.fileInput.value = '';
    }

    addMediaItem(item) {
        this.mediaItems.push(item);

        // Remove empty state if present
        const emptyState = this.elements.mediaLibrary.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        // Create media item element
        const mediaEl = document.createElement('div');
        mediaEl.className = 'media-item';
        mediaEl.draggable = true;
        mediaEl.dataset.mediaId = item.id;

        const thumbnail = item.thumbnail || item.path;
        const duration = this.formatTime(item.duration || 0);

        mediaEl.innerHTML = `
            ${item.type === 'audio' ?
                `<div class="media-thumbnail" style="display: flex; align-items: center; justify-content: center; background: #2d2d2d;">
                    <span style="font-size: 2rem;">🎵</span>
                </div>` :
                `<img src="${thumbnail}" class="media-thumbnail" alt="${item.originalName}">`
            }
            <div class="media-info">
                <div class="media-name" title="${item.originalName}">${item.originalName}</div>
                <div class="media-duration">${duration}</div>
            </div>
        `;

        this.elements.mediaLibrary.appendChild(mediaEl);
    }

    addClipToTimeline(mediaId, trackType, startTime) {
        const mediaItem = this.mediaItems.find(m => m.id === mediaId);
        if (!mediaItem) return;

        // Check if media type matches track
        if (trackType === 'video' && mediaItem.type === 'audio') {
            // Move to audio track instead
            trackType = 'audio';
        }

        const clip = {
            id: this.generateId(),
            mediaId: mediaId,
            type: mediaItem.type,
            start: Math.max(0, startTime),
            duration: mediaItem.duration || 5,
            trimStart: 0,
            trimEnd: mediaItem.duration || 5,
            track: trackType
        };

        this.timelineClips.push(clip);
        this.renderTimelineClip(clip);
        this.updateTimelineDuration();
    }

    renderTimelineClip(clip) {
        const mediaItem = this.mediaItems.find(m => m.id === clip.mediaId);
        if (!mediaItem) return;

        const track = clip.track === 'video' ? this.elements.videoTrack : this.elements.audioTrack;

        const clipEl = document.createElement('div');
        clipEl.className = `timeline-clip ${clip.type}`;
        clipEl.dataset.clipId = clip.id;

        const width = clip.duration * this.pixelsPerSecond;
        const left = clip.start * this.pixelsPerSecond;

        clipEl.style.width = width + 'px';
        clipEl.style.left = left + 'px';

        clipEl.innerHTML = `
            <div class="clip-content">
                <div class="clip-name">${mediaItem.originalName}</div>
                <div class="clip-duration">${this.formatTime(clip.duration)}</div>
            </div>
            <div class="clip-handle left"></div>
            <div class="clip-handle right"></div>
        `;

        // Click to select
        clipEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectClip(clip.id);
        });

        // Make draggable
        this.makeClipDraggable(clipEl, clip);

        // Make resizable
        this.makeClipResizable(clipEl, clip);

        track.appendChild(clipEl);
    }

    makeClipDraggable(clipEl, clip) {
        let isDragging = false;
        let startX = 0;
        let startLeft = 0;

        const onMouseDown = (e) => {
            if (e.target.classList.contains('clip-handle')) return;

            isDragging = true;
            startX = e.clientX;
            startLeft = clip.start * this.pixelsPerSecond;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);

            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const newLeft = Math.max(0, startLeft + deltaX);
            const newStart = newLeft / this.pixelsPerSecond;

            clip.start = newStart;
            clipEl.style.left = newLeft + 'px';
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            this.updateProperties();
        };

        clipEl.addEventListener('mousedown', onMouseDown);
    }

    makeClipResizable(clipEl, clip) {
        const leftHandle = clipEl.querySelector('.clip-handle.left');
        const rightHandle = clipEl.querySelector('.clip-handle.right');

        let isResizing = false;
        let resizeType = null;
        let startX = 0;
        let startWidth = 0;
        let startLeft = 0;

        const onMouseDown = (e, type) => {
            isResizing = true;
            resizeType = type;
            startX = e.clientX;
            startWidth = clip.duration * this.pixelsPerSecond;
            startLeft = clip.start * this.pixelsPerSecond;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);

            e.stopPropagation();
            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!isResizing) return;

            const deltaX = e.clientX - startX;
            const mediaItem = this.mediaItems.find(m => m.id === clip.mediaId);
            const maxDuration = mediaItem ? mediaItem.duration : clip.duration;

            if (resizeType === 'right') {
                const newWidth = Math.max(20, startWidth + deltaX);
                const newDuration = Math.min(maxDuration - clip.trimStart, newWidth / this.pixelsPerSecond);

                clip.duration = newDuration;
                clip.trimEnd = clip.trimStart + newDuration;

                clipEl.style.width = (newDuration * this.pixelsPerSecond) + 'px';
            } else if (resizeType === 'left') {
                const newLeft = Math.max(0, startLeft + deltaX);
                const widthChange = newLeft - startLeft;
                const newWidth = Math.max(20, startWidth - widthChange);

                const newStart = newLeft / this.pixelsPerSecond;
                const newDuration = newWidth / this.pixelsPerSecond;
                const trimChange = (startLeft - newLeft) / this.pixelsPerSecond;

                if (clip.trimStart + trimChange >= 0 && clip.trimStart + trimChange + newDuration <= maxDuration) {
                    clip.start = newStart;
                    clip.duration = newDuration;
                    clip.trimStart += trimChange;
                    clip.trimEnd = clip.trimStart + newDuration;

                    clipEl.style.left = newLeft + 'px';
                    clipEl.style.width = (newDuration * this.pixelsPerSecond) + 'px';
                }
            }

            this.updateClipDisplay(clipEl, clip);
        };

        const onMouseUp = () => {
            isResizing = false;
            resizeType = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            this.updateProperties();
        };

        leftHandle.addEventListener('mousedown', (e) => onMouseDown(e, 'left'));
        rightHandle.addEventListener('mousedown', (e) => onMouseDown(e, 'right'));
    }

    updateClipDisplay(clipEl, clip) {
        const durationEl = clipEl.querySelector('.clip-duration');
        if (durationEl) {
            durationEl.textContent = this.formatTime(clip.duration);
        }
    }

    selectClip(clipId) {
        // Remove previous selection
        document.querySelectorAll('.timeline-clip').forEach(el => {
            el.classList.remove('selected');
        });

        // Select new clip
        const clipEl = document.querySelector(`[data-clip-id="${clipId}"]`);
        if (clipEl) {
            clipEl.classList.add('selected');
        }

        this.selectedClip = this.timelineClips.find(c => c.id === clipId);
        this.updateProperties();
    }

    updateProperties() {
        if (!this.selectedClip) {
            this.elements.propertiesContent.innerHTML = `
                <div class="empty-state-small">
                    <p>Select a clip to edit properties</p>
                </div>
            `;
            return;
        }

        const clip = this.selectedClip;
        const mediaItem = this.mediaItems.find(m => m.id === clip.mediaId);

        this.elements.propertiesContent.innerHTML = `
            <div class="property-group">
                <h3>Clip Information</h3>
                <div class="property-item">
                    <label>Name:</label>
                    <input type="text" value="${mediaItem ? mediaItem.originalName : 'Unknown'}" readonly>
                </div>
                <div class="property-item">
                    <label>Type:</label>
                    <input type="text" value="${clip.type}" readonly>
                </div>
            </div>
            <div class="property-group">
                <h3>Timing</h3>
                <div class="property-item">
                    <label>Start Time (s):</label>
                    <input type="number" id="clipStart" value="${clip.start.toFixed(2)}" step="0.1" min="0">
                </div>
                <div class="property-item">
                    <label>Duration (s):</label>
                    <input type="number" id="clipDuration" value="${clip.duration.toFixed(2)}" step="0.1" min="0.1">
                </div>
            </div>
            <div class="property-group">
                <h3>Trimming</h3>
                <div class="property-item">
                    <label>Trim Start (s):</label>
                    <input type="number" id="clipTrimStart" value="${clip.trimStart.toFixed(2)}" step="0.1" min="0">
                </div>
                <div class="property-item">
                    <label>Trim End (s):</label>
                    <input type="number" id="clipTrimEnd" value="${clip.trimEnd.toFixed(2)}" step="0.1">
                </div>
            </div>
            <div class="property-group">
                <button id="deleteClip" class="btn btn-secondary" style="width: 100%;">Delete Clip</button>
            </div>
        `;

        // Add event listeners for property changes
        document.getElementById('clipStart').addEventListener('change', (e) => {
            clip.start = parseFloat(e.target.value);
            this.refreshTimeline();
        });

        document.getElementById('clipDuration').addEventListener('change', (e) => {
            const newDuration = parseFloat(e.target.value);
            clip.duration = newDuration;
            clip.trimEnd = clip.trimStart + newDuration;
            this.refreshTimeline();
        });

        document.getElementById('deleteClip').addEventListener('click', () => {
            this.deleteClip(clip.id);
        });
    }

    deleteClip(clipId) {
        this.timelineClips = this.timelineClips.filter(c => c.id !== clipId);
        this.selectedClip = null;
        this.refreshTimeline();
        this.updateProperties();
    }

    refreshTimeline() {
        // Clear and redraw all clips
        this.elements.videoTrack.innerHTML = '';
        this.elements.audioTrack.innerHTML = '';

        this.timelineClips.forEach(clip => {
            this.renderTimelineClip(clip);
        });

        this.updateTimelineDuration();
    }

    updateTimelineDuration() {
        let maxDuration = 0;
        this.timelineClips.forEach(clip => {
            const endTime = clip.start + clip.duration;
            if (endTime > maxDuration) {
                maxDuration = endTime;
            }
        });

        this.elements.totalTime.textContent = this.formatTime(maxDuration);
    }

    play() {
        if (this.timelineClips.length === 0) {
            alert('Add clips to the timeline first');
            return;
        }

        // For now, play the first video clip
        const firstVideoClip = this.timelineClips.find(c => c.type === 'video');
        if (firstVideoClip) {
            const mediaItem = this.mediaItems.find(m => m.id === firstVideoClip.mediaId);
            if (mediaItem) {
                this.elements.previewPlayer.src = mediaItem.path;
                this.elements.previewPlayer.currentTime = firstVideoClip.trimStart;
                this.elements.previewPlayer.classList.add('active');
                this.elements.previewPlayer.play();
                this.isPlaying = true;
            }
        }
    }

    pause() {
        this.elements.previewPlayer.pause();
        this.isPlaying = false;
    }

    stop() {
        this.elements.previewPlayer.pause();
        this.elements.previewPlayer.currentTime = 0;
        this.isPlaying = false;
        this.elements.playhead.style.left = '80px';
    }

    updatePlayhead() {
        if (!this.isPlaying) return;

        const currentTime = this.elements.previewPlayer.currentTime;
        this.elements.currentTime.textContent = this.formatTime(currentTime);

        // Update playhead position
        const position = 80 + (currentTime * this.pixelsPerSecond);
        this.elements.playhead.style.left = position + 'px';
    }

    onVideoEnded() {
        this.isPlaying = false;
        // Could implement playing next clip here
    }

    zoomTimeline(factor) {
        this.zoom *= factor;
        this.pixelsPerSecond *= factor;
        this.refreshTimeline();
        this.drawTimelineRuler();
    }

    drawTimelineRuler() {
        const ruler = document.getElementById('timelineRuler');
        ruler.innerHTML = '';

        const width = 2000;
        const secondWidth = this.pixelsPerSecond;
        const numMarkers = Math.floor(width / secondWidth);

        for (let i = 0; i <= numMarkers; i++) {
            const marker = document.createElement('div');
            marker.style.position = 'absolute';
            marker.style.left = (i * secondWidth) + 'px';
            marker.style.top = '0';
            marker.style.width = '1px';
            marker.style.height = i % 5 === 0 ? '20px' : '10px';
            marker.style.background = '#666';

            if (i % 5 === 0) {
                const label = document.createElement('span');
                label.textContent = this.formatTime(i);
                label.style.position = 'absolute';
                label.style.left = (i * secondWidth + 3) + 'px';
                label.style.top = '0';
                label.style.fontSize = '10px';
                label.style.color = '#999';
                ruler.appendChild(label);
            }

            ruler.appendChild(marker);
        }
    }

    clearTimeline() {
        if (confirm('Clear all clips from timeline?')) {
            this.timelineClips = [];
            this.selectedClip = null;
            this.refreshTimeline();
            this.updateProperties();
        }
    }

    newProject() {
        if (confirm('Start a new project? This will clear all media and timeline clips.')) {
            this.mediaItems = [];
            this.timelineClips = [];
            this.selectedClip = null;

            // Clear media library
            this.elements.mediaLibrary.innerHTML = `
                <div class="empty-state">
                    <p>📁</p>
                    <p>Drag and drop media files here<br>or click "Add Media"</p>
                </div>
            `;

            // Clear timeline
            this.refreshTimeline();
            this.updateProperties();

            // Stop preview
            this.stop();
        }
    }

    showExportModal() {
        if (this.timelineClips.length === 0) {
            alert('Add clips to the timeline before exporting');
            return;
        }
        this.elements.exportModal.classList.add('active');
    }

    hideExportModal() {
        this.elements.exportModal.classList.remove('active');
    }

    async exportVideo() {
        const filename = document.getElementById('exportFilename').value || 'my-video';
        const format = document.getElementById('exportFormat').value;
        const quality = document.getElementById('exportQuality').value;

        document.getElementById('exportProgress').style.display = 'block';
        document.getElementById('startExport').disabled = true;

        // Prepare clips data
        const clips = this.timelineClips.map(clip => {
            const mediaItem = this.mediaItems.find(m => m.id === clip.mediaId);
            return {
                path: mediaItem.path,
                type: clip.type,
                start: clip.trimStart,
                end: clip.trimEnd,
                duration: clip.duration,
                timelineStart: clip.start
            };
        });

        try {
            const response = await fetch('/api/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clips: clips,
                    settings: {
                        format: format,
                        quality: quality,
                        filename: filename
                    }
                })
            });

            if (response.ok) {
                const result = await response.json();

                // Download the file
                const link = document.createElement('a');
                link.href = result.path;
                link.download = result.filename;
                link.click();

                alert('Video exported successfully!');
                this.hideExportModal();
            } else {
                const error = await response.json();
                alert('Export failed: ' + error.error);
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('Export failed: ' + error.message);
        } finally {
            document.getElementById('exportProgress').style.display = 'none';
            document.getElementById('startExport').disabled = false;
        }
    }

    updateExportProgress(percent) {
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');

        if (progressFill && progressText) {
            progressFill.style.width = percent + '%';
            progressText.textContent = Math.round(percent) + '%';
        }
    }

    showLoading() {
        this.elements.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.elements.loadingOverlay.style.display = 'none';
    }

    formatTime(seconds) {
        if (isNaN(seconds) || seconds === undefined) return '00:00';

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S - Save Project
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveProject();
            }

            // Ctrl/Cmd + O - Load Project
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                this.showLoadProjectModal();
            }

            // Ctrl/Cmd + N - New Project
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.newProject();
            }

            // Space - Play/Pause
            if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                if (this.isPlaying) {
                    this.pause();
                } else {
                    this.play();
                }
            }

            // Delete - Delete selected clip
            if (e.key === 'Delete' && this.selectedClip) {
                this.deleteClip(this.selectedClip.id);
            }

            // + - Zoom in
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                this.zoomTimeline(1.2);
            }

            // - - Zoom out
            if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.zoomTimeline(0.8);
            }
        });
    }

    async saveProject() {
        const projectData = {
            id: this.projectId || this.generateId(),
            name: this.projectName,
            created: new Date().toISOString(),
            mediaItems: this.mediaItems,
            timelineClips: this.timelineClips,
            settings: {
                zoom: this.zoom,
                pixelsPerSecond: this.pixelsPerSecond
            }
        };

        try {
            const response = await fetch('/api/project/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: projectData })
            });

            if (response.ok) {
                const result = await response.json();
                this.projectId = result.projectId;
                alert('Project saved successfully!');
            } else {
                alert('Failed to save project');
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Error saving project: ' + error.message);
        }
    }

    async showLoadProjectModal() {
        this.elements.loadProjectModal.classList.add('active');

        try {
            const response = await fetch('/api/project/list');
            if (response.ok) {
                const { projects } = await response.json();

                if (projects.length === 0) {
                    this.elements.projectsList.innerHTML = `
                        <p style="text-align: center; color: #666;">No saved projects found</p>
                    `;
                    return;
                }

                this.elements.projectsList.innerHTML = projects.map(project => `
                    <div class="project-item" data-project-id="${project.id}">
                        <div class="project-item-name">${project.name}</div>
                        <div class="project-item-meta">
                            Modified: ${new Date(project.modified).toLocaleDateString()}
                        </div>
                    </div>
                `).join('');

                // Add click handlers
                document.querySelectorAll('.project-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const projectId = item.dataset.projectId;
                        this.loadProject(projectId);
                    });
                });
            }
        } catch (error) {
            console.error('Load projects error:', error);
            this.elements.projectsList.innerHTML = `
                <p style="text-align: center; color: #ff5555;">Error loading projects</p>
            `;
        }
    }

    async loadProject(projectId) {
        try {
            const response = await fetch(`/api/project/load/${projectId}`);

            if (response.ok) {
                const projectData = await response.json();

                this.projectId = projectData.id;
                this.projectName = projectData.name;
                this.mediaItems = projectData.mediaItems || [];
                this.timelineClips = projectData.timelineClips || [];

                if (projectData.settings) {
                    this.zoom = projectData.settings.zoom || 1;
                    this.pixelsPerSecond = projectData.settings.pixelsPerSecond || 50;
                }

                // Rebuild UI
                this.rebuildMediaLibrary();
                this.refreshTimeline();
                this.updateProperties();

                this.elements.loadProjectModal.classList.remove('active');
                alert('Project loaded successfully!');
            } else {
                alert('Failed to load project');
            }
        } catch (error) {
            console.error('Load project error:', error);
            alert('Error loading project: ' + error.message);
        }
    }

    rebuildMediaLibrary() {
        this.elements.mediaLibrary.innerHTML = '';

        if (this.mediaItems.length === 0) {
            this.elements.mediaLibrary.innerHTML = `
                <div class="empty-state">
                    <p>📁</p>
                    <p>Drag and drop media files here<br>or click "Add Media"</p>
                </div>
            `;
            return;
        }

        this.mediaItems.forEach(item => {
            const mediaEl = document.createElement('div');
            mediaEl.className = 'media-item';
            mediaEl.draggable = true;
            mediaEl.dataset.mediaId = item.id;

            const thumbnail = item.thumbnail || item.path;
            const duration = this.formatTime(item.duration || 0);

            mediaEl.innerHTML = `
                ${item.type === 'audio' ?
                    `<div class="media-thumbnail" style="display: flex; align-items: center; justify-content: center; background: #2d2d2d;">
                        <span style="font-size: 2rem;">🎵</span>
                    </div>` :
                    `<img src="${thumbnail}" class="media-thumbnail" alt="${item.originalName}">`
                }
                <div class="media-info">
                    <div class="media-name" title="${item.originalName}">${item.originalName}</div>
                    <div class="media-duration">${duration}</div>
                </div>
            `;

            this.elements.mediaLibrary.appendChild(mediaEl);
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.videoEditor = new VideoEditor();
});
