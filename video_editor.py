#!/usr/bin/env python3
"""
video_editor.py
================

This module implements a lightweight, personal video editor for Linux using
PyQt5 and FFmpeg.  The program is designed to evoke the feel of Windows
Movie\u00a0Maker from the Windows\u00a0XP era while taking advantage of modern
technologies.  It allows the user to import video, audio and image files via
drag\u2011and\u2011drop, arrange them on a timeline, preview the composition and
export the final edit to an MP4 file.  Projects can be saved and restored
later, and a simple settings dialog lets the user configure workspace and
output directories.

The editor is non\u2011destructive: instead of cutting the original media files
into pieces, each clip is represented internally by an in\u2011point, out\u2011point
and start time.  This makes editing extremely fast.  Exporting and thumbnail
generation are delegated to FFmpeg via subprocess calls.  If FFmpeg is not
installed on the system, many advanced features will not work, but the
program still loads and the user will be informed of any missing
dependencies.

The code is organised into several classes:

* ``MediaItem`` wraps a media file on disk and stores its type and thumbnail.
* ``Clip`` represents a segment of a media item on the timeline.
* ``Project`` encapsulates the list of media items, the timeline tracks and
  various settings.  It knows how to save to and load from JSON.
* ``MediaLibraryWidget`` displays imported media in a list with thumbnails
  and supports dragging items onto the timeline.
* ``TimelineWidget`` draws a simple two\u2011track timeline (video and audio)
  using a ``QGraphicsScene`` and accepts drops from the media library.
* ``PreviewPlayer`` wraps a ``QMediaPlayer`` and ``QVideoWidget`` to
  preview the timeline sequentially.
* ``SettingsDialog`` allows the user to configure workspace and export
  directories.
* ``MainWindow`` ties everything together, providing menus, toolbars and
  handlers for importing, exporting, saving and loading projects.

This program requires PyQt5 to be installed.  If it isn't available the
module will still import but launching the GUI will obviously fail.  It also
relies on FFmpeg and FFprobe being accessible via the system PATH for
thumbnail extraction, duration detection and export.

The code is extensively commented to aid understanding.  Feel free to modify
or extend it to suit your own workflow.
"""

import json
import os
import random
import subprocess
import sys
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

from PyQt5.QtCore import (
    QFileInfo,
    QPoint,
    QRectF,
    Qt,
    QTimer,
    pyqtSignal,
)
from PyQt5.QtGui import (
    QColor,
    QDrag,
    QIcon,
    QPainter,
    QPixmap,
)
from PyQt5.QtMultimedia import QMediaContent, QMediaPlayer
from PyQt5.QtMultimediaWidgets import QVideoWidget
from PyQt5.QtWidgets import (
    QAction,
    QApplication,
    QDialog,
    QDialogButtonBox,
    QFileDialog,
    QFormLayout,
    QGraphicsItem,
    QGraphicsRectItem,
    QGraphicsScene,
    QGraphicsTextItem,
    QGraphicsView,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMenu,
    QMessageBox,
    QPushButton,
    QSplitter,
    QStyle,
    QToolBar,
    QVBoxLayout,
    QWidget,
    QListWidget,
    QListWidgetItem,
    QSlider,
    QMimeData,
)


def ffprobe_installed() -> bool:
    """Return True if ffprobe is available on the system PATH."""
    try:
        subprocess.run(["ffprobe", "-version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except FileNotFoundError:
        return False


def get_media_duration(path: str) -> float:
    """Return the duration of a media file in seconds using ffprobe.

    If ffprobe is not installed or fails, returns a default duration of 10.0
    seconds.  This function caches results per process run to avoid
    repeatedly probing the same file.

    Parameters
    ----------
    path: str
        Path to the media file.

    Returns
    -------
    float
        Duration in seconds.
    """
    if not ffprobe_installed():
        return 10.0
    cache = get_media_duration._cache  # type: ignore[attr-defined]
    if path in cache:
        return cache[path]
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                path,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        duration = float(result.stdout.strip())
    except Exception:
        duration = 10.0
    cache[path] = duration
    return duration


get_media_duration._cache = {}  # type: ignore[attr-defined]


def generate_thumbnail(input_path: str, dest_dir: str) -> str:
    """Generate a thumbnail JPEG for a video or image file and return its path.

    For video files, FFmpeg is used to extract a frame at a random timestamp
    between 0 and the first two seconds.  For images, a scaled copy is
    produced.  If thumbnail generation fails, a generic placeholder is used.

    Parameters
    ----------
    input_path: str
        Path to the input media file.
    dest_dir: str
        Directory where the thumbnail should be saved.  The filename is
        generated automatically based on the input filename and a UUID to
        avoid collisions.

    Returns
    -------
    str
        Absolute path to the generated thumbnail image.
    """
    os.makedirs(dest_dir, exist_ok=True)
    base_name = Path(input_path).stem
    thumb_name = f"{base_name}_{uuid.uuid4().hex[:8]}.jpg"
    thumb_path = os.path.join(dest_dir, thumb_name)

    ext = Path(input_path).suffix.lower()
    video_exts = {".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv"}
    try:
        if ext in video_exts and ffprobe_installed():
            rand_time = random.uniform(0, 2.0)
            cmd = [
                "ffmpeg",
                "-y",
                "-ss",
                str(rand_time),
                "-i",
                input_path,
                "-frames:v",
                "1",
                "-vf",
                "scale=320:180:force_original_aspect_ratio=decrease",
                thumb_path,
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            pix = QPixmap(input_path)
            if not pix.isNull():
                scaled = pix.scaled(320, 180, Qt.KeepAspectRatio, Qt.SmoothTransformation)
                scaled.save(thumb_path)
            else:
                raise ValueError("Cannot load image")
    except Exception:
        placeholder = QPixmap(320, 180)
        placeholder.fill(QColor(80, 80, 80))
        painter = QPainter(placeholder)
        painter.setPen(QColor(200, 200, 200))
        painter.drawText(placeholder.rect(), Qt.AlignCenter, "No Preview")
        painter.end()
        placeholder.save(thumb_path)
    return thumb_path


@dataclass
class MediaItem:
    """Represents a media asset in the project."""
    path: str
    media_type: str
    thumbnail: str
    id: str = field(default_factory=lambda: uuid.uuid4().hex)

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "path": self.path,
            "media_type": self.media_type,
            "thumbnail": self.thumbnail,
        }

    @staticmethod
    def from_dict(d: Dict) -> 'MediaItem':
        return MediaItem(path=d["path"], media_type=d["media_type"], thumbnail=d["thumbnail"], id=d["id"])


@dataclass
class Clip:
    """Represents a segment of a media item on the timeline."""
    media_id: str
    in_point: float
    out_point: float
    start_time: float
    def to_dict(self) -> Dict:
        return {
            "media_id": self.media_id,
            "in": self.in_point,
            "out": self.out_point,
            "start": self.start_time,
        }
    @staticmethod
    def from_dict(d: Dict) -> 'Clip':
        return Clip(media_id=d["media_id"], in_point=d["in"], out_point=d["out"], start_time=d["start"])


class Project:
    """Holds all project data including media items, timeline and settings."""
    def __init__(self):
        self.media: Dict[str, MediaItem] = {}
        self.video_clips: List[Clip] = []
        self.audio_clips: List[Clip] = []
        self.workspace_dir = os.path.expanduser("~/video_editor_workspace")
        self.export_dir = os.path.expanduser("~/Videos")
        os.makedirs(self.workspace_dir, exist_ok=True)
        os.makedirs(self.export_dir, exist_ok=True)

    def add_media(self, item: MediaItem):
        self.media[item.id] = item

    def add_clip(self, clip: Clip, track: str):
        if track == "video":
            self.video_clips.append(clip)
            self.video_clips.sort(key=lambda c: c.start_time)
        else:
            self.audio_clips.append(clip)
            self.audio_clips.sort(key=lambda c: c.start_time)

    def to_dict(self) -> Dict:
        return {
            "media": [item.to_dict() for item in self.media.values()],
            "video_clips": [clip.to_dict() for clip in self.video_clips],
            "audio_clips": [clip.to_dict() for clip in self.audio_clips],
            "workspace_dir": self.workspace_dir,
            "export_dir": self.export_dir,
        }

    @staticmethod
    def from_dict(data: Dict) -> 'Project':
        proj = Project()
        proj.workspace_dir = data.get("workspace_dir", proj.workspace_dir)
        proj.export_dir = data.get("export_dir", proj.export_dir)
        os.makedirs(proj.workspace_dir, exist_ok=True)
        os.makedirs(proj.export_dir, exist_ok=True)
        for m in data.get("media", []):
            item = MediaItem.from_dict(m)
            proj.media[item.id] = item
        for c in data.get("video_clips", []):
            clip = Clip.from_dict(c)
            proj.video_clips.append(clip)
        for c in data.get("audio_clips", []):
            clip = Clip.from_dict(c)
            proj.audio_clips.append(clip)
        return proj

    def save_to_file(self, filepath: str):
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2)

    @staticmethod
    def load_from_file(filepath: str) -> 'Project':
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return Project.from_dict(data)


class MediaLibraryWidget(QListWidget):
    """Displays imported media and supports drag\u2011and\u2011drop onto the timeline."""
    def __init__(self, project: Project, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self.project = project
        self.setViewMode(QListWidget.IconMode)
        self.setIconSize(QSize(120, 90))
        self.setResizeMode(QListWidget.Adjust)
        self.setDragEnabled(True)
        self.setAcceptDrops(True)
        self.setSpacing(10)
        self.setMovement(QListWidget.Static)
        self._file_filters = [
            "*.mp4",
            "*.avi",
            "*.mkv",
            "*.mov",
            "*.wmv",
            "*.flv",
            "*.mp3",
            "*.wav",
            "*.png",
            "*.jpg",
            "*.jpeg",
            "*.bmp",
        ]

    def dragEnterEvent(self, event):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
        else:
            super().dragEnterEvent(event)

    def dragMoveEvent(self, event):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
        else:
            super().dragMoveEvent(event)

    def dropEvent(self, event):
        if event.mimeData().hasUrls():
            urls = event.mimeData().urls()
            for url in urls:
                path = url.toLocalFile()
                if not path:
                    continue
                self.import_media(path)
            event.acceptProposedAction()
        else:
            super().dropEvent(event)

    def startDrag(self, supported_actions):
        item = self.currentItem()
        if not item:
            return
        drag = QDrag(self)
        mime = QMimeData()
        mime.setData("application/x-media-id", item.data(Qt.UserRole).encode("utf-8"))
        drag.setMimeData(mime)
        drag.setHotSpot(QPoint(0, 0))
        drag.setPixmap(item.icon().pixmap(self.iconSize()))
        drag.exec(Qt.MoveAction)

    def import_media(self, path: str):
        path = os.path.abspath(path)
        if not os.path.isfile(path):
            return
        ext = Path(path).suffix.lower()
        if not any(Path(path).match(pattern) for pattern in self._file_filters):
            QMessageBox.warning(self, "Unsupported Format", f"Cannot import {ext} files.")
            return
        if ext in {".mp3", ".wav"}:
            mtype = "audio"
        elif ext in {".png", ".jpg", ".jpeg", ".bmp"}:
            mtype = "image"
        else:
            mtype = "video"
        thumb_dir = os.path.join(self.project.workspace_dir, "thumbnails")
        thumb_path = generate_thumbnail(path, thumb_dir)
        item = MediaItem(path=path, media_type=mtype, thumbnail=thumb_path)
        self.project.add_media(item)
        list_item = QListWidgetItem()
        list_item.setIcon(QIcon(item.thumbnail))
        list_item.setText(Path(item.path).name)
        list_item.setData(Qt.UserRole, item.id)
        self.addItem(list_item)

    def contextMenuEvent(self, event):
        item = self.itemAt(event.pos())
        if not item:
            return
        menu = QMenu(self)
        remove_action = menu.addAction("Remove")
        action = menu.exec(self.mapToGlobal(event.pos()))
        if action == remove_action:
            media_id = item.data(Qt.UserRole)
            if media_id in self.project.media:
                del self.project.media[media_id]
            self.takeItem(self.row(item))


class TimelineWidget(QGraphicsView):
    """A simple two\u2011track timeline implemented with a QGraphicsScene."""
    clip_added = pyqtSignal(Clip, str)
    def __init__(self, project: Project, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self.project = project
        self.scene = QGraphicsScene(self)
        self.setScene(self.scene)
        self.setAcceptDrops(True)
        self.pixels_per_second = 100.0
        self.video_y = 0
        self.audio_y = 60
        self.track_height = 40
        self.setSceneRect(0, 0, 2000, 120)
        self._draw_tracks()
        self.graphics_to_clip: Dict[QGraphicsItem, Clip] = {}

    def _draw_tracks(self):
        self.scene.clear()
        video_bg = QGraphicsRectItem(0, self.video_y, self.scene.width(), self.track_height)
        video_bg.setBrush(QColor(30, 30, 30))
        video_bg.setPen(QColor(60, 60, 60))
        video_bg.setZValue(-1)
        self.scene.addItem(video_bg)
        video_label = QGraphicsTextItem("Video")
        video_label.setDefaultTextColor(QColor(200, 200, 200))
        video_label.setPos(-60, self.video_y)
        self.scene.addItem(video_label)
        audio_bg = QGraphicsRectItem(0, self.audio_y, self.scene.width(), self.track_height)
        audio_bg.setBrush(QColor(30, 30, 30))
        audio_bg.setPen(QColor(60, 60, 60))
        audio_bg.setZValue(-1)
        self.scene.addItem(audio_bg)
        audio_label = QGraphicsTextItem("Audio")
        audio_label.setDefaultTextColor(QColor(200, 200, 200))
        audio_label.setPos(-60, self.audio_y)
        self.scene.addItem(audio_label)
        self.graphics_to_clip.clear()
        for clip in self.project.video_clips:
            self._draw_clip(clip, "video")
        for clip in self.project.audio_clips:
            self._draw_clip(clip, "audio")

    def _draw_clip(self, clip: Clip, track: str):
        media = self.project.media.get(clip.media_id)
        if not media:
            return
        duration = clip.out_point - clip.in_point
        width = duration * self.pixels_per_second
        y = self.video_y if track == "video" else self.audio_y
        color = QColor(0, 120, 215, 180) if track == "video" else QColor(120, 200, 60, 180)
        rect_item = QGraphicsRectItem(clip.start_time * self.pixels_per_second, y, width, self.track_height)
        rect_item.setBrush(color)
        rect_item.setPen(QColor(255, 255, 255, 100))
        rect_item.setFlag(QGraphicsItem.ItemIsSelectable, True)
        rect_item.setFlag(QGraphicsItem.ItemIsMovable, True)
        text = QGraphicsTextItem(Path(media.path).name, rect_item)
        text.setDefaultTextColor(QColor(255, 255, 255))
        text.setPos(rect_item.rect().x() + 2, y)
        self.scene.addItem(rect_item)
        self.graphics_to_clip[rect_item] = clip

    def refresh(self):
        self._draw_tracks()

    def dragEnterEvent(self, event):
        if event.mimeData().hasFormat("application/x-media-id"):
            event.acceptProposedAction()
        else:
            super().dragEnterEvent(event)

    def dragMoveEvent(self, event):
        if event.mimeData().hasFormat("application/x-media-id"):
            event.setDropAction(Qt.CopyAction)
            event.accept()
        else:
            super().dragMoveEvent(event)

    def dropEvent(self, event):
        data = event.mimeData().data("application/x-media-id")
        if not data:
            return
        media_id = bytes(data).decode("utf-8")
        if media_id not in self.project.media:
            return
        pos = self.mapToScene(event.pos())
        track = "video" if pos.y() < (self.audio_y) else "audio"
        start_time = max(0.0, pos.x() / self.pixels_per_second)
        media = self.project.media[media_id]
        duration = get_media_duration(media.path)
        clip = Clip(media_id=media_id, in_point=0.0, out_point=duration, start_time=start_time)
        self.project.add_clip(clip, track)
        self._draw_clip(clip, track)
        self.clip_added.emit(clip, track)
        event.acceptProposedAction()

    def mouseReleaseEvent(self, event):
        super().mouseReleaseEvent(event)
        for item, clip in self.graphics_to_clip.items():
            rect = item.rect()
            new_start = rect.x() / self.pixels_per_second
            if new_start < 0:
                new_start = 0
                item.setRect(0, rect.y(), rect.width(), rect.height())
            clip.start_time = new_start


class PreviewPlayer(QWidget):
    """A widget encapsulating a QMediaPlayer and video output for previewing the timeline."""
    def __init__(self, project: Project, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self.project = project
        self.media_player = QMediaPlayer(None, QMediaPlayer.VideoSurface)
        self.video_widget = QVideoWidget()
        self.play_button = QPushButton()
        self.play_button.setIcon(self.style().standardIcon(QStyle.SP_MediaPlay))
        self.play_button.clicked.connect(self.toggle_play)
        self.stop_button = QPushButton()
        self.stop_button.setIcon(self.style().standardIcon(QStyle.SP_MediaStop))
        self.stop_button.clicked.connect(self.stop)
        self.position_slider = QSlider(Qt.Horizontal)
        self.position_slider.setRange(0, 1000)
        self.position_slider.sliderMoved.connect(self.seek)
        control_layout = QHBoxLayout()
        control_layout.addWidget(self.play_button)
        control_layout.addWidget(self.stop_button)
        control_layout.addWidget(self.position_slider)
        layout = QVBoxLayout(self)
        layout.addWidget(self.video_widget)
        layout.addLayout(control_layout)
        self.media_player.setVideoOutput(self.video_widget)
        self.media_player.positionChanged.connect(self.update_position)
        self.media_player.durationChanged.connect(self.update_duration)
        self.media_player.mediaStatusChanged.connect(self.media_status_changed)
        self._playlist: List[Clip] = []
        self._current_index = -1
        self._playing = False

    def build_playlist(self):
        self._playlist = sorted(self.project.video_clips, key=lambda c: c.start_time)
        self._current_index = -1

    def play_next(self):
        self._current_index += 1
        if self._current_index < len(self._playlist):
            clip = self._playlist[self._current_index]
            media = self.project.media.get(clip.media_id)
            if not media:
                self.play_next()
                return
            url = QUrl.fromLocalFile(media.path)
            self.media_player.setMedia(QMediaContent(url))
            def seek_when_loaded(status):
                if status == QMediaPlayer.LoadedMedia:
                    self.media_player.setPosition(int(clip.in_point * 1000))
                    duration_ms = (clip.out_point - clip.in_point) * 1000
                    QTimer.singleShot(int(duration_ms), self.media_player.stop)
                    self.media_player.mediaStatusChanged.disconnect(seek_when_loaded)
            self.media_player.mediaStatusChanged.connect(seek_when_loaded)
            self.play_button.setIcon(self.style().standardIcon(QStyle.SP_MediaPause))
            self._playing = True
            self.media_player.play()
        else:
            self.stop()

    def media_status_changed(self, status):
        if status == QMediaPlayer.EndOfMedia:
            self.play_next()

    def toggle_play(self):
        if self.media_player.state() == QMediaPlayer.PlayingState:
            self.media_player.pause()
            self.play_button.setIcon(self.style().standardIcon(QStyle.SP_MediaPlay))
        else:
            if not self._playing:
                self.build_playlist()
                self.play_next()
            else:
                self.media_player.play()
                self.play_button.setIcon(self.style().standardIcon(QStyle.SP_MediaPause))

    def stop(self):
        self.media_player.stop()
        self.play_button.setIcon(self.style().standardIcon(QStyle.SP_MediaPlay))
        self._playing = False
        self._current_index = -1

    def update_position(self, position):
        if self.media_player.duration() > 0:
            self.position_slider.blockSignals(True)
            self.position_slider.setValue(int((position / self.media_player.duration()) * 1000))
            self.position_slider.blockSignals(False)

    def update_duration(self, duration):
        self.position_slider.setRange(0, 1000)

    def seek(self, value):
        if self.media_player.duration() > 0:
            self.media_player.setPosition(int((value / 1000) * self.media_player.duration()))


class SettingsDialog(QDialog):
    """Dialog for editing workspace and export directories."""
    def __init__(self, project: Project, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self.project = project
        self.setWindowTitle("Settings")
        layout = QFormLayout(self)
        self.workspace_edit = QLineEdit(self.project.workspace_dir)
        self.export_edit = QLineEdit(self.project.export_dir)
        browse_ws = QPushButton("Browse")
        browse_ws.clicked.connect(self.browse_workspace)
        browse_exp = QPushButton("Browse")
        browse_exp.clicked.connect(self.browse_export)
        ws_layout = QHBoxLayout()
        ws_layout.addWidget(self.workspace_edit)
        ws_layout.addWidget(browse_ws)
        exp_layout = QHBoxLayout()
        exp_layout.addWidget(self.export_edit)
        exp_layout.addWidget(browse_exp)
        layout.addRow("Workspace folder:", ws_layout)
        layout.addRow("Export folder:", exp_layout)
        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)

    def browse_workspace(self):
        directory = QFileDialog.getExistingDirectory(self, "Select Workspace Folder", self.workspace_edit.text())
        if directory:
            self.workspace_edit.setText(directory)

    def browse_export(self):
        directory = QFileDialog.getExistingDirectory(self, "Select Export Folder", self.export_edit.text())
        if directory:
            self.export_edit.setText(directory)

    def accept(self):
        new_ws = self.workspace_edit.text().strip()
        new_exp = self.export_edit.text().strip()
        if new_ws:
            self.project.workspace_dir = new_ws
            os.makedirs(self.project.workspace_dir, exist_ok=True)
        if new_exp:
            self.project.export_dir = new_exp
            os.makedirs(self.project.export_dir, exist_ok=True)
        super().accept()


class MainWindow(QMainWindow):
    """The main application window tying together all components."""
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Linux Video Editor")
        self.resize(1200, 700)
        self.project = Project()
        self.library = MediaLibraryWidget(self.project)
        self.timeline = TimelineWidget(self.project)
        self.preview = PreviewPlayer(self.project)
        self.timeline.clip_added.connect(lambda clip, track: self.preview.build_playlist())
        splitter = QSplitter(Qt.Horizontal)
        left_panel = QSplitter(Qt.Vertical)
        left_panel.addWidget(self.library)
        left_panel.addWidget(self.preview)
        left_panel.setStretchFactor(0, 1)
        left_panel.setStretchFactor(1, 2)
        splitter.addWidget(left_panel)
        splitter.addWidget(self.timeline)
        splitter.setStretchFactor(0, 1)
        splitter.setStretchFactor(1, 2)
        self.setCentralWidget(splitter)
        self._create_actions()
        self._create_menus()
        self._create_toolbar()
        self.statusBar().showMessage("Ready")
        if not ffprobe_installed():
            QMessageBox.warning(self, "FFmpeg Missing", "FFmpeg was not found on your system. Thumbnail generation, duration detection and export will not work.")

    def _create_actions(self):
        self.new_project_act = QAction("&New", self)
        self.new_project_act.setShortcut("Ctrl+N")
        self.new_project_act.triggered.connect(self.new_project)
        self.open_project_act = QAction("&Open...", self)
        self.open_project_act.setShortcut("Ctrl+O")
        self.open_project_act.triggered.connect(self.open_project)
        self.save_project_act = QAction("&Save", self)
        self.save_project_act.setShortcut("Ctrl+S")
        self.save_project_act.triggered.connect(self.save_project)
        self.import_media_act = QAction("Import &Media...", self)
        self.import_media_act.setShortcut("Ctrl+I")
        self.import_media_act.triggered.connect(self.import_media)
        self.export_act = QAction("&Export...", self)
        self.export_act.setShortcut("Ctrl+E")
        self.export_act.triggered.connect(self.export_project)
        self.settings_act = QAction("&Settings...", self)
        self.settings_act.triggered.connect(self.open_settings)
        self.exit_act = QAction("E&xit", self)
        self.exit_act.setShortcut("Ctrl+Q")
        self.exit_act.triggered.connect(self.close)

    def _create_menus(self):
        menubar = self.menuBar()
        file_menu = menubar.addMenu("&File")
        file_menu.addAction(self.new_project_act)
        file_menu.addAction(self.open_project_act)
        file_menu.addAction(self.save_project_act)
        file_menu.addSeparator()
        file_menu.addAction(self.import_media_act)
        file_menu.addSeparator()
        file_menu.addAction(self.export_act)
        file_menu.addSeparator()
        file_menu.addAction(self.settings_act)
        file_menu.addSeparator()
        file_menu.addAction(self.exit_act)

    def _create_toolbar(self):
        toolbar = QToolBar("Main Toolbar")
        toolbar.setIconSize(QSize(24, 24))
        toolbar.addAction(self.new_project_act)
        toolbar.addAction(self.open_project_act)
        toolbar.addAction(self.save_project_act)
        toolbar.addSeparator()
        toolbar.addAction(self.import_media_act)
        toolbar.addSeparator()
        toolbar.addAction(self.export_act)
        toolbar.addSeparator()
        toolbar.addAction(self.settings_act)
        self.addToolBar(toolbar)

    def new_project(self):
        if not self._maybe_save():
            return
        self.project = Project()
        self.library.project = self.project
        self.timeline.project = self.project
        self.preview.project = self.project
        self.library.clear()
        self.timeline.refresh()
        self.preview.build_playlist()
        self.statusBar().showMessage("New project created")

    def open_project(self):
        if not self._maybe_save():
            return
        file_path, _ = QFileDialog.getOpenFileName(self, "Open Project", self.project.workspace_dir, "Project Files (*.json)")
        if file_path:
            try:
                proj = Project.load_from_file(file_path)
                self.project = proj
                self.library.clear()
                self.library.project = self.project
                for item in self.project.media.values():
                    list_item = QListWidgetItem()
                    list_item.setIcon(QIcon(item.thumbnail))
                    list_item.setText(Path(item.path).name)
                    list_item.setData(Qt.UserRole, item.id)
                    self.library.addItem(list_item)
                self.timeline.project = self.project
                self.timeline.refresh()
                self.preview.project = self.project
                self.preview.build_playlist()
                self.statusBar().showMessage(f"Project loaded from {file_path}")
            except Exception as e:
                QMessageBox.critical(self, "Error", f"Failed to open project: {e}")

    def save_project(self):
        file_path, _ = QFileDialog.getSaveFileName(self, "Save Project", self.project.workspace_dir, "Project Files (*.json)")
        if file_path:
            if not file_path.endswith(".json"):
                file_path += ".json"
            try:
                self.project.save_to_file(file_path)
                self.statusBar().showMessage(f"Project saved to {file_path}")
            except Exception as e:
                QMessageBox.critical(self, "Error", f"Failed to save project: {e}")

    def import_media(self):
        files, _ = QFileDialog.getOpenFileNames(
            self,
            "Import Media",
            self.project.workspace_dir,
            "Media Files (*.mp4 *.avi *.mkv *.mov *.wmv *.flv *.mp3 *.wav *.png *.jpg *.jpeg *.bmp)",
        )
        for f in files:
            self.library.import_media(f)
        self.preview.build_playlist()

    def export_project(self):
        if not ffprobe_installed():
            QMessageBox.warning(self, "FFmpeg Missing", "FFmpeg is required to export the project.")
            return
        if not self.project.video_clips:
            QMessageBox.information(self, "Nothing to Export", "There are no video clips to export.")
            return
        output_path, _ = QFileDialog.getSaveFileName(self, "Export Video", self.project.export_dir, "MP4 Video (*.mp4)")
        if not output_path:
            return
        if not output_path.endswith(".mp4"):
            output_path += ".mp4"
        try:
            self.statusBar().showMessage("Exporting video...")
            self._export_with_ffmpeg(output_path)
            self.statusBar().showMessage(f"Export complete: {output_path}")
            QMessageBox.information(self, "Export Complete", f"Exported video saved to {output_path}")
        except Exception as e:
            QMessageBox.critical(self, "Export Error", f"Failed to export: {e}")

    def _export_with_ffmpeg(self, output_path: str):
        temp_dir = os.path.join(self.project.workspace_dir, "export_tmp")
        os.makedirs(temp_dir, exist_ok=True)
        tmp_video_files = []
        for idx, clip in enumerate(self.project.video_clips):
            media = self.project.media[clip.media_id]
            tmp_out = os.path.join(temp_dir, f"v_{idx:03d}.mp4")
            cmd = [
                "ffmpeg",
                "-y",
                "-ss",
                str(clip.in_point),
                "-i",
                media.path,
                "-to",
                str(clip.out_point - clip.in_point),
                "-c",
                "copy",
                tmp_out,
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            tmp_video_files.append(tmp_out)
        concat_list_path = os.path.join(temp_dir, "video_list.txt")
        with open(concat_list_path, "w", encoding="utf-8") as f:
            for file_path in tmp_video_files:
                f.write(f"file '{file_path}'\n")
        video_concat_path = os.path.join(temp_dir, "video_concat.mp4")
        cmd_concat = [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            concat_list_path,
            "-c",
            "copy",
            video_concat_path,
        ]
        subprocess.run(cmd_concat, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        audio_tracks_exist = bool(self.project.audio_clips)
        if not audio_tracks_exist:
            cmd_final = [
                "ffmpeg",
                "-y",
                "-i",
                video_concat_path,
                "-c:v",
                "libx264",
                "-c:a",
                "aac",
                "-preset",
                "fast",
                output_path,
            ]
            subprocess.run(cmd_final, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        else:
            tmp_audio_files = []
            for idx, clip in enumerate(self.project.audio_clips):
                media = self.project.media[clip.media_id]
                tmp_out = os.path.join(temp_dir, f"a_{idx:03d}.mp3")
                cmd = [
                    "ffmpeg",
                    "-y",
                    "-ss",
                    str(clip.in_point),
                    "-i",
                    media.path,
                    "-to",
                    str(clip.out_point - clip.in_point),
                    "-q:a",
                    "0",
                    tmp_out,
                ]
                subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                tmp_audio_files.append((tmp_out, clip.start_time))
            filter_parts = []
            input_cmds = []
            for idx, (audio_path, start) in enumerate(tmp_audio_files):
                input_cmds.extend(["-i", audio_path])
                delay_ms = int(start * 1000)
                filter_parts.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms}[a{idx}];")
            mix_inputs = ''.join(f"[a{idx}]" for idx in range(len(tmp_audio_files)))
            filter_parts.append(f"{mix_inputs}amix=inputs={len(tmp_audio_files)}:duration=longest[aout]")
            filter_complex = ''.join(filter_parts)
            cmd_final = [
                "ffmpeg",
                "-y",
                "-i",
                video_concat_path,
            ] + input_cmds + [
                "-filter_complex",
                filter_complex,
                "-map",
                "0:v",
                "-map",
                "[aout]",
                "-c:v",
                "libx264",
                "-c:a",
                "aac",
                "-preset",
                "fast",
                output_path,
            ]
            subprocess.run(cmd_final, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    def open_settings(self):
        dlg = SettingsDialog(self.project, self)
        if dlg.exec() == QDialog.Accepted:
            self.statusBar().showMessage("Settings updated")

    def _maybe_save(self) -> bool:
        reply = QMessageBox.question(
            self,
            "Save Project",
            "Do you want to save the current project before closing?",
            QMessageBox.Yes | QMessageBox.No | QMessageBox.Cancel,
        )
        if reply == QMessageBox.Yes:
            self.save_project()
            return True
        elif reply == QMessageBox.No:
            return True
        else:
            return False

    def closeEvent(self, event):
        if self._maybe_save():
            event.accept()
        else:
            event.ignore()


def main():
    app = QApplication(sys.argv)
    app.setApplicationName("Linux Video Editor")
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
