// Generic stock-style placeholder headshots (pravatar.cc) for fictional demo
// personas only — no real, identifiable individuals are depicted.
export function avatarUrl(seed: number, size = 128) {
  return `https://i.pravatar.cc/${size}?img=${seed}`;
}
