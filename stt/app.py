import os
import tempfile

from fastapi import FastAPI, File, UploadFile
from fastapi.concurrency import run_in_threadpool
from faster_whisper import WhisperModel

MODEL_SIZE = os.getenv("WHISPER_MODEL", "large-v3-turbo")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)

app = FastAPI(title="avito-helper-stt")


def _transcribe(path: str) -> str:
    segments, _ = model.transcribe(
        path,
        language="ru",
        beam_size=5,
        # VAD вырезает тишину/шум: быстрее и без «галлюцинаций» на пустой записи
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500, speech_pad_ms=200),
        # Без опоры на предыдущий текст меньше зацикливания и выдумывания
        condition_on_previous_text=False,
        without_timestamps=True,
    )

    parts = []
    for segment in segments:
        # Отбрасываем сегменты, где модель сама считает, что речи не было
        if segment.no_speech_prob > 0.7 and segment.avg_logprob < -1.0:
            continue
        parts.append(segment.text)
    return "".join(parts).strip()


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    data = await file.read()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name
    try:
        text = await run_in_threadpool(_transcribe, tmp_path)
        return {"text": text}
    finally:
        os.unlink(tmp_path)


@app.get("/health")
async def health():
    return {"status": "ok"}
