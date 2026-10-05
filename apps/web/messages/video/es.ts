import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "Video Editor": "Editor de vídeo",
  "Video Trimmer, Caption, and Metadata Editor":
    "Recortador de vídeo, subtítulos y editor de metadatos",
  "Trim videos, edit details, pick a cover frame, and add captions entirely in your browser. Your video never leaves this device.":
    "Recorta vídeos, edita los detalles, elige una portada y añade subtítulos directamente en tu navegador. Tu vídeo nunca sale de este dispositivo.",
  "Choose Video": "Elegir vídeo",
  "Choose Another": "Elegir otro",
  "Drop a video here": "Suelta un vídeo aquí",
  "Drop to open the video": "Suelta para abrir el vídeo",
  "MP4, MOV, and WebM": "MP4, MOV y WebM",
  "Your video stays on this device. Editing happens entirely in your browser.":
    "Tu vídeo permanece en este dispositivo. La edición se hace por completo en tu navegador.",
  "This browser can’t edit videos. Try a recent version of Chrome, Edge, Safari, or Firefox.":
    "Este navegador no puede editar vídeos. Prueba una versión reciente de Chrome, Edge, Safari o Firefox.",
  "This file couldn’t be opened as a video.": "Este archivo no se pudo abrir como vídeo.",
  Play: "Reproducir",
  Pause: "Pausa",
  Trim: "Recortar",
  "Trim start": "Inicio del recorte",
  "Trim end": "Fin del recorte",
  Playhead: "Cabezal de reproducción",
  "{duration} selected": "{duration} seleccionados",
  "Exact Cut Points": "Cortes exactos",
  "Exact cuts re-encode the video, which takes longer. Otherwise cuts snap to the nearest keyframe and the video is copied without quality loss.":
    "Los cortes exactos vuelven a codificar el vídeo, lo que tarda más. Si no, los cortes se ajustan al fotograma clave más cercano y el vídeo se copia sin perder calidad.",
  "Cover Frame": "Fotograma de portada",
  "Use Current Frame": "Usar fotograma actual",
  "Save Image": "Guardar imagen",
  "The cover frame is embedded in the exported video.":
    "El fotograma de portada se incluye en el vídeo exportado.",
  Details: "Detalles",
  Title: "Título",
  Description: "Descripción",
  "Remove Location": "Eliminar ubicación",
  "Removes where the video was recorded from the exported file.":
    "Elimina del archivo exportado el lugar donde se grabó el vídeo.",
  Duration: "Duración",
  Resolution: "Resolución",
  "Frame Rate": "Fotogramas por segundo",
  "File Size": "Tamaño del archivo",
  Format: "Formato",
  Captions: "Subtítulos",
  "Add Caption": "Añadir subtítulo",
  "Caption text": "Texto del subtítulo",
  "Delete caption": "Eliminar subtítulo",
  "Add captions at the playhead, or generate them from the audio.":
    "Añade subtítulos en el cabezal de reproducción o genéralos a partir del audio.",
  "Captions in Export": "Subtítulos al exportar",
  "Subtitle Track": "Pista de subtítulos",
  "Burned In": "Incrustados",
  "Download Captions": "Descargar subtítulos",
  "Generate Captions": "Generar subtítulos",
  "Uses the Whisper speech model on this device. The first time, it downloads about {size}.":
    "Usa el modelo de voz Whisper en este dispositivo. La primera vez descarga unos {size}.",
  "Listening to the audio…": "Escuchando el audio…",
  "This video has no audio to caption.": "Este vídeo no tiene audio que subtitular.",
  "Captions can be generated for up to 20 minutes at a time. Trim the video first.":
    "Se pueden generar subtítulos para un máximo de 20 minutos cada vez. Recorta el vídeo primero.",
  "No speech was found in this part of the video.": "No se encontró voz en esta parte del vídeo.",
  "Export Video": "Exportar vídeo",
  "Exporting… {percent}": "Exportando… {percent}",
  Cancel: "Cancelar",
  "This video couldn’t be exported.": "No se pudo exportar este vídeo.",
  "Save Video": "Guardar vídeo",
  "{fps} fps": "{fps} fps",
});
