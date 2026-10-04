"use client";

import { ToolError, type ToolErrorProps } from "../components/tool-error";
import "./[locale]/(site)/site.css";

export default function GlobalError(props: ToolErrorProps) {
  return (
    <html lang="en">
      <head>
        <title>Something went wrong | Hugo Striedinger</title>
      </head>
      <body>
        <ToolError {...props} />
      </body>
    </html>
  );
}
