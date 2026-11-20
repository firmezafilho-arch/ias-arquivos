// Ícones em SVG embutido: zero downloads, zero dependências.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (props: P) => ({
  width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, ...props,
});

export const IconHome = (p: P) => (<svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>);
export const IconChat = (p: P) => (<svg {...base(p)}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" /></svg>);
export const IconCouncil = (p: P) => (<svg {...base(p)}><circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="17" r="2.5" /><circle cx="19" cy="17" r="2.5" /><path d="M12 7.5v4M12 11.5 6.8 15.2M12 11.5l5.2 3.7" /></svg>);
export const IconServer = (p: P) => (<svg {...base(p)}><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></svg>);
export const IconGamepad = (p: P) => (<svg {...base(p)}><path d="M6 11h4M8 9v4M15 12h.01M18 10h.01" /><path d="M17.3 5H6.7a4 4 0 0 0-4 3.6l-.6 6A3 3 0 0 0 7.4 17l1.6-2h6l1.6 2a3 3 0 0 0 5.3-2.4l-.6-6A4 4 0 0 0 17.3 5Z" /></svg>);
export const IconSettings = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>);
export const IconKey = (p: P) => (<svg {...base(p)}><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2 2" /></svg>);
export const IconTrash = (p: P) => (<svg {...base(p)}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>);
export const IconFolder = (p: P) => (<svg {...base(p)}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>);
export const IconRefresh = (p: P) => (<svg {...base(p)}><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" /><path d="M21 3v5h-5" /></svg>);
export const IconLogo = (p: P) => (
  <svg width={28} height={28} viewBox="0 0 32 32" {...p}>
    <rect width="32" height="32" rx="8" fill="var(--accent)" />
    <g stroke="#fff" strokeWidth="2" opacity=".95"><path d="M16 16 16 8M16 16l7 4M16 16l-7 4" /></g>
    <g fill="#fff"><circle cx="16" cy="8" r="2.6" /><circle cx="23" cy="20" r="2.6" /><circle cx="9" cy="20" r="2.6" /><circle cx="16" cy="16" r="3.4" /></g>
    <circle cx="16" cy="16" r="1.6" fill="var(--accent)" />
  </svg>
);
