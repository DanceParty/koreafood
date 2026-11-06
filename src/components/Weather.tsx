import { useEffect, useRef } from "preact/hooks";
import { dayOf, toParts, type DayNum } from "../lib/dates.ts";
import { day } from "../lib/store.ts";

type Kind = "snow" | "petal" | "rain" | "leaf";

interface Spell {
  kind: Kind;
  from: readonly [number, number];
  to: readonly [number, number];
  count: number;
}

/** Korean weather you would notice from a street corner. Rough dates, Seoul-centred. */
const SPELLS: readonly Spell[] = [
  { kind: "snow", from: [12, 7], to: [2, 18], count: 46 },
  { kind: "petal", from: [3, 30], to: [4, 16], count: 38 },
  { kind: "rain", from: [6, 23], to: [7, 24], count: 70 },
  { kind: "leaf", from: [10, 24], to: [11, 24], count: 30 },
];

function spellOn(current: DayNum): Spell | null {
  const { year } = toParts(current);
  for (const spell of SPELLS) {
    const start = dayOf(year, spell.from[0], spell.from[1]);
    const wraps = spell.to[0] < spell.from[0];
    const end = dayOf(wraps ? year + 1 : year, spell.to[0], spell.to[1]);
    if (current >= start && current <= end) return spell;
    if (wraps && current >= start - 365 && current <= end - 365) return spell;
  }
  return null;
}

interface Flake {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  phase: number;
  spin: number;
}

function draw(context: CanvasRenderingContext2D, kind: Kind, flake: Flake, time: number): void {
  const sway = Math.sin(time / 900 + flake.phase) * flake.drift;
  context.save();
  context.translate(flake.x + sway, flake.y);
  if (kind === "snow") {
    context.beginPath();
    context.arc(0, 0, flake.size * 0.5, 0, Math.PI * 2);
    context.fill();
  } else if (kind === "rain") {
    context.fillRect(0, 0, 1.4, flake.size * 3);
  } else {
    context.rotate(time / 1400 + flake.phase * flake.spin);
    context.beginPath();
    if (kind === "petal") {
      context.ellipse(0, 0, flake.size * 0.9, flake.size * 0.5, 0, 0, Math.PI * 2);
    } else {
      context.moveTo(0, flake.size);
      context.arc(0, flake.size, flake.size * 1.5, -Math.PI * 0.75, -Math.PI * 0.25);
      context.closePath();
    }
    context.fill();
  }
  context.restore();
}

export function Weather() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context || matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    let flakes: Flake[] = [];
    let current: Spell | null = null;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = element.clientWidth;
      height = element.clientHeight;
      element.width = width * ratio;
      element.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const seed = (spell: Spell) => {
      const count = Math.round(spell.count * Math.min(1.2, width / 1200 + 0.35));
      flakes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: spell.kind === "rain" ? 6 + Math.random() * 8 : 3 + Math.random() * 5,
        speed: spell.kind === "rain" ? 7 + Math.random() * 4 : 0.35 + Math.random() * 0.8,
        drift: spell.kind === "rain" ? 0 : 8 + Math.random() * 18,
        phase: Math.random() * Math.PI * 2,
        spin: Math.random() > 0.5 ? 1 : -1,
      }));
    };

    const tick = (time: number) => {
      frame = requestAnimationFrame(tick);
      if (!visible) return;
      const spell = spellOn(day.peek());
      if (spell !== current) {
        current = spell;
        if (spell) seed(spell);
        else flakes = [];
        context.clearRect(0, 0, width, height);
      }
      if (!current) return;
      const { kind } = current;
      context.clearRect(0, 0, width, height);
      context.fillStyle = getComputedStyle(element).color;
      context.globalAlpha = kind === "rain" ? 0.26 : 0.34;
      for (const flake of flakes) {
        flake.y += flake.speed;
        if (flake.y > height + 20) {
          flake.y = -20;
          flake.x = Math.random() * width;
        }
        draw(context, kind, flake, time);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
    });
    if (element.parentElement) observer.observe(element.parentElement);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvas} class="weather" aria-hidden="true" />;
}
