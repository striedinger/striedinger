// Typography for note bodies, matching the Notes paragraph styles: Title, Heading,
// Subheading, Body, Monostyled, block quotes, bulleted, dashed, and numbered lists, and
// round checklist buttons that fill with the Notes tint when checked.
export const noteContentClassName = [
  "text-[17px] leading-[22px] tracking-[-0.43px] break-words whitespace-pre-wrap text-(--ios-label) caret-(--ios-tint) outline-none selection:bg-(--ios-tint)/30",
  "[&_p]:min-h-[22px] [&_h1+*]:mt-1 [&_h2]:mt-1.5 [&_h3]:mt-1",
  "[&_h1]:min-h-[34px] [&_h1]:text-[28px] [&_h1]:leading-[34px] [&_h1]:font-bold [&_h1]:tracking-[0.36px]",
  "[&_h2]:min-h-7 [&_h2]:text-[22px] [&_h2]:leading-7 [&_h2]:font-bold [&_h2]:tracking-[0.35px]",
  "[&_h3]:min-h-6 [&_h3]:text-[19px] [&_h3]:leading-6 [&_h3]:font-semibold",
  "[&_pre]:font-mono [&_pre]:text-[15px] [&_pre]:leading-[22px] [&_pre]:whitespace-pre-wrap",
  "[&_blockquote]:border-l-[3px] [&_blockquote]:border-(--ios-tertiary-label) [&_blockquote]:pl-3",
  "[&_a]:text-(--ios-tint) [&_a]:underline",
  "[&_img]:my-2 [&_img]:block [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg",
  "[&_ul]:list-disc [&_ul]:pl-[26px] [&_ol]:list-decimal [&_ol]:pl-[26px] [&_li]:pl-0.5 [&_li]:marker:text-(--ios-label)",
  "[&_ul[data-type=dashed]]:list-none [&_ul[data-type=dashed]>li]:relative [&_ul[data-type=dashed]>li]:before:absolute [&_ul[data-type=dashed]>li]:before:-left-[18px] [&_ul[data-type=dashed]>li]:before:content-['–']",
  "[&_ul[data-type=checklist]]:list-none [&_ul[data-type=checklist]]:pl-0",
  "[&_ul[data-type=checklist]>li]:relative [&_ul[data-type=checklist]>li]:min-h-[30px] [&_ul[data-type=checklist]>li]:py-1 [&_ul[data-type=checklist]>li]:pl-[34px]",
  "[&_ul[data-type=checklist]>li]:before:absolute [&_ul[data-type=checklist]>li]:before:top-[4px] [&_ul[data-type=checklist]>li]:before:left-0 [&_ul[data-type=checklist]>li]:before:size-[22px] [&_ul[data-type=checklist]>li]:before:rounded-full [&_ul[data-type=checklist]>li]:before:border-[1.5px] [&_ul[data-type=checklist]>li]:before:border-(--ios-tertiary-label) [&_ul[data-type=checklist]>li]:before:bg-center [&_ul[data-type=checklist]>li]:before:bg-no-repeat [&_ul[data-type=checklist]>li]:before:cursor-pointer [&_ul[data-type=checklist]>li]:before:content-[''] [&_ul[data-type=checklist]>li]:before:transition-[background-color,border-color] [&_ul[data-type=checklist]>li]:before:duration-150",
  "[&_ul[data-type=checklist]>li[data-checked=true]]:before:border-(--ios-tint) [&_ul[data-type=checklist]>li[data-checked=true]]:before:bg-(--ios-tint) [&_ul[data-type=checklist]>li[data-checked=true]]:before:bg-size-[16px]",
  "[&_ul[data-type=checklist]>li[data-checked=true]]:before:bg-[url(data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27white%27%20stroke-width=%273%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3E%3Cpath%20d=%27m6.5%2012.5%203.5%203.5%207.5-8%27/%3E%3C/svg%3E)]",
  "[&_ul[data-type=checklist]>li[data-checked=true]]:text-(--ios-secondary-label)",
].join(" ");
