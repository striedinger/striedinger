import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Add files": "Adicionar arquivos",
  "Files in this session": "Arquivos nesta sessão",
  "Link copied": "Link copiado",
  "Could not copy the link. Copy the room code instead.":
    "Não foi possível copiar o link. Copie o código da sala.",
  "Copy invite link": "Copiar link do convite",
  "Sent directly": "Enviado diretamente",
  Download: "Baixar",
  "Drop to share": "Solte para compartilhar",
  "Drop files here": "Solte os arquivos aqui",
  "End-to-end encrypted": "Criptografia de ponta a ponta",
  "1 file": "1 arquivo",
  "Received file failed its integrity check": "O arquivo recebido falhou na verificação",
  "Larger than the 100 MB browser limit": "Ultrapassa o limite de 100 MB do navegador",
  "{count} files": "{count} arquivos",
  Join: "Entrar",
  "Have a room code?": "Tem um código de sala?",
  "Enter the complete 16-character room code.":
    "Digite o código completo da sala com 16 caracteres.",
  "Files you select or receive will appear here.":
    "Os arquivos selecionados ou recebidos aparecerão aqui.",
  "Waiting for another device": "Aguardando outro dispositivo",
  "1 device connected": "1 dispositivo conectado",
  "{count} devices connected": "{count} dispositivos conectados",
  "Preparing…": "Preparando…",
  "Files stay in your browser until a device connects. Up to 100 MB each.":
    "Os arquivos ficam no navegador até outro dispositivo se conectar. Até 100 MB cada.",
  "Your room": "Sua sala",
  "A direct connection could not be established. Try another network or browser.":
    "Não foi possível estabelecer uma conexão direta. Tente outra rede ou navegador.",
  Retry: "Tentar novamente",
  "Select files": "Selecionar arquivos",
  Sending: "Enviando",
  "Share invite": "Compartilhar convite",
  "Send the private link or room code to another device.":
    "Envie o link privado ou o código da sala para outro dispositivo.",
  "Transfer failed": "Falha na transferência",
  "Ready to send": "Pronto para enviar",
};
