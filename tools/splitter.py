import argparse
from pydub import AudioSegment
from pydub.silence import detect_nonsilent
import os
import hashlib
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor


def short_hash(text, length=5):
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:length]


def split_audio(file_path_str, output_base_dir_str, min_duration=10000, max_duration=25000, silence_thresh=-40):
    file_path = Path(file_path_str)
    output_base_dir = Path(output_base_dir_str)

    print(f"\n📂 Carregando áudio: {file_path}")
    audio = AudioSegment.from_file(file_path)
    total_length = len(audio)
    print(f"🎧 Duração total: {total_length / 1000:.2f}s")

    one_sec_silence = AudioSegment.silent(duration=1000)

    start = 0
    part = 1

    parent_hash = short_hash(str(file_path.parent))
    file_hash = short_hash(file_path.name)
    output_dir = output_base_dir / parent_hash / file_hash
    output_dir.mkdir(parents=True, exist_ok=True)

    while start < total_length:
        print(f"🔍 Segmento {part}")
        end = min(start + max_duration, total_length)
        chunk = audio[start:end]

        nonsilent_ranges = detect_nonsilent(chunk, min_silence_len=500, silence_thresh=silence_thresh)

        split_point = end
        if nonsilent_ranges:
            for i in range(len(nonsilent_ranges) - 1):
                silence_start = nonsilent_ranges[i][1]
                silence_end = nonsilent_ranges[i + 1][0]
                if min_duration <= silence_end <= max_duration:
                    split_point = start + silence_end
                    print(f"✅ Corte em {silence_end / 1000:.2f}s")
                    break
            else:
                print("⚠️ Sem silêncio ideal. Cortando no limite.")
        else:
            print("⚠️ Nenhuma faixa de som detectada. Cortando no tempo limite.")

        final_segment = audio[start:split_point]
        final_segment = one_sec_silence + final_segment.fade_in(300).fade_out(300) + one_sec_silence

        segment_hash = short_hash(f"{file_path}_{part}")
        output_file = output_dir / f"{segment_hash}.mp3"

        final_segment.export(output_file, format="mp3")
        print(f"💾 Exportado: {output_file.relative_to(output_base_dir)} | Duração: {len(final_segment)/1000:.2f}s")

        start = split_point
        part += 1


def process_all_audios(input_dir, output_dir, max_workers=4):
    input_path = Path(input_dir)
    audio_files = list(input_path.rglob("*.mp3"))

    print(f"🔄 Iniciando processamento paralelo de {len(audio_files)} arquivos...")

    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            executor.submit(split_audio, str(file), str(output_dir))
            for file in audio_files
        ]
        for future in futures:
            future.result()

    print("\n🏁 Todos os arquivos foram processados!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Split audios into smaller chunks based on silence detection.")
    parser.add_argument("--input", "-i", required=True, help="Diretório de entrada com os arquivos .mp3")
    parser.add_argument("--output", "-o", required=True, help="Diretório de saída para salvar os áudios processados")
    parser.add_argument("--max-workers", "-w", type=int, default=4, help="Número máximo de workers para processamento paralelo")

    args = parser.parse_args()

    process_all_audios(
        input_dir=args.input,
        output_dir=args.output,
        max_workers=args.max_workers
    )
