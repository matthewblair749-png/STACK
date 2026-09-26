import { SiApple } from "react-icons/si";

export function AppleIcon({ size = 18 }: { size?: number }) {
  return <SiApple size={size} color="currentColor" />;
}

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v9h11.8c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.6-9.47 6.6-16.16z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.34l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.32-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.68 28.17A13.62 13.62 0 0 1 10.99 24c0-1.45.25-2.86.69-4.17v-5.7H4.34A21.98 21.98 0 0 0 2 24c0 3.55.85 6.9 2.34 9.87l7.34-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.13l7.34 5.7c1.74-5.2 6.59-9.08 12.32-9.08z" />
    </svg>
  );
}

export function MicrosoftIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 23 23">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}
