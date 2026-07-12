import type { ReactNode } from "react";

interface SocialLinkProps {
  children: ReactNode;
  external?: boolean;
  href: string;
  label: string;
}

export function SocialLink({ children, external = false, href, label }: SocialLinkProps) {
  return (
    <a
      className="block size-8 fill-current text-current opacity-30 transition-opacity duration-500 hover:opacity-80 focus-visible:rounded-sm focus-visible:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current [&_svg]:size-full"
      href={href}
      aria-label={label}
      rel={external ? "noreferrer" : undefined}
      target={external ? "_blank" : undefined}
    >
      {children}
    </a>
  );
}
