<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLButtonAttributes } from "svelte/elements";

	type Variant = "default" | "outline" | "ghost" | "destructive" | "secondary";
	type Size = "default" | "sm" | "lg" | "icon";

	let {
		class: className = "",
		variant = "default" as Variant,
		size = "default" as Size,
		loading = false,
		loadingText,
		disabled = false,
		children,
		...rest
	}: HTMLButtonAttributes & {
		variant?: Variant;
		size?: Size;
		loading?: boolean;
		loadingText?: string;
		children?: import("svelte").Snippet;
	} = $props();

	const variants: Record<Variant, string> = {
		default: "bg-primary text-primary-foreground hover:bg-primary/90",
		outline: "border border-border bg-background hover:bg-muted",
		ghost: "hover:bg-muted",
		destructive: "bg-destructive text-white hover:bg-destructive/90",
		secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
	};

	const sizes: Record<Size, string> = {
		default: "h-8 px-2.5 text-xs",
		sm: "h-7 rounded-md px-2 text-[11px]",
		lg: "h-9 rounded-md px-4 text-sm",
		icon: "size-7",
	};
</script>

<button
	class={cn(
		"inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100",
		variants[variant],
		sizes[size],
		className,
	)}
	disabled={disabled || loading}
	aria-busy={loading || undefined}
	{...rest}
>
	{#if loading}
		<svg
			class="size-3.5 animate-spin"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<circle
				class="opacity-25"
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				stroke-width="4"
			/>
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
			/>
		</svg>
	{/if}
	{#if loading && loadingText}
		{loadingText}
	{:else}
		{@render children?.()}
	{/if}
</button>
