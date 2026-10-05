import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "Video Editor": "Editor video",
  "Video Trimmer, Caption, and Metadata Editor": "Taglio video, sottotitoli ed editor di metadati",
  "Trim videos, edit details, pick a cover frame, and add captions entirely in your browser. Your video never leaves this device.":
    "Taglia i video, modifica i dettagli, scegli un fotogramma di copertina e aggiungi sottotitoli direttamente nel browser. Il tuo video non lascia mai questo dispositivo.",
  "Choose Video": "Scegli video",
  "Choose Another": "Scegli un altro",
  "Drop a video here": "Trascina qui un video",
  "Drop to open the video": "Rilascia per aprire il video",
  "MP4, MOV, and WebM": "MP4, MOV e WebM",
  "Your video stays on this device. Editing happens entirely in your browser.":
    "Il tuo video resta su questo dispositivo. La modifica avviene interamente nel browser.",
  "This browser can’t edit videos. Try a recent version of Chrome, Edge, Safari, or Firefox.":
    "Questo browser non può modificare video. Prova una versione recente di Chrome, Edge, Safari o Firefox.",
  "This file couldn’t be opened as a video.": "Impossibile aprire questo file come video.",
  Play: "Riproduci",
  Pause: "Pausa",
  Trim: "Taglia",
  "Trim start": "Inizio",
  "Trim end": "Fine",
  Playhead: "Testina di riproduzione",
  "{duration} selected": "{duration} selezionati",
  "Exact Cut Points": "Punti di taglio esatti",
  "Exact cuts re-encode the video, which takes longer. Otherwise cuts snap to the nearest keyframe and the video is copied without quality loss.":
    "I tagli esatti ricodificano il video e richiedono più tempo. Altrimenti i tagli si allineano al fotogramma chiave più vicino e il video viene copiato senza perdita di qualità.",
  "Cover Frame": "Fotogramma di copertina",
  "Use Current Frame": "Usa fotogramma attuale",
  "Save Image": "Salva immagine",
  "The cover frame is embedded in the exported video.":
    "Il fotogramma di copertina viene incorporato nel video esportato.",
  Details: "Dettagli",
  Title: "Titolo",
  Description: "Descrizione",
  "Remove Location": "Rimuovi posizione",
  "Removes where the video was recorded from the exported file.":
    "Rimuove dal file esportato il luogo in cui è stato registrato il video.",
  Duration: "Durata",
  Resolution: "Risoluzione",
  "Frame Rate": "Frequenza fotogrammi",
  "File Size": "Dimensione file",
  Format: "Formato",
  Captions: "Sottotitoli",
  "Add Caption": "Aggiungi sottotitolo",
  "Caption text": "Testo del sottotitolo",
  "Delete caption": "Elimina sottotitolo",
  "Add captions at the playhead, or generate them from the audio.":
    "Aggiungi sottotitoli alla posizione della testina o generali dall’audio.",
  "Captions in Export": "Sottotitoli nell’esportazione",
  "Subtitle Track": "Traccia sottotitoli",
  "Burned In": "Impressi",
  "Download Captions": "Scarica sottotitoli",
  "Generate Captions": "Genera sottotitoli",
  "Uses the Whisper speech model on this device. The first time, it downloads about {size}.":
    "Usa il modello vocale Whisper su questo dispositivo. La prima volta scarica circa {size}.",
  "Listening to the audio…": "Ascolto dell’audio…",
  "This video has no audio to caption.": "Questo video non ha audio da sottotitolare.",
  "Captions can be generated for up to 20 minutes at a time. Trim the video first.":
    "Si possono generare sottotitoli per un massimo di 20 minuti alla volta. Taglia prima il video.",
  "No speech was found in this part of the video.":
    "Nessun parlato trovato in questa parte del video.",
  "Export Video": "Esporta video",
  "Exporting… {percent}": "Esportazione… {percent}",
  Cancel: "Annulla",
  "This video couldn’t be exported.": "Impossibile esportare questo video.",
  "Save Video": "Salva video",
  "{fps} fps": "{fps} fps",
});
