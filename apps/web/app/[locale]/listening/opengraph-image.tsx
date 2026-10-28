import { ImageResponse } from "next/og";
import { connection } from "next/server";
import sharp from "sharp";

import { getListeningState } from "../../../lib/spotify/listening-state";
import { getListeningTranslator } from "../../../messages/listening/get-translator";
import { getRouteLocale } from "../../get-request-locale";
import { listeningImageSize } from "./listening-image";
import { loadArtwork, loadListeningImageFonts } from "./load-listening-image-assets";
import { SpotifyLogo } from "./spotify-logo";

interface OpenGraphImageProps {
  params: Promise<{ locale: string }>;
}

export const alt = "Press play to see what Hugo is listening to on Spotify";
export const size = listeningImageSize;
// A photographic card compresses to a fraction of the PNG the renderer makes.
export const contentType = "image/jpeg";
const jpegQuality = 82;

const equalizerBarHeights = [12, 22, 16, 26];
const spotifyGreen = "#1ed760";
const glassFill = "rgba(255, 255, 255, 0.14)";
const glassEdge = "inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.14)";
// X draws its play button over the center of the image, so the cover sits there and the play
// button lands on it like a record's; every word stays above or below it.
const coverSize = 340;
const coverTop = (listeningImageSize.height - coverSize) / 2;
const fallbackBackground =
  "radial-gradient(circle at 80% 20%, #ff8a4c 0%, rgba(255, 138, 76, 0) 45%), radial-gradient(circle at 15% 85%, #5a2bd8 0%, rgba(90, 43, 216, 0) 55%), linear-gradient(155deg, #1b1446 0%, #4a1a7a 50%, #c2306a 100%)";

/**
 * The card image X shows until someone presses play: the song Hugo is playing, or played
 * last, when the post is shared. X keeps the first image it fetches for a post, so the card
 * captures that moment while the live page always shows what is on now.
 */
export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  await connection();
  const [locale, state] = await Promise.all([getRouteLocale(params), getListeningState()]);
  const translate = await getListeningTranslator(locale);
  const track = state.status === "unavailable" ? null : state.track;
  const artwork = await loadArtwork(track?.artworkUrl ?? "", listeningImageSize);
  const cover = artwork?.cover;
  const backdrop = artwork?.backdrop;
  const badge = translate("Hugo’s Spotify");
  const callToAction = translate("Press play for what’s on now");
  const title = track?.title ?? translate("What’s Hugo listening to right now?");
  const subtitle = track ? track.subtitle : translate("Press play to see");
  const fonts = await loadListeningImageFonts({
    700: `${badge}${callToAction}${title}`,
    500: subtitle,
  });

  const image = new ImageResponse(
    <div
      style={{
        background: backdrop ? "#111111" : fallbackBackground,
        color: "#ffffff",
        display: "flex",
        fontFamily: "Inter",
        height: "100%",
        position: "relative",
        width: "100%",
      }}
    >
      {backdrop ? (
        // oxlint-disable-next-line nextjs/no-img-element -- The image renderer only draws <img>.
        <img
          src={backdrop}
          alt=""
          width={listeningImageSize.width}
          height={listeningImageSize.height}
          style={{ inset: 0, position: "absolute" }}
        />
      ) : null}
      <div
        style={{
          background: "linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.6) 100%)",
          display: "flex",
          inset: 0,
          position: "absolute",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          left: 48,
          position: "absolute",
          right: 48,
          top: 44,
        }}
      >
        <div style={chipStyle}>
          <div style={{ alignItems: "flex-end", display: "flex", gap: 4, height: 26 }}>
            {equalizerBarHeights.map(function renderBar(height) {
              return (
                <div
                  key={height}
                  style={{ background: spotifyGreen, borderRadius: 3, height, width: 5 }}
                />
              );
            })}
          </div>
          {badge}
        </div>
        <div style={chipStyle}>
          <SpotifyLogo width={28} height={28} fill={spotifyGreen} />
          {callToAction}
        </div>
      </div>

      <div
        style={{
          alignItems: "center",
          background: glassFill,
          borderRadius: 28,
          boxShadow: cover ? "0 30px 80px rgba(0, 0, 0, 0.5)" : glassEdge,
          display: "flex",
          height: coverSize,
          justifyContent: "center",
          left: (listeningImageSize.width - coverSize) / 2,
          overflow: "hidden",
          position: "absolute",
          top: coverTop,
          width: coverSize,
        }}
      >
        {cover ? (
          // oxlint-disable-next-line nextjs/no-img-element -- The image renderer only draws <img>.
          <img src={cover} alt="" width={coverSize} height={coverSize} />
        ) : (
          <SpotifyLogo width={120} height={120} fill={spotifyGreen} />
        )}
      </div>

      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          left: 80,
          position: "absolute",
          right: 80,
          top: coverTop + coverSize + 26,
        }}
      >
        <div
          style={{ ...singleLineStyle, fontSize: 46, fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          {title}
        </div>
        <div
          style={{
            ...singleLineStyle,
            color: "rgba(255, 255, 255, 0.72)",
            fontSize: 30,
            fontWeight: 500,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>,
    { ...listeningImageSize, fonts },
  );
  const jpeg = await sharp(Buffer.from(await image.arrayBuffer()))
    .jpeg({ quality: jpegQuality, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": contentType } });
}

const chipStyle = {
  alignItems: "center",
  background: glassFill,
  borderRadius: 40,
  boxShadow: glassEdge,
  display: "flex",
  fontSize: 26,
  fontWeight: 700,
  gap: 14,
  height: 56,
  padding: "0 24px 0 20px",
} as const;

const singleLineStyle = {
  display: "block",
  maxWidth: "100%",
  overflow: "hidden",
  textAlign: "center",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;
