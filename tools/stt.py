import os
import csv
import hashlib
from pathlib import Path
from tqdm import tqdm

import torch
import torchaudio
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq

from xphonebr import Phonemizer, normalizer

os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"
processor = AutoProcessor.from_pretrained("pierreguillou/whisper-medium-portuguese")
model = AutoModelForSpeechSeq2Seq.from_pretrained("pierreguillou/whisper-medium-portuguese")
model.eval()

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

phones = Phonemizer(normalizer=True)

def generate_hash(path):
    return hashlib.sha256(path.encode()).hexdigest()

def load_existing_hashes(csv_path):
    if not os.path.exists(csv_path):
        return set()
    with open(csv_path, "r", encoding="utf-8") as f:
        return {row.split(",")[0] for row in f.readlines()[1:]}  # Pula o cabeçalho

def transcribe_batch(audio_paths):
    waveforms = []

    for path in audio_paths:
        waveform, sample_rate = torchaudio.load(path)

        if waveform.shape[0] > 1:
            waveform = torch.mean(waveform, dim=0, keepdim=True)

        if sample_rate != 16000:
            resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
            waveform = resampler(waveform)

        waveforms.append(waveform.squeeze())

    inputs = processor(waveforms, sampling_rate=16000, return_tensors="pt", padding=True).to(device)

    with torch.no_grad():
        generated_ids = model.generate(**inputs)

    transcriptions = processor.batch_decode(generated_ids, skip_special_tokens=True)
    durations = [waveform.shape[-1] / 16000 for waveform in waveforms]

    return list(zip(transcriptions, durations))

def process_directory(folder_path, csv_path="results.csv", batch_size=8):
    folder_path = Path(folder_path)
    mp3_files = list(folder_path.rglob("*.mp3"))
    existing_hashes = load_existing_hashes(csv_path)

    file_exists = os.path.isfile(csv_path)
    with open(csv_path, mode="a", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        if not file_exists:
            writer.writerow(["hash", "audio_path", "normalized_transcription", "phonemes", "audio_duration"])

        for i in tqdm(range(0, len(mp3_files), batch_size), desc="📦 Transcrevendo lotes"):
            batch_paths = mp3_files[i:i + batch_size]
            batch_paths = [p for p in batch_paths if generate_hash(str(p)) not in existing_hashes]

            if not batch_paths:
                continue

            try:
                results = transcribe_batch([str(p) for p in batch_paths])
                for audio_path, (transcription, duration) in zip(batch_paths, results):
                    normalized = normalizer(transcription)
                    phonemes = phones.phonemise(transcription)
                    file_hash = generate_hash(str(audio_path))

                    writer.writerow([file_hash, str(audio_path), normalized, phonemes, round(duration, 2)])
                    print(f"✅ {audio_path} ({round(duration, 2)}s)")

            except Exception as e:
                print(f"❌ Erro ao processar lote: {e}")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Transcreve arquivos .mp3 e salva resultados em CSV.")
    parser.add_argument("folder", help="Caminho da pasta com arquivos .mp3")
    parser.add_argument("--csv", default="results.csv", help="Arquivo de saída CSV (default: results.csv)")
    parser.add_argument("--batch", type=int, default=8, help="Tamanho do batch para transcrição (default: 8)")

    args = parser.parse_args()
    process_directory(args.folder, args.csv, args.batch)
