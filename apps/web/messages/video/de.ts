import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "Video Editor": "Video-Editor",
  "Video Trimmer, Caption, and Metadata Editor":
    "Video zuschneiden, Untertitel und Metadaten bearbeiten",
  "Trim videos, edit details, pick a cover frame, and add captions entirely in your browser. Your video never leaves this device.":
    "Schneide Videos zu, bearbeite Details, wähle ein Titelbild und füge Untertitel direkt im Browser hinzu. Dein Video verlässt nie dieses Gerät.",
  "Choose Video": "Video auswählen",
  "Choose Another": "Anderes auswählen",
  "Drop a video here": "Video hier ablegen",
  "Drop to open the video": "Ablegen, um das Video zu öffnen",
  "MP4, MOV, and WebM": "MP4, MOV und WebM",
  "Your video stays on this device. Editing happens entirely in your browser.":
    "Dein Video bleibt auf diesem Gerät. Die Bearbeitung erfolgt vollständig in deinem Browser.",
  "This browser can’t edit videos. Try a recent version of Chrome, Edge, Safari, or Firefox.":
    "Dieser Browser kann keine Videos bearbeiten. Versuche eine aktuelle Version von Chrome, Edge, Safari oder Firefox.",
  "This file couldn’t be opened as a video.": "Diese Datei konnte nicht als Video geöffnet werden.",
  Play: "Wiedergeben",
  Pause: "Pause",
  Trim: "Zuschneiden",
  "Trim start": "Anfang",
  "Trim end": "Ende",
  Playhead: "Abspielposition",
  "{duration} selected": "{duration} ausgewählt",
  "Exact Cut Points": "Exakte Schnittpunkte",
  "Exact cuts re-encode the video, which takes longer. Otherwise cuts snap to the nearest keyframe and the video is copied without quality loss.":
    "Exakte Schnitte codieren das Video neu, was länger dauert. Andernfalls rasten Schnitte am nächsten Keyframe ein und das Video wird verlustfrei kopiert.",
  "Cover Frame": "Titelbild",
  "Use Current Frame": "Aktuelles Bild verwenden",
  "Save Image": "Bild sichern",
  "The cover frame is embedded in the exported video.":
    "Das Titelbild wird in das exportierte Video eingebettet.",
  Details: "Details",
  Title: "Titel",
  Description: "Beschreibung",
  "Remove Location": "Ort entfernen",
  "Removes where the video was recorded from the exported file.":
    "Entfernt aus der exportierten Datei, wo das Video aufgenommen wurde.",
  Duration: "Dauer",
  Resolution: "Auflösung",
  "Frame Rate": "Bildrate",
  "File Size": "Dateigröße",
  Format: "Format",
  Captions: "Untertitel",
  "Add Caption": "Untertitel hinzufügen",
  "Caption text": "Untertiteltext",
  "Delete caption": "Untertitel löschen",
  "Add captions at the playhead, or generate them from the audio.":
    "Füge Untertitel an der Abspielposition hinzu oder erzeuge sie aus dem Ton.",
  "Captions in Export": "Untertitel im Export",
  "Subtitle Track": "Untertitelspur",
  "Burned In": "Eingebrannt",
  "Download Captions": "Untertitel herunterladen",
  "Generate Captions": "Untertitel erzeugen",
  "Uses the Whisper speech model on this device. The first time, it downloads about {size}.":
    "Verwendet das Sprachmodell Whisper auf diesem Gerät. Beim ersten Mal werden etwa {size} geladen.",
  "Listening to the audio…": "Ton wird analysiert …",
  "This video has no audio to caption.": "Dieses Video hat keinen Ton für Untertitel.",
  "Captions can be generated for up to 20 minutes at a time. Trim the video first.":
    "Untertitel können für bis zu 20 Minuten auf einmal erzeugt werden. Schneide das Video zuerst zu.",
  "No speech was found in this part of the video.":
    "In diesem Teil des Videos wurde keine Sprache gefunden.",
  "Export Video": "Video exportieren",
  "Exporting… {percent}": "Wird exportiert … {percent}",
  Cancel: "Abbrechen",
  "This video couldn’t be exported.": "Dieses Video konnte nicht exportiert werden.",
  "Save Video": "Video sichern",
  "{fps} fps": "{fps} fps",
});
