<script lang="ts">
  import ArrowLeft from "phosphor-svelte/lib/ArrowLeft";
  import ArrowRight from "phosphor-svelte/lib/ArrowRight";
  import Buildings from "phosphor-svelte/lib/Buildings";
  import Check from "phosphor-svelte/lib/Check";
  import FileText from "phosphor-svelte/lib/FileText";
  import Lock from "phosphor-svelte/lib/Lock";
  import UserCheck from "phosphor-svelte/lib/UserCheck";
  import UsersThree from "phosphor-svelte/lib/UsersThree";
  import { onMount } from "svelte";

  type Slide = {
    id: string;
    number: string;
    title: string;
    description: string;
  };

  const slides: Slide[] = [
    {
      id: "01",
      number: "01",
      title: "Offer letters & contractor packs",
      description:
        "Automate hire documentation pipelines, generate compliant legal drafts, and gather secure signatures instantly.",
    },
    {
      id: "02",
      number: "02",
      title: "Onboarding forms",
      description:
        "Capture employee configurations, collect direct-deposit information, and register team profiles seamlessly.",
    },
    {
      id: "03",
      number: "03",
      title: "Strict NDA workflows",
      description:
        "Enforce enterprise intellectual property security with non-disclosure guardrails and detailed audit logs.",
    },
    {
      id: "04",
      number: "04",
      title: "Witness-based approvals",
      description:
        "Configure advanced signing flows requiring legal observers and authorized witness verifications.",
    },
    {
      id: "05",
      number: "05",
      title: "Shared employer sign-off",
      description:
        "Execute synchronized counter-signatures linking internal HR teams and prospective hires simultaneously.",
    },
  ];

  const autoplayDuration = 6000;

  let viewportEl = $state<HTMLDivElement | null>(null);
  let trackEl = $state<HTMLDivElement | null>(null);
  let activeIndex = $state(1);
  let progress = $state(0);
  let paused = $state(false);
  let viewportWidth = $state(0);
  let slideWidth = $state(0);
  let trackGap = $state(64);
  let pointerStart = $state<number | null>(null);
  let pointerLast = $state(0);
  let pointerLastAt = $state(0);
  let pointerVelocity = $state(0);
  let dragOffset = $state(0);

  const trackOffset = $derived(
    viewportWidth / 2 -
      slideWidth / 2 -
      activeIndex * (slideWidth + trackGap) +
      dragOffset,
  );

  function goTo(index: number) {
    activeIndex = (index + slides.length) % slides.length;
    progress = 0;
  }

  function handlePointerDown(event: PointerEvent) {
    if (!viewportEl) return;
    pointerStart = event.clientX;
    pointerLast = event.clientX;
    pointerLastAt = performance.now();
    pointerVelocity = 0;
    dragOffset = 0;
    viewportEl.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent) {
    if (pointerStart === null) return;
    const now = performance.now();
    const elapsed = Math.max(now - pointerLastAt, 1);
    pointerVelocity = ((event.clientX - pointerLast) / elapsed) * 1000;
    pointerLast = event.clientX;
    pointerLastAt = now;
    dragOffset = (event.clientX - pointerStart) * 0.34;
  }

  function handlePointerUp(event: PointerEvent) {
    if (pointerStart === null) return;
    const distance = event.clientX - pointerStart;
    if (distance > 40 || pointerVelocity > 200) goTo(activeIndex - 1);
    else if (distance < -40 || pointerVelocity < -200) goTo(activeIndex + 1);
    pointerStart = null;
    dragOffset = 0;
  }

  onMount(() => {
    if (!viewportEl || !trackEl) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function measure() {
      if (!viewportEl || !trackEl) return;
      viewportWidth = viewportEl.clientWidth;
      slideWidth =
        viewportEl.querySelector<HTMLElement>("[data-slide]")?.offsetWidth || 0;
      trackGap = Number.parseFloat(getComputedStyle(trackEl).columnGap) || 64;
    }

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(viewportEl);
    measure();

    let frame = 0;
    let previousTime = performance.now();
    function animate(time: number) {
      const elapsed = time - previousTime;
      previousTime = time;
      if (!paused && !reducedMotion) {
        progress += (elapsed / autoplayDuration) * 100;
        if (progress >= 100) goTo(activeIndex + 1);
      }
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
    };
  });
</script>

<section
  class="relative left-1/2 isolate flex w-screen -translate-x-1/2 select-none flex-col justify-center overflow-hidden text-foreground"
  aria-roledescription="carousel"
  aria-label="SleekSign use cases"
>
  <p
    class="text-[9px] text-center font-medium uppercase tracking-[0.2em] text-orange-500/70"
  >
    Use cases
  </p>

  <div
    bind:this={viewportEl}
    class="relative z-10 flex w-full touch-pan-y items-center overflow-visible"
    role="group"
    aria-label="Use case slides"
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={() => {
      pointerStart = null;
      dragOffset = 0;
    }}
    onmouseenter={() => (paused = true)}
    onmouseleave={() => (paused = false)}
    onfocusin={() => (paused = true)}
    onfocusout={() => (paused = false)}
  >
    <div
      bind:this={trackEl}
      class="flex w-max items-center gap-x-16 transition-transform duration-600 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] will-change-transform md:gap-x-24 motion-reduce:transition-none {pointerStart !==
      null
        ? 'cursor-grabbing !transition-none'
        : 'cursor-grab'}"
      style={`transform:translate3d(${trackOffset}px,0,0)`}
    >
      {#each slides as slide, index (slide.id)}
        {@const active = index === activeIndex}
        <article
          data-slide
          class="w-[70vw] max-w-[600px] shrink-0 sm:w-[58vw] md:w-[48vw] lg:w-[42vw] xl:w-[38vw]"
          aria-hidden={!active}
        >
          <button
            type="button"
            tabindex={active ? 0 : -1}
            aria-label={`${slide.title}, slide ${index + 1} of ${slides.length}`}
            aria-current={active ? "true" : undefined}
            class="flex w-full flex-col items-center gap-10 bg-transparent py-2 text-left text-foreground transition-[opacity,transform,filter] duration-700 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] md:flex-row md:gap-14 motion-reduce:transition-none {active
              ? 'cursor-default scale-100 opacity-100'
              : 'cursor-pointer scale-[0.88] opacity-35 blur-[0.5px]'}"
            onclick={() => {
              if (!active) goTo(index);
            }}
          >
            <div class="flex w-full flex-col justify-center md:w-1/2">
              <div class="mb-2 flex items-center gap-2">
                <i
                  class="size-2 rounded-sm transition-colors duration-500 {active
                    ? 'bg-orange-500'
                    : 'bg-muted-foreground/40'}"
                ></i>
                <span
                  class="font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground"
                >
                  {slide.number}
                </span>
              </div>
              <h2
                class="mb-3 text-[clamp(24px,2.35vw,30px)] font-medium leading-[1.2] tracking-[-0.025em]"
              >
                {slide.title}
              </h2>
              <p
                class="text-sm font-light leading-[1.65] text-muted-foreground"
              >
                {slide.description}
              </p>
            </div>

            <div
              class="relative flex h-[180px] w-full items-center justify-center overflow-hidden sm:h-[220px] md:h-[290px] md:w-1/2"
            >
              {#if slide.id === "01"}
                <div
                  class="flex size-full scale-[1.16] items-center justify-center"
                >
                  <div class="relative h-[140px] w-[110px]">
                    <div
                      class="absolute inset-0 -translate-x-3 translate-y-1 rotate-[-8deg] rounded-lg border border-border bg-card/65"
                    ></div>
                    <div
                      class="relative flex size-full flex-col justify-between overflow-hidden rounded-lg border border-border bg-card/90 p-2.5"
                    >
                      <div class="mb-1 flex items-center gap-1">
                        <FileText
                          class="size-2.5 text-orange-500"
                          aria-hidden="true"
                        />
                        <i class="h-1.5 w-12 rounded-full bg-border"></i>
                      </div>
                      <div class="grid gap-1">
                        <i class="h-1 w-full rounded-full bg-border"></i>
                        <i class="h-1 w-full rounded-full bg-border"></i>
                        <i class="h-1 w-2/3 rounded-full bg-border"></i>
                      </div>
                      <div
                        class="flex items-end justify-between border-t border-border pt-1.5"
                      >
                        <div class="grid gap-0.5">
                          <i class="h-0.5 w-6 rounded-full bg-border"></i>
                          <i class="h-1 w-8 rounded-full bg-border"></i>
                        </div>
                        <span
                          class="flex items-center gap-0.5 rounded border border-orange-500/30 bg-orange-500/8 px-1 py-0.5 font-mono text-[6px] font-bold uppercase tracking-[0.08em] text-orange-500 transition-[opacity,transform] duration-500 delay-[800ms] motion-reduce:transition-none {active
                            ? 'scale-100 opacity-100'
                            : 'scale-50 opacity-0'}"
                        >
                          <Check class="size-2" aria-hidden="true" />Signed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              {:else if slide.id === "02"}
                <div
                  class="flex size-full scale-[1.16] flex-col items-center justify-center gap-1.5"
                >
                  <div class="w-[120px]">
                    <i class="mb-0.5 block h-1 w-8 rounded-full bg-border"></i>
                    <div
                      class="flex h-6 items-center justify-between rounded border border-border bg-card/90 px-1.5 font-mono text-[8px] text-muted-foreground"
                    >
                      <span>John Doe</span>
                      <Check
                        class="size-2 text-orange-500 transition-transform duration-300 delay-500 motion-reduce:transition-none {active
                          ? 'scale-100'
                          : 'scale-0'}"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  <div class="w-[120px]">
                    <i class="mb-0.5 block h-1 w-12 rounded-full bg-border"></i>
                    <div
                      class="flex h-6 items-center justify-between rounded border border-border bg-card/90 px-1.5 font-mono text-[8px] text-muted-foreground"
                    >
                      <span>Direct Deposit</span>
                      <Check
                        class="size-2 text-orange-500 transition-transform duration-300 delay-1000 motion-reduce:transition-none {active
                          ? 'scale-100'
                          : 'scale-0'}"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>
              {:else if slide.id === "03"}
                <div class="relative h-[100px] w-[80px] scale-[1.16]">
                  <div
                    class="absolute inset-0 translate-x-3 translate-y-1 rotate-[8deg] rounded-lg border border-border bg-card/65"
                  ></div>
                  <div
                    class="relative flex size-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card/90 p-2.5"
                  >
                    <div
                      class="grid size-8 place-items-center rounded-full border border-orange-500/20 bg-orange-500/8 text-orange-500 {active
                        ? '[animation:lock-breathe_4s_ease-in-out_infinite]'
                        : ''} motion-reduce:animate-none"
                    >
                      <Lock class="size-3.5" aria-hidden="true" />
                    </div>
                    <div class="grid w-full justify-items-center gap-1">
                      <i class="h-1.5 w-12 rounded-full bg-border"></i>
                      <i class="h-1 w-16 rounded-full bg-border opacity-50"></i>
                    </div>
                    <span
                      class="flex items-center gap-0.5 rounded-full border border-orange-500/25 bg-orange-500/7 px-1.5 py-0.5 font-mono text-[6px] uppercase text-orange-500"
                    >
                      <i class="size-[3px] rounded-full bg-orange-500"
                      ></i>Secure
                    </span>
                  </div>
                </div>
              {:else if slide.id === "04"}
                <div
                  class="flex size-full scale-[1.16] items-center justify-center gap-3"
                >
                  <div class="grid justify-items-center gap-0.5">
                    <span
                      class="grid size-6 place-items-center rounded-full border border-border bg-card/90 text-muted-foreground"
                    >
                      <UserCheck class="size-3" aria-hidden="true" />
                    </span>
                    <small class="font-mono text-[6px] text-muted-foreground"
                      >Signer</small
                    >
                  </div>
                  <div class="relative h-px w-6 bg-border">
                    <i
                      class="absolute inset-y-0 left-0 bg-orange-500 transition-[width] duration-1000 motion-reduce:transition-none {active
                        ? 'w-full'
                        : 'w-0'}"
                    ></i>
                  </div>
                  <div class="grid justify-items-center gap-0.5">
                    <span
                      class="grid size-8 place-items-center rounded-full border bg-card/90 text-orange-500 {active
                        ? 'border-orange-500 [animation:witness-ring_2s_ease-in-out_infinite]'
                        : 'border-border'} motion-reduce:animate-none"
                    >
                      <UsersThree class="size-3" aria-hidden="true" />
                    </span>
                    <small class="font-mono text-[6px] text-muted-foreground"
                      >Witness</small
                    >
                  </div>
                </div>
              {:else}
                <div
                  class="flex size-full scale-[1.16] items-center justify-center gap-3"
                >
                  <div
                    class="flex h-[70px] w-[55px] flex-col justify-between rounded border border-border bg-card/90 p-1"
                  >
                    <Buildings
                      class="size-3 text-orange-500"
                      aria-hidden="true"
                    />
                    <i class="h-1.5 w-6 rounded-full bg-border"></i>
                    <i class="h-1 w-full rounded-full bg-border opacity-50"></i>
                  </div>
                  <div class="relative h-px w-4 bg-border">
                    <i
                      class="absolute inset-0 bg-orange-500 {active
                        ? '[animation:handoff-pulse_2s_ease-in-out_infinite]'
                        : 'opacity-20'} motion-reduce:animate-none"
                    ></i>
                  </div>
                  <div
                    class="flex h-[70px] w-[55px] flex-col justify-between rounded border border-border bg-card/90 p-1"
                  >
                    <UserCheck
                      class="size-3 text-orange-500"
                      aria-hidden="true"
                    />
                    <i class="h-1.5 w-6 rounded-full bg-border"></i>
                    <i class="h-1 w-full rounded-full bg-border opacity-50"></i>
                  </div>
                </div>
              {/if}
            </div>
          </button>
        </article>
      {/each}
    </div>
  </div>

  <div
    class="relative z-10 mx-auto flex w-[min(calc(100%_-_48px),1152px)] items-center gap-6"
  >
    <button
      type="button"
      class="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-transparent text-muted-foreground transition-[border-color,color,transform] duration-150 hover:border-foreground/40 hover:text-foreground active:scale-95 motion-reduce:transition-none"
      aria-label="Previous slide"
      onclick={() => goTo(activeIndex - 1)}
    >
      <ArrowLeft class="size-4" aria-hidden="true" />
    </button>
    <div class="flex flex-1 items-center gap-2">
      {#each slides as slide, index (slide.id)}
        <button
          type="button"
          class="flex-1 cursor-pointer border-0 bg-transparent py-3"
          aria-label={`Go to slide ${index + 1}`}
          aria-current={index === activeIndex ? "true" : undefined}
          onclick={() => goTo(index)}
        >
          <i
            class="relative block h-0.5 w-full overflow-hidden rounded-full bg-border"
          >
            <span
              class="absolute inset-y-0 left-0 rounded-[inherit] bg-orange-500"
              style={`width:${
                index === activeIndex ? progress : index < activeIndex ? 100 : 0
              }%`}
            ></span>
          </i>
        </button>
      {/each}
    </div>
    <button
      type="button"
      class="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-transparent text-muted-foreground transition-[border-color,color,transform] duration-150 hover:border-foreground/40 hover:text-foreground active:scale-95 motion-reduce:transition-none"
      aria-label="Next slide"
      onclick={() => goTo(activeIndex + 1)}
    >
      <ArrowRight class="size-4" aria-hidden="true" />
    </button>
  </div>
</section>

<style>
  @keyframes lock-breathe {
    0%,
    100% {
      transform: scale(1) rotate(0);
    }
    33% {
      transform: scale(1.05) rotate(4deg);
    }
    66% {
      transform: scale(1.05) rotate(-4deg);
    }
  }

  @keyframes witness-ring {
    0%,
    100% {
      border-color: var(--border);
    }
    50% {
      border-color: #f97316;
    }
  }

  @keyframes handoff-pulse {
    0%,
    100% {
      opacity: 0.2;
    }
    50% {
      opacity: 1;
    }
  }
</style>
