"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { avatarUrl } from "@/lib/avatars";

const avatarSeeds = [32, 47, 12, 68];

export function TrustRow() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.24 }}
      className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {avatarSeeds.map((seed) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={seed}
              src={avatarUrl(seed, 56)}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-full border-2 border-white object-cover"
            />
          ))}
        </div>
        <div className="text-left">
          <p className="text-xs font-semibold text-ink">Trusted by 12,000+ teams</p>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={11} className="fill-yellow text-yellow" />
            ))}
            <span className="ml-1 text-xs text-neutral-400">4.9 average rating</span>
          </div>
        </div>
      </div>

      <div className="hidden h-8 w-px bg-neutral-200 sm:block" />

      <p className="text-xs text-neutral-400">Free forever plan · No credit card required</p>
    </motion.div>
  );
}
