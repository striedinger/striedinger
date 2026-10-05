import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "Video Editor": "Editor de vídeo",
  "Video Trimmer, Caption, and Metadata Editor":
    "Cortador de vídeo, legendas e editor de metadados",
  "Trim videos, edit details, pick a cover frame, and add captions entirely in your browser. Your video never leaves this device.":
    "Corte vídeos, edite detalhes, escolha um quadro de capa e adicione legendas direto no navegador. Seu vídeo nunca sai deste dispositivo.",
  "Choose Video": "Escolher vídeo",
  "Choose Another": "Escolher outro",
  "Drop a video here": "Solte um vídeo aqui",
  "Drop to open the video": "Solte para abrir o vídeo",
  "MP4, MOV, and WebM": "MP4, MOV e WebM",
  "Your video stays on this device. Editing happens entirely in your browser.":
    "Seu vídeo permanece neste dispositivo. A edição acontece inteiramente no navegador.",
  "This browser can’t edit videos. Try a recent version of Chrome, Edge, Safari, or Firefox.":
    "Este navegador não consegue editar vídeos. Experimente uma versão recente do Chrome, Edge, Safari ou Firefox.",
  "This file couldn’t be opened as a video.": "Não foi possível abrir este arquivo como vídeo.",
  Play: "Reproduzir",
  Pause: "Pausar",
  Trim: "Cortar",
  "Trim start": "Início do corte",
  "Trim end": "Fim do corte",
  Playhead: "Indicador de reprodução",
  "{duration} selected": "{duration} selecionados",
  "Exact Cut Points": "Pontos de corte exatos",
  "Exact cuts re-encode the video, which takes longer. Otherwise cuts snap to the nearest keyframe and the video is copied without quality loss.":
    "Cortes exatos recodificam o vídeo, o que demora mais. Caso contrário, os cortes se alinham ao quadro-chave mais próximo e o vídeo é copiado sem perda de qualidade.",
  "Cover Frame": "Quadro de capa",
  "Use Current Frame": "Usar quadro atual",
  "Save Image": "Salvar imagem",
  "The cover frame is embedded in the exported video.":
    "O quadro de capa é incorporado ao vídeo exportado.",
  Details: "Detalhes",
  Title: "Título",
  Description: "Descrição",
  "Remove Location": "Remover localização",
  "Removes where the video was recorded from the exported file.":
    "Remove do arquivo exportado o local onde o vídeo foi gravado.",
  Duration: "Duração",
  Resolution: "Resolução",
  "Frame Rate": "Taxa de quadros",
  "File Size": "Tamanho do arquivo",
  Format: "Formato",
  Captions: "Legendas",
  "Add Caption": "Adicionar legenda",
  "Caption text": "Texto da legenda",
  "Delete caption": "Apagar legenda",
  "Add captions at the playhead, or generate them from the audio.":
    "Adicione legendas no indicador de reprodução ou gere-as a partir do áudio.",
  "Captions in Export": "Legendas na exportação",
  "Subtitle Track": "Faixa de legendas",
  "Burned In": "Gravadas no vídeo",
  "Download Captions": "Baixar legendas",
  "Generate Captions": "Gerar legendas",
  "Uses the Whisper speech model on this device. The first time, it downloads about {size}.":
    "Usa o modelo de fala Whisper neste dispositivo. Na primeira vez, baixa cerca de {size}.",
  "Listening to the audio…": "Ouvindo o áudio…",
  "This video has no audio to caption.": "Este vídeo não tem áudio para legendar.",
  "Captions can be generated for up to 20 minutes at a time. Trim the video first.":
    "É possível gerar legendas para até 20 minutos por vez. Corte o vídeo primeiro.",
  "No speech was found in this part of the video.":
    "Nenhuma fala foi encontrada nesta parte do vídeo.",
  "Export Video": "Exportar vídeo",
  "Exporting… {percent}": "Exportando… {percent}",
  Cancel: "Cancelar",
  "This video couldn’t be exported.": "Não foi possível exportar este vídeo.",
  "Save Video": "Salvar vídeo",
  "{fps} fps": "{fps} fps",
});
