import { Caveat } from "next/font/google";

/** Handwriting, only for the sticky notes on the desk. */
export const hand = Caveat({
  weight: ["500", "600"],
  subsets: ["latin"],
  variable: "--font-hand",
  display: "swap",
});
