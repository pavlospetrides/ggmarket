"use client";

import { ChevronLeft, ChevronRight, ImageIcon, MapPin } from "lucide-react";
import * as React from "react";
import { ListingMediaImage } from "../listing-media-image";
import {
  classifyFavoriteRailGesture,
  favoriteRailCarouselIndex,
  favoriteRailIdentityChanged,
  favoriteRailLayoutTargets,
  favoriteRailMinGap,
  favoriteRailResponsiveSize,
  shouldRunFavoriteRailAnimation,
  softenFavoriteRailPull,
  type FavoriteRailItem,
} from "@/lib/favorite-rail";

const RATIO = 1.5;
const BASE_CARD_WIDTH = 168;
const MAX_STRETCH = 72;
const PERSPECTIVE = 1000;
const REST_Y = [7, -8, 5, -6, 8, -5, 6, -7];
const DROPS = [7, 18, 0, 12, 22, 4, 15, 9];

type Simulation = {
  x: number[];
  vx: number[];
  targetX: number[];
  swing: number[];
  swingVelocity: number[];
  cardLag: number[];
  rotationY: number[];
  rotationVelocity: number[];
  targetRotation: number[];
  lift: number[];
  liftVelocity: number[];
  targetLift: number[];
  pop: number[];
  popVelocity: number[];
  targetPop: number[];
  stretch: number[];
  stretchVelocity: number[];
  drag: number;
  pull: number;
  grabOffset: number;
  freeUntil: number;
  lastFrame: number;
  raf: number;
  carousel: boolean | null;
};

type PointerState = {
  id: number;
  index: number;
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
  startedAt: number;
  velocity: number;
  mode: "" | "none" | "pull" | "drag" | "swipe";
  kind: string;
  swipe: number;
};

export type FavoriteLanyardRailProps = {
  items: FavoriteRailItem[];
  activeId: string | null;
  flippedId: string | null;
  onActiveChange: (id: string | null) => void;
  onFlippedChange: (id: string | null) => void;
  className?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function emptySimulation(): Simulation {
  return {
    x: [], vx: [], targetX: [], swing: [], swingVelocity: [], cardLag: [],
    rotationY: [], rotationVelocity: [], targetRotation: [],
    lift: [], liftVelocity: [], targetLift: [], pop: [], popVelocity: [], targetPop: [],
    stretch: [], stretchVelocity: [], drag: -1, pull: -1, grabOffset: 0,
    freeUntil: 0, lastFrame: 0, raf: 0, carousel: null,
  };
}

function geometry(cardWidth: number, items: FavoriteRailItem[], compact: boolean) {
  const unit = cardWidth / BASE_CARD_WIDTH;
  const cardHeight = cardWidth * RATIO;
  const railRadius = Math.max(3, 5 * unit);
  const railY = 18 + railRadius;
  const ring = 10 * unit;
  const pivotY = railY + ring * 0.8;
  const strapWidth = Math.max(9, 13 * unit);
  const crimp = 7 * unit;
  const reel = 24 * unit;
  const cord = 14 * unit;
  const clipHeight = 15 * unit;
  const clipWidth = 34 * unit;
  const base = (compact ? 36 : 66) * unit;
  const straps = items.map((_, index) => base + (DROPS[index % DROPS.length] ?? 0) * unit * (compact ? 0.6 : 1));
  const reelTops = straps.map((length) => pivotY + length + crimp * 0.6);
  const clipTops = reelTops.map((top) => top + reel * 0.82 + cord);
  const cardTops = clipTops.map((top) => top + clipHeight * 0.62);
  const bottom = Math.max(0, ...cardTops.map((top) => top + cardHeight));
  return {
    cardWidth, cardHeight, unit, railRadius, railY, ring, pivotY, strapWidth, crimp,
    reel, cord, clipHeight, clipWidth, straps, reelTops, clipTops, cardTops,
    maxStretch: Math.round(MAX_STRETCH * Math.min(1, cardWidth / 150)),
    height: Math.ceil(bottom + 26 * unit + 12),
  };
}

function spring(
  values: number[],
  velocities: number[],
  target: number,
  index: number,
  stiffness: number,
  dampingRatio: number,
  step: number,
) {
  const value = values[index] ?? 0;
  const velocity = velocities[index] ?? 0;
  const nextVelocity = velocity + (-stiffness * (value - target) - 2 * dampingRatio * Math.sqrt(stiffness) * velocity) * step;
  velocities[index] = nextVelocity;
  values[index] = value + nextVelocity * step;
}

function railStops(simulation: Simulation, cardWidth: number, width: number, count: number) {
  const first = cardWidth * (1 + 0.08 * (simulation.pop[0] ?? 0));
  const last = cardWidth * (1 + 0.08 * (simulation.pop[count - 1] ?? 0));
  return [cardWidth * 0.28 + first / 2, width - cardWidth * 0.28 - last / 2] as const;
}

const METAL = "linear-gradient(90deg,#6f7480 0%,#eef1f5 18%,#8d929d 48%,#f8fafc 62%,#666b76 100%)"; // taste-skill-ignore: material rendering required by the supplied physical rail brief
const PURPLE_STRAP = "linear-gradient(90deg,#281d58 0%,#7658ec 18%,#9c87ff 48%,#6847df 78%,#241946 100%)"; // taste-skill-ignore: woven lanyard material, not decorative page fill

const FavoriteBadgeFaces = React.memo(function FavoriteBadgeFaces({
  item,
  eager,
}: {
  item: FavoriteRailItem;
  eager: boolean;
}) {
  return (
    <>
      <span
        data-face="front"
        className="absolute inset-0 flex flex-col overflow-hidden rounded-[0.72em] bg-[#111722] text-white [backface-visibility:hidden]"
        style={{ transform: "translateZ(1px)" }}
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[0.55em] bg-[#7658ec]" />
        <span className="relative mx-[0.7em] mt-[0.8em] block aspect-[4/3] shrink-0 overflow-hidden rounded-[0.45em] bg-[#0a0e15]">
          {item.image ? (
            <ListingMediaImage
              src={item.image}
              alt=""
              fill
              loading={eager ? "eager" : "lazy"}
              sizes="(max-width: 639px) 168px, (max-width: 1439px) 240px, 260px"
              className="pointer-events-none select-none object-contain p-[0.3em]"
              draggable={false}
            />
          ) : (
            <span className="grid size-full place-items-center text-[#768093]">
              <ImageIcon aria-hidden="true" className="size-[2.2em]" />
              <span className="sr-only">No image available</span>
            </span>
          )}
        </span>
        <span className="mx-[0.8em] mt-[0.6em] line-clamp-2 min-w-0 text-[0.92em] font-extrabold leading-[1.15] [overflow-wrap:anywhere]">
          {item.title}
        </span>
        <span className="mx-[0.8em] mt-[0.38em] block text-[1.16em] font-black leading-none tabular-nums text-white">
          {item.priceLabel}
        </span>
        <span className="mx-[0.8em] mb-[0.7em] mt-auto flex min-w-0 items-center justify-between gap-[0.45em] text-[0.62em] font-semibold text-[#aeb7c6]">
          <span className="min-w-0 truncate">{item.category}</span>
          <span className="shrink-0 rounded-full bg-[#262038] px-[0.6em] py-[0.28em] text-[#cbbfff]">LT</span>
        </span>
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: "var(--rail-shade,0)" }} />
      </span>

      <span
        data-face="back"
        className="absolute inset-0 flex flex-col overflow-hidden rounded-[0.72em] bg-[#171323] p-[0.9em] text-white [backface-visibility:hidden]"
        style={{ transform: "rotateY(180deg) translateZ(1px)" }}
      >
        <span className="block text-[0.65em] font-bold text-[#aa97ff]">Saved listing</span>
        <span className="mt-[0.55em] line-clamp-3 block text-[1em] font-extrabold leading-[1.12] [overflow-wrap:anywhere]">{item.title}</span>
        <span className="mt-[0.45em] block text-[1.2em] font-black tabular-nums">{item.priceLabel}</span>
        <span className="mt-[0.7em] grid gap-[0.4em] text-[0.68em] leading-snug text-[#bec5d0]">
          <span>{item.condition} · {item.category}</span>
          <span className="flex min-w-0 items-center gap-[0.35em]"><MapPin aria-hidden="true" className="size-[1em] shrink-0" /><span className="truncate">{item.location}</span></span>
          <span className="truncate">{item.sellerName}</span>
        </span>
        <span className="mt-auto rounded-[0.45em] bg-[#7658ec] px-[0.6em] py-[0.55em] text-center text-[0.68em] font-bold text-white">Details open below</span>
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: "var(--rail-shade,0)" }} />
      </span>
    </>
  );
});

export function FavoriteLanyardRail({
  items,
  activeId,
  flippedId,
  onActiveChange,
  onFlippedChange,
  className = "",
}: FavoriteLanyardRailProps) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const slots = React.useRef<Array<HTMLDivElement | null>>([]);
  const swings = React.useRef<Array<HTMLSpanElement | null>>([]);
  const straps = React.useRef<Array<HTMLSpanElement | null>>([]);
  const cords = React.useRef<Array<HTMLSpanElement | null>>([]);
  const hangs = React.useRef<Array<HTMLSpanElement | null>>([]);
  const flips = React.useRef<Array<HTMLSpanElement | null>>([]);
  const shadows = React.useRef<Array<HTMLSpanElement | null>>([]);
  const buttons = React.useRef<Array<HTMLButtonElement | null>>([]);
  const simulation = React.useRef(emptySimulation());
  const stepRef = React.useRef<(now: number) => void>(() => undefined);
  const pointer = React.useRef<PointerState>({ id: -1, index: -1, startX: 0, startY: 0, lastX: 0, lastTime: 0, startedAt: 0, velocity: 0, mode: "", kind: "", swipe: 0 });
  const pendingToggle = React.useRef(-1);
  const identity = React.useRef<string[]>([]);
  const [size, setSize] = React.useState({ width: 0, cardWidth: BASE_CARD_WIDTH, carousel: false, compact: false });
  const [focusIndex, setFocusIndex] = React.useState(0);
  const [reduced, setReduced] = React.useState(false);
  const count = items.length;
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const flippedIndex = items.findIndex((item) => item.id === flippedId);
  const geometryValue = React.useMemo(() => geometry(size.cardWidth, items, size.compact), [items, size.cardWidth, size.compact]);
  const motion = React.useRef({ documentVisible: true, intersecting: true });
  const live = React.useRef({
    items,
    activeIndex,
    flippedIndex,
    size,
    geometry: geometryValue,
    reduced,
    carouselIndex: 0,
    cyclic: false,
  });
  React.useLayoutEffect(() => {
    live.current = { ...live.current, items, activeIndex, flippedIndex, size, geometry: geometryValue, reduced };
  }, [activeIndex, flippedIndex, geometryValue, items, reduced, size]);

  const setActiveIndex = React.useCallback((index: number | null) => {
    const item = index === null ? null : live.current.items[index] ?? null;
    if (item) live.current.carouselIndex = index ?? 0;
    onActiveChange(item?.id ?? null);
  }, [onActiveChange]);

  const setFlippedIndex = React.useCallback((index: number | null) => {
    const item = index === null ? null : live.current.items[index] ?? null;
    onFlippedChange(item?.id ?? null);
  }, [onFlippedChange]);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  React.useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = (width: number) => {
      const { cardWidth, carousel, compact } = favoriteRailResponsiveSize(width, live.current.items.length);
      setSize((current) => Math.abs(current.width - width) < 0.5 && current.carousel === carousel && current.compact === compact && current.cardWidth === cardWidth
        ? current
        : { width, cardWidth, carousel, compact });
    };
    measure(stage.clientWidth);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) measure(entry.contentRect.width);
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, [count]);

  const paint = React.useCallback((index: number) => {
    const state = simulation.current;
    const railGeometry = live.current.geometry;
    const slot = slots.current[index];
    if (!slot) return;
    slot.style.transform = `translate3d(${((state.x[index] ?? 0) - railGeometry.cardWidth / 2).toFixed(2)}px,0,0)`;
    const swing = state.swing[index] ?? 0;
    if (swings.current[index]) swings.current[index]!.style.transform = `rotate(${swing.toFixed(3)}deg)`;
    const stretch = state.stretch[index] ?? 0;
    straps.current[index]?.style.setProperty("--rail-stretch", `${stretch.toFixed(2)}px`);
    if (cords.current[index]) cords.current[index]!.style.transform = `scaleY(${Math.max(0.12, (railGeometry.cord + stretch) / railGeometry.cord).toFixed(4)})`;
    const lift = state.lift[index] ?? 0;
    const pop = state.pop[index] ?? 0;
    if (hangs.current[index]) {
      hangs.current[index]!.style.transform = `translate3d(0,${(stretch - 5 * lift).toFixed(2)}px,0) rotate(${((state.cardLag[index] ?? 0) - swing).toFixed(3)}deg) scale(${(1 + 0.08 * pop).toFixed(4)})`;
    }
    const rotation = state.rotationY[index] ?? 0;
    const facing = Math.abs(Math.cos((rotation * Math.PI) / 180));
    if (flips.current[index]) {
      flips.current[index]!.style.transform = `perspective(${PERSPECTIVE}px) rotateY(${rotation.toFixed(2)}deg)`;
      flips.current[index]!.style.setProperty("--rail-shade", ((1 - facing) * 0.5).toFixed(3));
    }
    if (shadows.current[index]) {
      shadows.current[index]!.style.transform = `translate3d(${(railGeometry.cardWidth * 0.04 + lift * 3).toFixed(2)}px,${(railGeometry.cardHeight * 0.03 + lift * 6).toFixed(2)}px,0) scaleX(${Math.max(0.12, facing).toFixed(3)})`;
    }
  }, []);

  const snap = React.useCallback(() => {
    const state = simulation.current;
    for (let index = 0; index < live.current.items.length; index += 1) {
      state.x[index] = state.targetX[index] ?? 0;
      state.vx[index] = 0;
      state.swing[index] = 0;
      state.swingVelocity[index] = 0;
      state.cardLag[index] = 0;
      state.rotationY[index] = state.targetRotation[index] ?? 0;
      state.rotationVelocity[index] = 0;
      state.lift[index] = state.targetLift[index] ?? 0;
      state.liftVelocity[index] = 0;
      state.pop[index] = state.targetPop[index] ?? 0;
      state.popVelocity[index] = 0;
      if (index !== state.pull) {
        state.stretch[index] = 0;
        state.stretchVelocity[index] = 0;
      }
      paint(index);
    }
  }, [paint]);

  const step = React.useCallback((now: number) => {
    const state = simulation.current;
    state.raf = 0;
    if (!shouldRunFavoriteRailAnimation({ busy: true, reduced: live.current.reduced, ...motion.current })) {
      state.lastFrame = 0;
      return;
    }
    const railGeometry = live.current.geometry;
    const dt = state.lastFrame ? Math.min(0.1, (now - state.lastFrame) / 1000) : 1 / 60;
    state.lastFrame = now;
    const substeps = Math.max(3, Math.ceil(dt / 0.006));
    const h = dt / substeps;
    let busy = false;

    for (let pass = 0; pass < substeps; pass += 1) {
      for (let index = 0; index < live.current.items.length; index += 1) {
        if (index !== state.drag) {
          const velocity = state.vx[index] ?? 0;
          const restoring = now > state.freeUntil;
          const acceleration = restoring
            ? -130 * ((state.x[index] ?? 0) - (state.targetX[index] ?? 0)) - 2 * Math.sqrt(130) * 0.86 * velocity
            : -3.2 * velocity;
          state.vx[index] = velocity + acceleration * h;
          state.x[index] = (state.x[index] ?? 0) + (state.vx[index] ?? 0) * h;
        }
      }

      if (!live.current.size.carousel && live.current.items.length > 0) {
        const itemCount = live.current.items.length;
        const [left, right] = railStops(state, railGeometry.cardWidth, live.current.size.width, itemCount);
        for (let collisionPass = 0; collisionPass < 3; collisionPass += 1) {
          for (let index = 0; index < itemCount - 1; index += 1) {
            const minGap = favoriteRailMinGap(railGeometry.cardWidth, state.pop[index] ?? 0, state.pop[index + 1] ?? 0);
            const overlap = minGap - ((state.x[index + 1] ?? 0) - (state.x[index] ?? 0));
            if (overlap <= 0) continue;
            const firstShare = state.drag === index ? 0 : state.drag === index + 1 ? 1 : 0.5;
            state.x[index] = (state.x[index] ?? 0) - overlap * firstShare;
            state.x[index + 1] = (state.x[index + 1] ?? 0) + overlap * (1 - firstShare);
            state.swing[index] = clamp((state.swing[index] ?? 0) + overlap * 0.08, -18, 18);
            state.swing[index + 1] = clamp((state.swing[index + 1] ?? 0) - overlap * 0.08, -18, 18);
          }
        }
        if ((state.x[0] ?? 0) < left) state.x[0] = left;
        if ((state.x[itemCount - 1] ?? 0) > right) state.x[itemCount - 1] = right;
      }

      for (let index = 0; index < live.current.items.length; index += 1) {
        if (index !== state.pull) {
          const swing = state.swing[index] ?? 0;
          const velocity = state.swingVelocity[index] ?? 0;
          const nextVelocity = velocity + (-28 * swing - 2.2 * velocity) * h;
          state.swingVelocity[index] = nextVelocity;
          state.swing[index] = clamp(swing + nextVelocity * h, -18, 18);
        }
        state.cardLag[index] = (state.cardLag[index] ?? 0) + ((state.swing[index] ?? 0) - (state.cardLag[index] ?? 0)) * Math.min(1, h / 0.12);
        spring(state.rotationY, state.rotationVelocity, state.targetRotation[index] ?? 0, index, 170, 0.62, h);
        spring(state.lift, state.liftVelocity, state.targetLift[index] ?? 0, index, 200, 0.75, h);
        spring(state.pop, state.popVelocity, state.targetPop[index] ?? 0, index, 160, 0.55, h);
        if (index !== state.pull) {
          spring(state.stretch, state.stretchVelocity, 0, index, 220, 0.5, h);
          state.stretch[index] = Math.max(-railGeometry.cord * 0.85, state.stretch[index] ?? 0);
        }
      }
    }

    for (let index = 0; index < live.current.items.length; index += 1) {
      paint(index);
      if (
        Math.abs(state.vx[index] ?? 0) > 0.4 ||
        Math.abs((state.x[index] ?? 0) - (state.targetX[index] ?? 0)) > 0.25 ||
        Math.abs(state.swing[index] ?? 0) > 0.03 || Math.abs(state.swingVelocity[index] ?? 0) > 0.06 ||
        Math.abs((state.rotationY[index] ?? 0) - (state.targetRotation[index] ?? 0)) > 0.05 ||
        Math.abs(state.rotationVelocity[index] ?? 0) > 0.05 ||
        Math.abs((state.lift[index] ?? 0) - (state.targetLift[index] ?? 0)) > 0.002 ||
        Math.abs((state.pop[index] ?? 0) - (state.targetPop[index] ?? 0)) > 0.002 ||
        Math.abs(state.stretch[index] ?? 0) > 0.05 || Math.abs(state.stretchVelocity[index] ?? 0) > 0.1
      ) busy = true;
    }
    if (state.drag >= 0 || state.pull >= 0 || now < state.freeUntil) busy = true;
    if (shouldRunFavoriteRailAnimation({ busy, reduced: live.current.reduced, ...motion.current })) {
      state.raf = requestAnimationFrame((time) => stepRef.current(time));
    } else {
      state.lastFrame = 0;
      snap();
    }
  }, [paint, snap]);

  React.useLayoutEffect(() => {
    stepRef.current = step;
  }, [step]);

  const kick = React.useCallback(() => {
    const state = simulation.current;
    if (live.current.reduced) {
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = 0;
      snap();
      return;
    }
    if (!motion.current.documentVisible || !motion.current.intersecting || state.raf) return;
    state.lastFrame = 0;
    state.raf = requestAnimationFrame((time) => stepRef.current(time));
  }, [snap]);

  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onVisibility = () => {
      motion.current.documentVisible = document.visibilityState !== "hidden";
      if (!motion.current.documentVisible && simulation.current.raf) {
        cancelAnimationFrame(simulation.current.raf);
        simulation.current.raf = 0;
        simulation.current.lastFrame = 0;
      } else if (motion.current.documentVisible) kick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();
    const observer = new IntersectionObserver(([entry]) => {
      motion.current.intersecting = entry?.isIntersecting ?? false;
      if (!motion.current.intersecting && simulation.current.raf) {
        cancelAnimationFrame(simulation.current.raf);
        simulation.current.raf = 0;
        simulation.current.lastFrame = 0;
      } else if (motion.current.intersecting) kick();
    }, { threshold: 0.01 });
    observer.observe(stage);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
    };
  }, [kick]);

  React.useLayoutEffect(() => {
    if (!size.width) return;
    const state = simulation.current;
    const currentIndex = activeIndex >= 0 ? activeIndex : live.current.carouselIndex;
    const targets = favoriteRailLayoutTargets(size.width, size.cardWidth, size.carousel, size.carousel ? currentIndex : null, count);
    live.current.cyclic = targets.total > 0;
    const nextIdentity = items.map((item) => item.id);
    const fresh = state.carousel !== size.carousel || favoriteRailIdentityChanged(identity.current, nextIdentity);
    identity.current = nextIdentity;
    state.carousel = size.carousel;
    for (let index = 0; index < count; index += 1) {
      state.targetX[index] = (targets.xs[index] ?? 0) + (size.carousel ? pointer.current.swipe : 0);
      state.targetRotation[index] = flippedIndex === index ? 180 : activeIndex === index ? 0 : REST_Y[index % REST_Y.length] ?? 0;
      state.targetLift[index] = activeIndex === index || flippedIndex === index ? 1 : 0;
      state.targetPop[index] = flippedIndex === index ? 1 : 0;
      if (fresh) {
        state.x[index] = state.targetX[index] ?? 0;
        state.vx[index] = 0;
        state.swing[index] = 0;
        state.swingVelocity[index] = 0;
        state.cardLag[index] = 0;
        state.rotationY[index] = state.targetRotation[index] ?? 0;
        state.rotationVelocity[index] = 0;
        state.lift[index] = state.targetLift[index] ?? 0;
        state.liftVelocity[index] = 0;
        state.pop[index] = state.targetPop[index] ?? 0;
        state.popVelocity[index] = 0;
        state.stretch[index] = 0;
        state.stretchVelocity[index] = 0;
      }
    }
    for (const key of ["x", "vx", "targetX", "swing", "swingVelocity", "cardLag", "rotationY", "rotationVelocity", "targetRotation", "lift", "liftVelocity", "targetLift", "pop", "popVelocity", "targetPop", "stretch", "stretchVelocity"] as const) {
      state[key].length = count;
    }
    if (fresh) {
      for (let index = 0; index < count; index += 1) paint(index);
      if (!reduced) {
        for (let index = 0; index < count; index += 1) state.swingVelocity[index] = (index % 2 ? -1 : 1) * (25 - (index % 4) * 2);
      }
    }
    kick();
  }, [activeIndex, count, flippedIndex, items, kick, paint, reduced, size]);

  React.useEffect(() => () => {
    if (simulation.current.raf) cancelAnimationFrame(simulation.current.raf);
    simulation.current.raf = 0;
  }, []);

  const nearest = React.useCallback((clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const railGeometry = live.current.geometry;
    let best: number | null = null;
    let distance = Infinity;
    for (let index = 0; index < live.current.items.length; index += 1) {
      if (y < railGeometry.railY - 14 || y > (railGeometry.cardTops[index] ?? 0) + railGeometry.cardHeight + (simulation.current.stretch[index] ?? 0) + 12) continue;
      const candidate = Math.abs(x - (simulation.current.x[index] ?? 0));
      if (candidate < railGeometry.cardWidth / 2 + 10 && candidate < distance) {
        best = index;
        distance = candidate;
      }
    }
    return best;
  }, []);

  const retarget = React.useCallback(() => {
    const current = live.current.activeIndex >= 0 ? live.current.activeIndex : live.current.carouselIndex;
    const targets = favoriteRailLayoutTargets(live.current.size.width, live.current.size.cardWidth, live.current.size.carousel, current, live.current.items.length);
    for (let index = 0; index < live.current.items.length; index += 1) {
      simulation.current.targetX[index] = (targets.xs[index] ?? 0) + pointer.current.swipe;
    }
    if (live.current.reduced) snap();
    else kick();
  }, [kick, snap]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    const index = nearest(event.clientX, event.clientY);
    const now = performance.now();
    pendingToggle.current = -1;
    pointer.current = {
      id: event.pointerId,
      index: index ?? -1,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: now,
      startedAt: now,
      velocity: 0,
      mode: "",
      kind: event.pointerType,
      swipe: 0,
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const current = pointer.current;
    const state = simulation.current;
    const stage = stageRef.current;
    const now = performance.now();
    if (current.id !== event.pointerId || !stage) return;
    const deltaX = event.clientX - current.startX;
    const deltaY = event.clientY - current.startY;
    if (!current.mode) {
      const classified = classifyFavoriteRailGesture({
        deltaX,
        deltaY,
        elapsedMs: now - current.startedAt,
        pointerType: current.kind,
        index: current.index,
        carousel: live.current.size.carousel,
        reduced: live.current.reduced,
      });
      if (classified !== "pending") current.mode = classified;
      if (current.mode && current.mode !== "none") {
        try {
          stage.setPointerCapture(event.pointerId);
        } catch {
          current.mode = "none";
        }
      }
      if (current.mode === "pull") state.pull = current.index;
      if (current.mode === "drag") {
        state.drag = current.index;
        state.grabOffset = event.clientX - stage.getBoundingClientRect().left - (state.x[current.index] ?? 0);
      }
    }
    const elapsed = Math.max(1, now - current.lastTime);
    current.velocity = current.velocity * 0.6 + ((event.clientX - current.lastX) / elapsed) * 0.4;
    current.lastX = event.clientX;
    current.lastTime = now;
    if (current.mode === "pull") {
      const index = current.index;
      state.stretch[index] = softenFavoriteRailPull(Math.max(0, deltaY), live.current.geometry.maxStretch);
      state.stretchVelocity[index] = 0;
      const angle = clamp((-Math.atan2(deltaX, 220 + (state.stretch[index] ?? 0)) * 180) / Math.PI, -16, 16);
      state.swingVelocity[index] = ((angle - (state.swing[index] ?? 0)) / elapsed) * 500;
      state.swing[index] = angle;
      if (live.current.reduced) paint(index);
      else kick();
    } else if (current.mode === "drag" && state.drag >= 0) {
      const [left, right] = railStops(state, live.current.geometry.cardWidth, live.current.size.width, live.current.items.length);
      state.x[state.drag] = clamp(event.clientX - stage.getBoundingClientRect().left - state.grabOffset, left, right);
      state.vx[state.drag] = current.velocity * 1000;
      state.freeUntil = now + 900;
      kick();
    } else if (current.mode === "swipe") {
      current.swipe = deltaX;
      retarget();
    }
  };

  const finishPointer = (event: React.PointerEvent, cancelled: boolean) => {
    const current = pointer.current;
    if (current.id !== event.pointerId) return;
    const state = simulation.current;
    const stage = stageRef.current;
    if (stage?.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    pointer.current = { ...current, id: -1 };
    if (cancelled) {
      pendingToggle.current = -1;
      state.pull = -1;
      state.drag = -1;
      state.freeUntil = 0;
      if (current.index >= 0) state.vx[current.index] = 0;
      pointer.current.swipe = 0;
      retarget();
      kick();
      return;
    }
    if (current.mode === "pull") {
      state.pull = -1;
      kick();
      return;
    }
    if (current.mode === "drag") {
      state.drag = -1;
      state.freeUntil = performance.now() + 700;
      kick();
      return;
    }
    if (current.mode === "swipe") {
      const currentIndex = live.current.activeIndex >= 0 ? live.current.activeIndex : live.current.carouselIndex;
      const next = favoriteRailCarouselIndex({
        current: currentIndex,
        deltaX: event.clientX - current.startX,
        velocity: current.velocity,
        count: live.current.items.length,
        cyclic: live.current.cyclic,
      });
      pointer.current.swipe = 0;
      if (next === live.current.activeIndex) retarget();
      else setActiveIndex(next);
      return;
    }
    if (current.mode || current.index < 0 || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 8) return;
    if ((current.kind !== "mouse" || live.current.size.carousel) && live.current.activeIndex !== current.index) setActiveIndex(current.index);
    else pendingToggle.current = current.index;
  };

  const toggle = React.useCallback((index: number) => {
    if (live.current.flippedIndex === index) setFlippedIndex(null);
    else {
      setActiveIndex(index);
      setFlippedIndex(index);
    }
  }, [setActiveIndex, setFlippedIndex]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" && live.current.flippedIndex >= 0) {
      event.preventDefault();
      setFlippedIndex(null);
      return;
    }
    const target = event.target instanceof HTMLElement ? event.target : null;
    const badge = target?.dataset.favoriteBadge;
    if (event.key === "ArrowDown" && badge !== undefined) {
      event.preventDefault();
      const index = Number(badge);
      simulation.current.stretchVelocity[index] = 260;
      kick();
      return;
    }
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const from = live.current.activeIndex >= 0 ? live.current.activeIndex : focusIndex;
    const next = event.key === "Home" ? 0 : event.key === "End" ? count - 1 : clamp(from + (event.key === "ArrowRight" ? 1 : -1), 0, count - 1);
    setFocusIndex(next);
    setActiveIndex(next);
    buttons.current[next]?.focus({ preventScroll: true });
  };

  const railGeometry = geometryValue;
  const cardFontSize = railGeometry.cardWidth / 13.8;
  const centerIndex = size.carousel ? (activeIndex >= 0 ? activeIndex : 0) : null;
  const moveCarousel = (direction: -1 | 1) => {
    const current = centerIndex ?? 0;
    const next = live.current.cyclic
      ? (current + direction + count) % count
      : clamp(current + direction, 0, count - 1);
    setActiveIndex(next);
  };

  return (
    <section
      className={`relative isolate w-full overflow-hidden rounded-[var(--radius-xl)] bg-[#090d15] text-white ${className}`}
      data-favorite-lanyard-rail
      data-ui="favorite-lanyard"
      data-mode={size.carousel ? "carousel" : "rail"}
      data-active-id={activeId ?? ""}
      data-flipped-id={flippedId ?? ""}
    >
      <div
        ref={stageRef}
        role="group"
        aria-label="Saved listing collection"
        aria-roledescription="interactive hanging collection"
        className="relative w-full touch-pan-y select-none"
        style={{ height: railGeometry.height, overflowX: "clip" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => finishPointer(event, false)}
        onPointerCancel={(event) => finishPointer(event, true)}
        onKeyDown={onKeyDown}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-0" style={{ top: railGeometry.railY - railGeometry.railRadius, height: railGeometry.railRadius * 2 }}>
          <span className="absolute inset-x-3 top-full h-4 rounded-full bg-black/45 blur-[7px]" />
          <span className="absolute inset-0 rounded-full" style={{ background: METAL, boxShadow: "0 2px 0 rgba(255,255,255,.12) inset,0 5px 12px rgba(0,0,0,.45)" }} />
          {!size.carousel && [0, 1].map((side) => (
            <span key={side} className="absolute top-1/2 h-8 w-5 -translate-y-1/2 rounded-[3px]" style={{ [side ? "right" : "left"]: 7, background: METAL }} />
          ))}
        </div>

        {items.map((item, index) => {
          const active = activeIndex === index;
          const flipped = flippedIndex === index;
          const strap = railGeometry.straps[index] ?? 0;
          const reelTop = railGeometry.reelTops[index] ?? 0;
          const clipTop = railGeometry.clipTops[index] ?? 0;
          const cardOffset = (railGeometry.cardTops[index] ?? 0) - clipTop;
          return (
            <div
              key={item.id}
              ref={(node) => { slots.current[index] = node; }}
              data-listing-id={item.id}
              className="pointer-events-none absolute left-0 top-0"
              style={{ width: railGeometry.cardWidth, height: railGeometry.height, zIndex: flipped ? 40 : active ? 30 : 10 + index }}
            >
              <span aria-hidden="true" className="absolute block rounded-full" style={{ left: railGeometry.cardWidth / 2 - 5 * railGeometry.unit, top: railGeometry.railY - railGeometry.ring, width: 10 * railGeometry.unit, height: railGeometry.ring * 2, border: `${Math.max(1.8, 2.4 * railGeometry.unit)}px solid #b8bec8`, boxShadow: "inset 1px 0 0 rgba(0,0,0,.28),1px 2px 3px rgba(0,0,0,.35)" }} />
              <span ref={(node) => { swings.current[index] = node; }} className="absolute inset-0 block" style={{ transformOrigin: `${railGeometry.cardWidth / 2}px ${railGeometry.pivotY}px` }}>
                <span ref={(node) => { straps.current[index] = node; }} aria-hidden="true" className="absolute inset-0 block" style={{ ["--rail-stretch" as string]: "0px" }}>
                  <span className="absolute block" style={{ left: railGeometry.cardWidth / 2 - railGeometry.strapWidth / 2, top: railGeometry.pivotY - 2, width: railGeometry.strapWidth, height: `calc(${strap + 2}px + var(--rail-stretch))`, background: PURPLE_STRAP, boxShadow: "2px 3px 4px rgba(0,0,0,.35)" }}>
                    {/* taste-skill-ignore: stitched strap edge is part of the physical object */}<span className="absolute inset-y-0 left-[2px] right-[2px] border-x border-dashed border-white/25" />
                  </span>
                  <span className="absolute block rounded-[2px]" style={{ left: railGeometry.cardWidth / 2 - railGeometry.strapWidth / 2 - 2, top: `calc(${railGeometry.pivotY + strap - railGeometry.crimp * 0.4}px + var(--rail-stretch))`, width: railGeometry.strapWidth + 4, height: railGeometry.crimp, background: METAL }} />
                  <span className="absolute block rounded-full bg-[#262b35]" style={{ left: railGeometry.cardWidth / 2 - railGeometry.reel / 2, top: `calc(${reelTop}px + var(--rail-stretch))`, width: railGeometry.reel, height: railGeometry.reel, boxShadow: "inset 0 -2px 4px #000,0 3px 5px rgba(0,0,0,.4)" }}>
                    <span className="absolute inset-[18%] rounded-full" style={{ background: METAL }} />
                  </span>
                  <span ref={(node) => { cords.current[index] = node; }} className="absolute block w-[1.5px] bg-[#c9ced7]" style={{ left: railGeometry.cardWidth / 2 - 0.75, top: reelTop + railGeometry.reel * 0.82, height: railGeometry.cord, transformOrigin: "50% 0" }} />
                </span>
                <span ref={(node) => { hangs.current[index] = node; }} className="absolute left-0 block" style={{ top: clipTop, width: railGeometry.cardWidth, height: cardOffset + railGeometry.cardHeight, transformOrigin: `${railGeometry.cardWidth / 2}px 0` }}>
                  <span aria-hidden="true" className="absolute left-0 block" style={{ top: cardOffset, width: railGeometry.cardWidth, height: railGeometry.cardHeight, filter: `blur(${Math.max(5, 9 * railGeometry.unit)}px)` }}>
                    <span ref={(node) => { shadows.current[index] = node; }} className="absolute inset-0 rounded-[12px] bg-black/65" />
                  </span>
                  <button
                    ref={(node) => { buttons.current[index] = node; }}
                    type="button"
                    data-favorite-badge={index}
                    data-active={active || undefined}
                    data-flipped={flipped ? "true" : "false"}
                    tabIndex={index === (activeIndex >= 0 ? activeIndex : focusIndex) ? 0 : -1}
                    aria-label={`${item.title}, ${item.priceLabel}, item ${index + 1} of ${count}`}
                    aria-pressed={flipped}
                    className="pointer-events-auto absolute left-0 cursor-grab rounded-[0.72em] p-0 text-left outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b9aaff] active:cursor-grabbing"
                    style={{ top: cardOffset, width: railGeometry.cardWidth, height: railGeometry.cardHeight, fontSize: cardFontSize, border: 0, background: "transparent" }}
                    onFocus={() => { setFocusIndex(index); setActiveIndex(index); }}
                    onClick={(event) => {
                      const pending = pendingToggle.current;
                      pendingToggle.current = -1;
                      if (event.detail === 0 || pending === index) toggle(index);
                    }}
                  >
                    <span ref={(node) => { flips.current[index] = node; }} className="absolute inset-0 block [transform-style:preserve-3d]">
                      <FavoriteBadgeFaces item={item} eager={index === 0} />
                    </span>
                  </button>
                  <span aria-hidden="true" className="pointer-events-none absolute left-1/2 block -translate-x-1/2" style={{ top: 0, width: railGeometry.clipWidth, height: cardOffset + 10 * railGeometry.unit }}>
                    <span className="absolute left-1/2 top-0 h-full w-[42%] -translate-x-1/2 rounded-b-[3px]" style={{ background: METAL }} />
                    {/* taste-skill-ignore: recessed clip hole is part of the physical object */}<span className="absolute left-1/2 top-[12%] size-[28%] -translate-x-1/2 rounded-full bg-[#131823] shadow-inner" />
                  </span>
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {size.carousel && count > 1 ? (
        <div className="relative z-10 flex min-h-11 items-center justify-center gap-2 px-4 pb-2" role="group" aria-label="Choose saved listing">
          {!size.compact ? (
            <button type="button" className="hidden min-h-11 min-w-11 place-items-center rounded-full text-[#aeb7c6] hover:text-white focus-visible:ring-2 focus-visible:ring-[#b9aaff] sm:grid" onClick={() => moveCarousel(-1)} aria-label="Previous saved listing">
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
          ) : null}
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ${item.title}`}
              aria-current={centerIndex === index}
              onClick={() => setActiveIndex(index)}
              className={`grid min-h-11 min-w-11 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#b9aaff] ${centerIndex === index ? "text-[#a891ff]" : "text-[#50596a]"}`}
            >
              <span aria-hidden="true" className={`block h-1.5 rounded-full bg-current transition-[width] motion-reduce:transition-none ${centerIndex === index ? "w-6" : "w-1.5"}`} />
            </button>
          ))}
          {!size.compact ? (
            <button type="button" className="hidden min-h-11 min-w-11 place-items-center rounded-full text-[#aeb7c6] hover:text-white focus-visible:ring-2 focus-visible:ring-[#b9aaff] sm:grid" onClick={() => moveCarousel(1)} aria-label="Next saved listing">
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="relative z-10 px-5 pb-5 text-center text-sm text-[#aeb7c6] max-sm:sr-only" aria-live="polite">
        {flippedIndex >= 0 ? "Listing details opened below. Press Escape to return to the front." : size.carousel ? "Swipe to browse. Tap the centered card to flip." : "Drag, pull, or select a card. Select it again to flip."}
      </p>
    </section>
  );
}

export default FavoriteLanyardRail;
