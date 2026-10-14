import { notFound } from "next/navigation";
import { hand } from "@/components/landing/story/fonts";
import { Coffee, DeskClock, Highlighter, StickyNote } from "@/components/landing/story/desk";
import { Laptop } from "@/components/landing/story/laptop";

/** Dev-only: the desk objects side by side, still, for tuning how they look. ?zoom=2 to inspect details. */
export default async function DeskPreview({ searchParams }: { searchParams: Promise<{ zoom?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const zoom = Number((await searchParams).zoom) || 1;
  return (
    <div className={`calm ${hand.variable} relative min-h-screen overflow-auto`}>
      <div className="relative h-[760px] w-[1200px]" style={{ transform: `scale(${zoom})`, transformOrigin: "0 0" }}>
        <Laptop className="left-[20px] top-[380px]" />
        <DeskClock className="left-[460px] top-[60px]" />
        <Coffee className="left-[830px] top-[230px]" />
        <StickyNote lines={["1. reply to Sarah", "2. fix the build", "3. prep 2pm"]} className="left-[880px] top-[20px] rotate-[-4deg]" />
        <Highlighter className="left-[460px] top-[330px] rotate-[-9deg]" />
        <Highlighter className="left-[760px] top-[460px]" />
      </div>
    </div>
  );
}
