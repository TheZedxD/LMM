# LMM - Lightweight Movie Maker

LMM is a simple video editor inspired by the classic Windows Movie Maker
experience. It is implemented in Python using PyQt5 for the interface and
FFmpeg for processing media. The editor focuses on being lightweight and easy
to use while still supporting modern media formats on Linux.

## Features

* Import video, audio and image files via drag & drop
* Two-track timeline (video and audio)
* Non-destructive editing with configurable in/out points
* Preview playback of the current timeline
* Save and load projects as JSON files
* Export the final composition to MP4 using FFmpeg
* Customisable workspace and export directories

## Installation

1. **Python 3** – the application is written for Python 3.
2. **PyQt5** – provides the GUI components. Install with pip:
   ```bash
   pip install PyQt5
   ```
3. **FFmpeg/FFprobe** – required for thumbnail generation, duration
   detection and exporting the final video. Most Linux distributions provide
   FFmpeg packages (e.g. `sudo apt install ffmpeg`). Ensure that both
   `ffmpeg` and `ffprobe` are available in your `PATH`.

After installing the dependencies, clone this repository and run:

```bash
python3 video_editor.py
```

The editor will create a workspace folder at `~/video_editor_workspace` by
default where thumbnails and temporary files are stored. Exported videos are
saved to `~/Videos` unless changed in the settings dialog.

## License

This project is provided as-is under the MIT license.
