<script lang="ts">
  import { browser } from "$app/environment";
  import { onMount } from "svelte";
  import { fade, fly } from "svelte/transition";
  import ArrowRight from "phosphor-svelte/lib/ArrowRight";
  import Kanban from "phosphor-svelte/lib/Kanban";
  import MagnifyingGlass from "phosphor-svelte/lib/MagnifyingGlass";
  import ShareNetwork from "phosphor-svelte/lib/ShareNetwork";
  import type { Component } from "svelte";

  import { inview } from "$lib/actions/inview";
  import UseCaseSlider from "$lib/components/marketing/use-case-slider.svelte";

  let PacketModelShowcase = $state<Component | null>(null);

  type GalleryItem = {
    src: string;
    label: string;
    desc: string;
  };

  type MetricItem = {
    label: string;
    value: string;
    icon: Component;
    delay: number;
  };

  type UseCase = {
    title: string;
    model: string;
    detail: string;
  };

  const galleryItems: GalleryItem[] = [
    {
      src: "/dashboard/editor.png",
      label: "01 / Editor",
      desc: "Drag and drop signature fields directly onto your source PDF templates.",
    },
    {
      src: "/dashboard/sharing_document.png",
      label: "02 / Sharing",
      desc: "Construct models where candidates share a document, while getting a private copy.",
    },
    {
      src: "/dashboard/all_documents.png",
      label: "03 / Vault",
      desc: "Centralize all your operations and outstanding packet signing tasks.",
    },
    {
      src: "/dashboard/group_documents.png",
      label: "04 / Signed Copies",
      desc: "Easily retrieve, export, and manage completed document signatures.",
    },
  ];

  const metrics: MetricItem[] = [
    {
      label: "Model selection",
      value: "Shared, private, or employer-first modes",
      icon: ShareNetwork,
      delay: 200,
    },
    {
      label: "Document control",
      value: "Archive, restore, review, and route intuitively",
      icon: Kanban,
      delay: 400,
    },
    {
      label: "Signer visibility",
      value: "Only the right collaborators see the right fields",
      icon: MagnifyingGlass,
      delay: 600,
    },
  ];

  const useCases: UseCase[] = [
    {
      title: "Offer letters & contractor packs",
      model: "Collaborative",
      detail: "Multi-party signing on a single document.",
    },
    {
      title: "Onboarding forms",
      model: "Individual copies",
      detail: "Separate copies for each recipient.",
    },
    {
      title: "Strict NDA workflows",
      model: "Collaborative",
      detail: "Audit-ready shared agreement.",
    },
    {
      title: "Witness-based approvals",
      model: "Collaborative",
      detail: "HR, signer, and witness in one chain.",
    },
    {
      title: "Shared employer sign-off",
      model: "Shared-base",
      detail: "Employer signature feeds multiple copies.",
    },
  ];

  let activeGalleryTab = $state(0);
  let heroReady = $state(false);

  let showcaseInView = $state(false);
  let metricsInView = $state(false);
  let useCasesInView = $state(false);
  let galleryHeaderInView = $state(false);
  let finalSectionInView = $state(false);

  let hoveredUseCase = $state<number | null>(null);

  onMount(() => {
    document.body.classList.add("landing-page");
    heroReady = true;

    if (browser) {
      void import(
        "$lib/components/marketing/packet-model-showcase.svelte"
      ).then((mod) => {
        PacketModelShowcase = mod.default;
      });
    }

    return () => {
      document.body.classList.remove("landing-page");
    };
  });
</script>

<svelte:head>
  <title>SleekSign — Document signing workspace</title>
</svelte:head>

<main
  class="relative min-h-screen overflow-hidden bg-(--paper) font-sans text-foreground"
>
  <!-- Hero Section -->
  <section class="relative z-10 mx-auto w-[90%] max-w-7xl pb-10 pt-28">
    <div
      class="flex flex-col items-center text-center transition-all duration-800 ease-out"
      class:opacity-0={!heroReady}
      class:translate-y-5={!heroReady}
      class:opacity-100={heroReady}
      class:translate-y-0={heroReady}
    >
      <h3
        class="mb-16 font-cursive text-xl leading-none text-foreground lg:text-4xl font-semibold transition-opacity duration-800 delay-200"
        class:opacity-0={!heroReady}
        class:opacity-100={heroReady}
      >
        SleekSign
      </h3>

      <h1
        class="max-w-4xl text-[36px] font-light leading-[1.05] tracking-tight text-foreground transition-all duration-800 delay-[400ms] sm:text-[48px] lg:text-[60px]"
        class:opacity-0={!heroReady}
        class:translate-y-4={!heroReady}
        class:opacity-100={heroReady}
        class:translate-y-0={heroReady}
      >
        Show every signer exactly how a document
        <span
          class="-ml-1 pr-2 font-cursive text-[48px] leading-[0.5] text-orange-500 sm:text-[64px] lg:text-[76px]"
        >
          moves
        </span>
        before it ever gets shared.
      </h1>

      <p
        class="mt-4 max-w-2xl text-center text-[14px] font-light leading-[1.7] text-muted-foreground transition-opacity duration-800 delay-[600ms] sm:text-[16px]"
        class:opacity-0={!heroReady}
        class:opacity-100={heroReady}
      >
        Visually map out who shares a collaborative document, who receives a
        private isolated copy, and how employer signatures carry forward.
      </p>

      <div
        class="mt-6 flex flex-col justify-center gap-4 transition-all duration-600 delay-[800ms] sm:flex-row"
        class:opacity-0={!heroReady}
        class:translate-y-2={!heroReady}
        class:opacity-100={heroReady}
        class:translate-y-0={heroReady}
      >
        <a
          href="/docs"
          class="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full! bg-primary px-8 py-3.5 text-[10px] font-medium uppercase tracking-[0.15em] text-primary-foreground transition-all hover:bg-primary/90"
        >
          <span class="relative z-10 flex items-center gap-2">
            Get started
            <ArrowRight
              class="size-3.5 transition-transform group-hover:translate-x-1"
            />
          </span>
        </a>
      </div>
    </div>
  </section>

  <!-- Product Gallery Section -->
  <section class="relative z-10 mt-10 w-full overflow-hidden py-24">
    <div
      class="mx-auto mb-12 w-[90%] max-w-6xl text-center transition-all duration-800 ease-out"
      class:opacity-0={!galleryHeaderInView}
      class:translate-y-5={!galleryHeaderInView}
      class:opacity-100={galleryHeaderInView}
      class:translate-y-0={galleryHeaderInView}
      use:inview={{
        rootMargin: "-100px",
        callback: (inView) => {
          if (inView) galleryHeaderInView = true;
        },
      }}
    >
      <p
        class="mb-4 text-[9px] font-medium uppercase tracking-[0.2em] text-orange-500/70"
      >
        Platform Interface
      </p>
      <h2
        class="text-[24px] font-light leading-[1.2] tracking-tight text-foreground sm:text-[30px]"
      >
        Everything happens in one
        <span
          class="pr-1 font-cursive text-[32px] italic text-stone-500/80 sm:text-[40px]"
        >
          fluid
        </span>
        workspace.
      </h2>
    </div>

    <div
      class="mx-auto flex w-[90%] max-w-6xl flex-col items-center gap-8 md:flex-row lg:gap-16"
    >
      <div class="flex w-full flex-col gap-6 md:w-1/3">
        {#each galleryItems as item, i (item.src)}
          <button
            type="button"
            onclick={() => (activeGalleryTab = i)}
            class="text-left transition-all duration-300 {activeGalleryTab === i
              ? 'opacity-100'
              : 'opacity-[0.65] hover:opacity-[0.85]'}"
          >
            <div
              class="mb-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-foreground"
            >
              {item.label}
              {#if activeGalleryTab === i}
                <span
                  in:fly={{ x: -5, duration: 300 }}
                  out:fade={{ duration: 150 }}
                >
                  <ArrowRight class="size-3.5 text-orange-500/80" />
                </span>
              {/if}
            </div>
            <p class="text-[13px] font-normal leading-[1.6] text-foreground/65">
              {item.desc}
            </p>
          </button>
        {/each}
      </div>

      <div
        class="relative w-full overflow-hidden bg-transparent shadow-2xl md:w-2/3"
        style="aspect-ratio: 3600 / 2338"
      >
        {#each galleryItems as item, i (item.src)}
          <div
            class="absolute inset-0 transition-all duration-500"
            class:opacity-0={activeGalleryTab !== i}
            class:opacity-100={activeGalleryTab === i}
            class:scale-[0.97]={activeGalleryTab !== i}
            class:scale-100={activeGalleryTab === i}
            class:z-0={activeGalleryTab !== i}
            class:z-10={activeGalleryTab === i}
          >
            <img
              src={item.src}
              alt={item.label}
              class="h-full w-full object-contain"
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Graph Showcase -->
  <section class="relative z-10 mx-auto w-[85%] max-w-6xl py-24">
    <div
      class="transition-all duration-1000 ease-out"
      class:opacity-0={!showcaseInView}
      class:translate-y-8={!showcaseInView}
      class:opacity-100={showcaseInView}
      class:translate-y-0={showcaseInView}
      use:inview={{
        rootMargin: "-100px",
        callback: (inView) => {
          if (inView) showcaseInView = true;
        },
      }}
    >
      {#if PacketModelShowcase}
        <PacketModelShowcase />
      {:else}
        <div class="h-112 w-full" aria-hidden="true"></div>
      {/if}
    </div>
  </section>

  <UseCaseSlider />

  <!-- Features and Use Cases Outline -->
  <section
    class="relative z-10 mb-20 flex w-full justify-center py-12 lg:py-30 lg:pb-20"
  >
    <div class="grid w-fit grid-cols-1 items-center lg:grid-cols-2">
      <div
        class="ml-auto flex w-fit flex-col transition-all duration-800 ease-out lg:pr-10"
        class:opacity-0={!metricsInView}
        class:translate-y-5={!metricsInView}
        class:opacity-100={metricsInView}
        class:translate-y-0={metricsInView}
        use:inview={{
          rootMargin: "-50px",
          callback: (inView) => {
            if (inView) metricsInView = true;
          },
        }}
      >
        <div class="flex flex-col gap-6">
          {#each metrics as metric (metric.label)}
            <div
              class="flex flex-col items-center text-center transition-[opacity,transform] duration-[600ms] ease-out lg:items-start lg:text-right"
              style:transition-delay="{metric.delay}ms"
              class:opacity-0={!metricsInView}
              class:translate-y-4={!metricsInView}
              class:opacity-100={metricsInView}
              class:translate-y-0={metricsInView}
            >
              <div class="ml-auto flex items-center gap-2 opacity-80">
                <metric.icon class="size-5 text-foreground" />
                <p
                  class="text-[10px] font-medium uppercase tracking-[0.15em] text-foreground"
                >
                  {metric.label}
                </p>
              </div>
              <p
                class="mt-4 max-w-50 text-[13px] font-light leading-[1.6] text-muted-foreground"
              >
                {metric.value}
              </p>
            </div>
          {/each}
        </div>
      </div>

      <div
        class="flex flex-col text-left transition-all duration-800 ease-out delay-200 lg:border-l lg:border-border/50 lg:pl-10"
        class:opacity-0={!useCasesInView}
        class:translate-y-5={!useCasesInView}
        class:opacity-100={useCasesInView}
        class:translate-y-0={useCasesInView}
        use:inview={{
          rootMargin: "-50px",
          callback: (inView) => {
            if (inView) useCasesInView = true;
          },
        }}
      >
        <p
          class="mb-8 text-[9px] font-medium uppercase tracking-[0.2em] text-orange-500/70"
        >
          Use cases
        </p>
        <ul
          class="list-none space-y-5 text-[14px] font-light leading-relaxed text-foreground/80 sm:text-[15px]"
        >
          {#each useCases as useCase, index (useCase.title)}
            <li
              class="relative flex cursor-default items-center gap-3"
              onmouseenter={() => (hoveredUseCase = index)}
              onmouseleave={() => (hoveredUseCase = null)}
            >
              <div class="size-1 rounded-full bg-orange-500/40"></div>
              <span>{useCase.title}</span>

              {#if hoveredUseCase === index}
                <div
                  class="pointer-events-none absolute left-full z-50 ml-3 w-fit min-w-35 rounded-xl border border-border bg-white p-3 shadow-xl backdrop-blur-sm"
                  in:fly={{ x: 5, duration: 200 }}
                  out:fly={{ x: 5, duration: 200 }}
                >
                  <div class="flex flex-col gap-1">
                    <span
                      class="whitespace-nowrap text-[9px] font-bold uppercase tracking-wider text-orange-500"
                    >
                      {useCase.model}
                    </span>
                    <span
                      class="whitespace-nowrap text-[12px] font-light leading-tight text-muted-foreground"
                    >
                      {useCase.detail}
                    </span>
                  </div>
                  <div
                    class="absolute top-1/2 -left-1.5 -translate-y-1/2 border-y-[6px] border-r-[6px] border-y-transparent border-r-white"
                  ></div>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    </div>
  </section>

  <!-- Final Section -->
  <section
    class="relative z-10 mx-auto flex w-[85%] max-w-5xl flex-col items-center py-10 pb-28 text-center"
  >
    <div
      class="flex max-w-3xl flex-col items-center transition-all duration-800 ease-out"
      class:opacity-0={!finalSectionInView}
      class:scale-95={!finalSectionInView}
      class:opacity-100={finalSectionInView}
      class:scale-100={finalSectionInView}
      use:inview={{
        rootMargin: "-100px",
        callback: (inView) => {
          if (inView) finalSectionInView = true;
        },
      }}
    >
      <p
        class="mb-6 text-[9px] font-medium uppercase tracking-[0.2em] text-orange-500/70"
      >
        Built for operations
      </p>
      <h2
        class="text-[26px] font-light leading-[1.2] tracking-tight text-foreground sm:text-[32px]"
      >
        Everything after the
        <span
          class="-ml-1 pr-1 font-cursive text-[36px] italic leading-[0.5] text-stone-500/80 sm:text-[46px]"
        >
          graph
        </span>
        still lives inside the same system.
      </h2>
      <p
        class="relative mb-6 mt-8 max-w-xl text-center text-[14px] font-light leading-[1.8] text-muted-foreground"
      >
        <span class="absolute -left-4 -top-2 font-cursive text-4xl">&quot;</span
        >
        Place fields directly on the source PDF, assign roles, stop sharing when
        fields are still unassigned, and track signed files.
        <span class="absolute -right-4 bottom-0 font-cursive text-4xl"
          >&quot;</span
        >
      </p>
      <a
        href="/signup"
        class="group inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.15em] text-foreground transition-colors hover:text-orange-500"
      >
        Start signing
        <ArrowRight
          class="size-3.5 transition-transform group-hover:translate-x-1"
        />
      </a>
    </div>
  </section>

  <footer class="relative z-10 border-t border-border/70">
    <div class="mx-auto w-[90%] max-w-7xl py-12 sm:py-14">
      <div
        class="grid gap-12 sm:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(120px,0.5fr))]"
      >
        <div class="max-w-xl">
          <a
            href="/"
            aria-label="SleekSign home"
            class="inline-block font-cursive text-3xl font-semibold leading-none text-foreground sm:text-4xl"
          >
            SleekSign
          </a>
          <p
            class="mt-6 max-w-md text-[14px] font-light leading-[1.8] text-muted-foreground"
          >
            One calm workspace for preparing, routing, signing, and verifying
            the documents your team depends on.
          </p>
        </div>

        <nav aria-label="Product links">
          <p
            class="mb-5 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
          >
            Product
          </p>
          <ul class="space-y-3 text-[13px] font-light text-foreground/75">
            <li>
              <a class="transition-colors hover:text-orange-500" href="/docs"
                >Workspace</a
              >
            </li>
            <li>
              <a class="transition-colors hover:text-orange-500" href="/verify"
                >Verify a document</a
              >
            </li>
            <li>
              <a
                class="transition-colors hover:text-orange-500"
                href="/scan/sleeksign-1esdmd">Codebase scan</a
              >
            </li>
          </ul>
        </nav>

        <nav aria-label="Account links">
          <p
            class="mb-5 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground"
          >
            Account
          </p>
          <ul class="space-y-3 text-[13px] font-light text-foreground/75">
            <li>
              <a class="transition-colors hover:text-orange-500" href="/signin"
                >Sign in</a
              >
            </li>
            <li>
              <a class="transition-colors hover:text-orange-500" href="/signup"
                >Create workspace</a
              >
            </li>
            <li class="text-muted-foreground">
              © {new Date().getFullYear()} SleekSign
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </footer>
</main>
