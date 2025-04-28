# Transcrição e Geração de Vídeo F5

[![Exemplo audio gerado](./video_gen/out/thumbnail.jpg)](./video_gen/out/audio-composition.mp4)

Este repositório contém:

- 🛠 Uma ferramenta para transcrição de áudio e geração de fonemas (`/tools`)
- 🎥 Um projeto Remotion para criação do sample gerado (`/video_gen`)
- 🤖 Um notebook Colab para inferência rápida (`inference_tts.ipynb`)

---

## 1. Ferramentas usadas para criar o dataset (`/tools`)    
Este repositório contém:

    🛠 Script para transcrever arquivos de áudio em texto, normalizar e gerar fonemas. (sst.py)
    🛠 Script para segmentar audios com media em 15s. (splitter.py)

### Uso

Transcrever áudios de uma pasta:

```bash
python tools/sst.py <folder_path> --csv <output_csv> --batch <batch_size>
```

```bash
python tools/splitter.py --input "/caminho/para/entrada" --output "/caminho/para/saida" --max-workers 10
```

---

## 2. Projeto de Vídeo (`/video_gen`)

Projeto em [Remotion](https://www.remotion.dev/) para gerar vídeos automáticos a partir dos dados de transcrição.

### Instalação

```bash
cd video_gen

# Instalar dependências
yarn install
```

### Desenvolvimento

Para rodar localmente:

```bash
yarn dev
```

Acesse no navegador: [http://localhost:3000](http://localhost:3000)

### Renderização

Para renderizar o vídeo final:

```bash
yarn remotion render --gl=angle --concurrency=1
```

> **Nota:** O parâmetro `--gl=angle` garante a compatibilidade com ambientes sem suporte direto a OpenGL.

---

## 📓 3. Inferência rápida via Google Colab

Você pode usar o notebook `inference_tts.ipynb` para realizar transcrição do modelo f5-tts com finetunning para ptbr

- Acesse o [Colab](https://colab.research.google.com/)
- Faça upload do arquivo `inference_tts.ipynb`
- Referencias de audios [Tharyck/multispeaker-tts-ptbr](https://huggingface.co/datasets/Tharyck/multispeaker-tts-ptbr)
- Modelo treinado [Tharyck/multispeaker-ptbr-f5tts](https://huggingface.co/Tharyck/multispeaker-ptbr-f5tts)
- Siga as instruções no notebook