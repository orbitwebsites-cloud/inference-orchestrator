# Assembles DEMO_VIDEO.mp4 entirely offline:
#   - frames/*.png (rendered by render_frames.py, pure Pillow, no screen capture)
#   - narration/*.wav (rendered by narration.py, pure pyttsx3 TTS, no screen capture)
# Combined with ffmpeg's image2/concat demuxers -- never touches the live display.

import json
import os
import subprocess

HERE = os.path.dirname(__file__)
FRAMES = os.path.join(HERE, "frames")
NARRATION = os.path.join(HERE, "narration")
BUILD = os.path.join(HERE, "build")
os.makedirs(BUILD, exist_ok=True)

FFMPEG = "ffmpeg"

# scene_id -> (frame_file, on-screen duration seconds)
SCENES = [
    ("01_intro", 26.5),
    ("02_endpoints", 14.0),
    ("03_scoring", 18.0),
    ("04_liverequest", 17.0),
    ("05_batchdemo", 24.0),
    ("06_closing", 16.0),
]

with open(os.path.join(NARRATION, "durations.json")) as f:
    narr_durations = json.load(f)


def run(cmd):
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True)


# 1) Build per-scene audio: narration.wav + silence pad to scene duration
audio_parts = []
for scene_id, scene_dur in SCENES:
    narr_path = os.path.join(NARRATION, f"{scene_id}.wav")
    narr_dur = narr_durations[scene_id]
    pad = max(0.0, scene_dur - narr_dur)
    audio_parts.append(narr_path)
    if pad > 0.05:
        silence_path = os.path.join(BUILD, f"silence_{scene_id}.wav")
        run([FFMPEG, "-y", "-f", "lavfi", "-i", f"anullsrc=r=22050:cl=mono", "-t", f"{pad:.3f}",
             "-c:a", "pcm_s16le", silence_path])
        audio_parts.append(silence_path)

audio_list_path = os.path.join(BUILD, "audio_list.txt")
with open(audio_list_path, "w") as f:
    for p in audio_parts:
        f.write(f"file '{os.path.abspath(p)}'\n")

full_audio_wav = os.path.join(BUILD, "narration_full.wav")
run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", audio_list_path,
     "-c:a", "pcm_s16le", full_audio_wav])

# 2) Build silent video from frames using concat demuxer with per-image duration
video_list_path = os.path.join(BUILD, "video_list.txt")
with open(video_list_path, "w") as f:
    for scene_id, scene_dur in SCENES:
        frame_path = os.path.abspath(os.path.join(FRAMES, f"{scene_id}.png"))
        f.write(f"file '{frame_path}'\n")
        f.write(f"duration {scene_dur}\n")
    # concat demuxer quirk: last image's duration is ignored unless the file
    # is listed once more without a following duration
    last_frame = os.path.abspath(os.path.join(FRAMES, f"{SCENES[-1][0]}.png"))
    f.write(f"file '{last_frame}'\n")

silent_video = os.path.join(BUILD, "video_silent.mp4")
run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", video_list_path,
     "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-pix_fmt", "yuv420p", silent_video])

# 3) Mux video + narration audio
final_path = os.path.join(HERE, "..", "DEMO_VIDEO.mp4")
run([FFMPEG, "-y", "-i", silent_video, "-i", full_audio_wav,
     "-c:v", "copy", "-c:a", "aac", "-b:a", "128k",
     "-shortest", final_path])

print("DONE:", os.path.abspath(final_path))
