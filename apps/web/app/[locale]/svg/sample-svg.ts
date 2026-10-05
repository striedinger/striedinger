/** The drawing the editor opens with, so the preview shows something right away. */
export const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <defs>
    <linearGradient id="sunset" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffb340"/>
      <stop offset="1" stop-color="#ff2d55"/>
    </linearGradient>
    <clipPath id="icon">
      <rect width="240" height="240" rx="54"/>
    </clipPath>
  </defs>
  <g clip-path="url(#icon)">
    <rect width="240" height="240" fill="url(#sunset)"/>
    <circle cx="120" cy="108" r="44" fill="#fff" fill-opacity="0.92"/>
    <path d="M0 184c40-30 80-30 120 0s80 30 120 0v56H0z" fill="#fff" fill-opacity="0.35"/>
  </g>
</svg>
`;
