<script lang="ts">
  import { page } from "$app/stores";
  import UserMenu from "$lib/components/docs/user-menu.svelte";
  import WorkspaceSwitcher from "$lib/components/docs/workspace-switcher.svelte";
  import type { TeamSummary, WorkspaceSummary } from "$lib/server/workspace";
  import { cn } from "$lib/utils";

  let {
    user,
    workspaceId,
    workspaces,
    teams,
    teamsByWorkspace = {},
  }: {
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };
    workspaceId: string;
    workspaces: WorkspaceSummary[];
    teams: TeamSummary[];
    teamsByWorkspace?: Record<string, TeamSummary[]>;
  } = $props();

  const NAV_ITEMS = [
    { label: "Documents", href: "/docs" },
    { label: "Shared activity", href: "/shared" },
    { label: "Signers", href: "/signers" },
    { label: "Signed docs", href: "/signed-docs" },
    { label: "Settings", href: "/settings" },
  ] as const;

  function isNavActive(pathname: string, href: string) {
    if (href === "/docs") {
      return pathname === "/docs";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }
</script>

<header class="sticky top-0 z-40 border-b border-foreground/5 bg-background">
  <div class="flex h-12 items-center gap-4 max-w-6xl mx-auto">
    <a
      href="/docs"
      data-sveltekit-preload-data="hover"
      class="shrink-0 font-cursive text-xl font-semibold leading-none text-foreground"
    >
      SleekSign
    </a>

    <nav
      class="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex"
    >
      {#each NAV_ITEMS as item (item.href)}
        {@const active = isNavActive($page.url.pathname, item.href)}
        <a
          href={item.href}
          data-sveltekit-preload-data="hover"
          class={cn(
            "rounded-md mx-2 text-xs",
            active
              ? "font-semibold text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </a>
      {/each}
    </nav>

    <div class="ml-auto flex items-center gap-1 sm:gap-2">
      <WorkspaceSwitcher
        {workspaceId}
        {workspaces}
        {teams}
        {teamsByWorkspace}
      />
      <UserMenu {user} />
    </div>
  </div>
</header>
