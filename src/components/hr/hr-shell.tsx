"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Building2Icon,
  CheckCircle2Icon,
  Clock3Icon,
  FileTextIcon,
  LayoutListIcon,
  MenuIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SearchIcon,
  SettingsIcon,
  UploadIcon,
  UsersIcon,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type HrShellProps = {
  children: React.ReactNode
  query: string
  onQueryChange: (query: string) => void
  onUpload: (file: File) => void
  activeView?: "documents" | "shared" | "signers" | "signed"
  headerMode?: "documents" | "minimal" | "none"
  onSharedActivityClick?: () => void
  onSignersClick?: () => void
  pendingCount: number
  inProgressCount: number
  completedCount: number
}

function HrShell({
  children,
  query,
  onQueryChange,
  onUpload,
  activeView,
  headerMode = "documents",
  onSharedActivityClick,
  onSignersClick,
  pendingCount,
  inProgressCount,
  completedCount,
}: HrShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  function handleFile(file?: File) {
    if (file) onUpload(file)
  }

  function navigate(href: string) {
    router.push(href)
    setMobileOpen(false)
  }

  function showSharedActivity() {
    if (onSharedActivityClick) {
      onSharedActivityClick()
      setMobileOpen(false)
      return
    }

    navigate("/hr/documents?view=shared")
  }

  return (
    <div className="flex h-svh overflow-hidden bg-[var(--paper)] text-foreground selection:bg-primary selection:text-primary-foreground">
      <div
        data-collapsed={sidebarCollapsed}
        className="hidden w-[240px] shrink-0 transition-[width] duration-300 ease-out data-[collapsed=true]:w-[60px] lg:block motion-reduce:transition-none"
      >
        <HrSidebar
          pathname={pathname}
          activeView={activeView}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          pendingCount={pendingCount}
          inProgressCount={inProgressCount}
          completedCount={completedCount}
          onSharedActivityClick={showSharedActivity}
          onSignersClick={onSignersClick}
          onNavigate={navigate}
        />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent className="bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">SleekSign navigation</SheetTitle>
          <HrSidebar
            pathname={pathname}
            activeView={activeView}
            collapsed={false}
            onCollapsedChange={() => {}}
            pendingCount={pendingCount}
            inProgressCount={inProgressCount}
            completedCount={completedCount}
            onSharedActivityClick={showSharedActivity}
            onSignersClick={onSignersClick}
            onNavigate={navigate}
          />
        </SheetContent>
        <main className={cn("grid min-w-0 flex-1", headerMode === "none" ? "grid-rows-[minmax(0,1fr)]" : "grid-rows-[auto_minmax(0,1fr)]")}>
          {headerMode !== "none" ? (
            <header className="flex min-h-14 items-center gap-2 border-b border-border bg-background px-3 py-2 sm:gap-3 sm:px-6">
              <SheetTrigger>
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
                  <MenuIcon />
                </Button>
              </SheetTrigger>
              {headerMode === "documents" ? (
                <>
                  <div className="relative min-w-0 flex-1 max-w-2xl">
                    <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(event) => onQueryChange(event.target.value)}
                      placeholder="Search documents and signers..."
                      className="h-8 bg-card pl-9 sm:pr-12"
                    />
                    <kbd className="absolute right-2 top-1/2 hidden -translate-y-1/2 border border-border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground md:block">
                      ⌘ K
                    </kbd>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(event) => {
                      handleFile(event.target.files?.[0])
                      event.target.value = ""
                    }}
                  />
                  <Button className="ml-auto gap-2" onClick={() => fileInputRef.current?.click()}>
                    <UploadIcon data-icon="inline-start" />
                    <span className="hidden sm:inline">Upload Document</span>
                  </Button>
                </>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Document Workspace
                  </p>
                </div>
              )}
            </header>
          ) : null}
          {children}
        </main>
      </Sheet>
    </div>
  )
}

function HrSidebar({
  pathname,
  activeView,
  collapsed,
  onCollapsedChange,
  pendingCount,
  inProgressCount,
  completedCount,
  onSharedActivityClick,
  onSignersClick,
  onNavigate,
}: {
  pathname: string
  activeView?: "documents" | "shared" | "signers" | "signed"
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  pendingCount: number
  inProgressCount: number
  completedCount: number
  onSharedActivityClick: () => void
  onSignersClick?: () => void
  onNavigate: (href: string) => void
}) {
  const isDocuments = activeView ? activeView === "documents" : pathname.startsWith("/hr/documents")
  const isShared = activeView === "shared"
  const isSigners = activeView === "signers"
  const isSigned = activeView === "signed" || pathname.startsWith("/hr/signed")

  function showSharedActivity() {
    onSharedActivityClick()
  }

  function showSigners() {
    if (onSignersClick) {
      onSignersClick()
      return
    }

    onNavigate("/hr/documents?view=signers")
  }

  return (
    <Sidebar data-collapsed={collapsed} className="h-full border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className={cn("flex h-14 items-center justify-between border-b border-sidebar-border p-4", collapsed && "justify-center px-2")}>
        {collapsed ? null : (
          <button className="flex min-w-0 items-center gap-2 text-left" onClick={() => onNavigate("/hr/documents")}>
            <span className="flex size-6 items-center justify-center bg-sidebar-primary text-[10px] font-bold text-sidebar-primary-foreground">
              S
            </span>
            <span className="truncate text-xs font-semibold uppercase tracking-widest transition-opacity duration-200">SleekSign</span>
          </button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className="hidden text-muted-foreground transition-colors lg:inline-flex"
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={cn(collapsed && "sr-only")}>Workspace</SidebarGroupLabel>
          <SidebarMenuButton active={isDocuments} onClick={() => onNavigate("/hr/documents")}>
            <LayoutListIcon />
            <span className={cn(collapsed && "sr-only")}>Documents</span>
          </SidebarMenuButton>
          <SidebarMenuButton active={isShared} onClick={showSharedActivity}>
            <Clock3Icon />
            <span className={cn(collapsed && "sr-only")}>Shared Activity</span>
          </SidebarMenuButton>
          <SidebarMenuButton active={isSigners} onClick={showSigners}>
            <UsersIcon />
            <span className={cn(collapsed && "sr-only")}>Signers</span>
          </SidebarMenuButton>
          <SidebarMenuButton active={isSigned} onClick={() => onNavigate("/hr/signed")}>
            <CheckCircle2Icon />
            <span className={cn(collapsed && "sr-only")}>Signed Docs</span>
          </SidebarMenuButton>
        </SidebarGroup>
        <div className={cn("mt-4 border border-sidebar-border bg-secondary p-3 transition-opacity duration-200", collapsed && "hidden")}>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/50">Status</p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <StatusLine icon={Clock3Icon} label="Pending" value={pendingCount} />
            <StatusLine icon={FileTextIcon} label="In progress" value={inProgressCount} />
            <StatusLine icon={CheckCircle2Icon} label="Completed" value={completedCount} />
          </div>
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <AccountMenu collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>
  )
}

function AccountMenu({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="relative">
      <button
        className="flex w-full items-center gap-3 px-1 text-left transition-colors hover:text-foreground"
        onClick={() => setOpen((current) => !current)}
      >
        <Avatar className="size-8 rounded-none">
          <AvatarFallback className="rounded-none bg-sidebar-primary font-mono text-[10px] text-sidebar-primary-foreground">AK</AvatarFallback>
        </Avatar>
        <div className={cn("min-w-0", collapsed && "hidden")}>
          <p className="truncate text-xs font-medium">Alex Kim</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-sidebar-foreground/60">HR Manager</p>
        </div>
      </button>

      {open ? (
        <div className="absolute bottom-[calc(100%+0.75rem)] left-0 z-50 w-56 border border-border bg-popover p-2 shadow-2xl">
          <div className="border-b border-border px-2 py-2">
            <p className="text-xs font-medium">Alex Kim</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">HR Workspace</p>
          </div>
          <button className="mt-2 flex h-8 w-full items-center gap-2 px-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground">
            <Building2Icon className="size-3.5" />
            Workspace
          </button>
          <ThemeToggle showLabel className="mt-1 h-8 w-full justify-start border-0 px-2 text-muted-foreground hover:bg-muted hover:text-foreground" />
          <button className="flex h-8 w-full items-center gap-2 px-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground">
            <SettingsIcon className="size-3.5" />
            Settings
          </button>
          <button className="mt-1 flex h-8 w-full items-center gap-2 border-t border-border px-2 pt-2 text-left font-mono text-[10px] uppercase tracking-widest text-red-300 hover:bg-red-500/10">
            Sign Out
          </button>
        </div>
      ) : null}
    </div>
  )
}

function StatusLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-2 text-sidebar-foreground/75">
      <Icon className="size-3.5" />
      <span className="text-xs">{label}</span>
      <span className="ml-auto font-mono text-xs text-sidebar-foreground/55">{value}</span>
    </div>
  )
}

export { HrShell }
