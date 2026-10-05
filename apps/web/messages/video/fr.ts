import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "Video Editor": "Éditeur vidéo",
  "Video Trimmer, Caption, and Metadata Editor":
    "Découpe vidéo, sous-titres et éditeur de métadonnées",
  "Trim videos, edit details, pick a cover frame, and add captions entirely in your browser. Your video never leaves this device.":
    "Découpez des vidéos, modifiez leurs détails, choisissez une image de couverture et ajoutez des sous-titres directement dans votre navigateur. Votre vidéo ne quitte jamais cet appareil.",
  "Choose Video": "Choisir une vidéo",
  "Choose Another": "Choisir une autre",
  "Drop a video here": "Déposez une vidéo ici",
  "Drop to open the video": "Déposez pour ouvrir la vidéo",
  "MP4, MOV, and WebM": "MP4, MOV et WebM",
  "Your video stays on this device. Editing happens entirely in your browser.":
    "Votre vidéo reste sur cet appareil. Le montage se fait entièrement dans votre navigateur.",
  "This browser can’t edit videos. Try a recent version of Chrome, Edge, Safari, or Firefox.":
    "Ce navigateur ne peut pas modifier de vidéos. Essayez une version récente de Chrome, Edge, Safari ou Firefox.",
  "This file couldn’t be opened as a video.": "Impossible d’ouvrir ce fichier en tant que vidéo.",
  Play: "Lire",
  Pause: "Pause",
  Trim: "Découper",
  "Trim start": "Début",
  "Trim end": "Fin",
  Playhead: "Tête de lecture",
  "{duration} selected": "{duration} sélectionnées",
  "Exact Cut Points": "Points de coupe exacts",
  "Exact cuts re-encode the video, which takes longer. Otherwise cuts snap to the nearest keyframe and the video is copied without quality loss.":
    "Les coupes exactes réencodent la vidéo, ce qui prend plus de temps. Sinon, les coupes s’alignent sur l’image clé la plus proche et la vidéo est copiée sans perte de qualité.",
  "Cover Frame": "Image de couverture",
  "Use Current Frame": "Utiliser l’image actuelle",
  "Save Image": "Enregistrer l’image",
  "The cover frame is embedded in the exported video.":
    "L’image de couverture est intégrée à la vidéo exportée.",
  Details: "Détails",
  Title: "Titre",
  Description: "Description",
  "Remove Location": "Supprimer le lieu",
  "Removes where the video was recorded from the exported file.":
    "Supprime du fichier exporté le lieu où la vidéo a été enregistrée.",
  Duration: "Durée",
  Resolution: "Résolution",
  "Frame Rate": "Fréquence d’images",
  "File Size": "Taille du fichier",
  Format: "Format",
  Captions: "Sous-titres",
  "Add Caption": "Ajouter un sous-titre",
  "Caption text": "Texte du sous-titre",
  "Delete caption": "Supprimer le sous-titre",
  "Add captions at the playhead, or generate them from the audio.":
    "Ajoutez des sous-titres à la tête de lecture ou générez-les à partir de l’audio.",
  "Captions in Export": "Sous-titres à l’export",
  "Subtitle Track": "Piste de sous-titres",
  "Burned In": "Incrustés",
  "Download Captions": "Télécharger les sous-titres",
  "Generate Captions": "Générer des sous-titres",
  "Uses the Whisper speech model on this device. The first time, it downloads about {size}.":
    "Utilise le modèle vocal Whisper sur cet appareil. La première fois, environ {size} sont téléchargés.",
  "Listening to the audio…": "Écoute de l’audio…",
  "This video has no audio to caption.": "Cette vidéo n’a pas d’audio à sous-titrer.",
  "Captions can be generated for up to 20 minutes at a time. Trim the video first.":
    "Les sous-titres peuvent être générés pour 20 minutes au maximum à la fois. Découpez d’abord la vidéo.",
  "No speech was found in this part of the video.":
    "Aucune parole n’a été trouvée dans cette partie de la vidéo.",
  "Export Video": "Exporter la vidéo",
  "Exporting… {percent}": "Exportation… {percent}",
  Cancel: "Annuler",
  "This video couldn’t be exported.": "Impossible d’exporter cette vidéo.",
  "Save Video": "Enregistrer la vidéo",
  "{fps} fps": "{fps} i/s",
});
