<script lang="ts">
	import Button from "$lib/components/ui/button.svelte";
	import Input from "$lib/components/ui/input.svelte";
	import {
		UNASSIGNED_ROLE,
		type Field,
		type RoleConfig,
	} from "$lib/field-utils";

	let {
		selectedField,
		roleConfigs,
		onUpdate,
		onRoleConfigsChange,
		onDelete,
	}: {
		selectedField?: Field;
		roleConfigs: RoleConfig[];
		onUpdate: (fieldId: string, updates: Partial<Field>) => void;
		onRoleConfigsChange: (roleConfigs: RoleConfig[]) => void;
		onDelete: (fieldId: string) => void;
	} = $props();

	let newSignerRole = $state("");

	const controlClass = "h-8 rounded-md border border-border bg-background px-2 text-xs";
</script>

{#snippet roleScopeSection()}
	<div class="grid gap-2">
		<span class="font-mono text-[10px] font-medium text-muted-foreground">Role scopes</span>
		<div class="grid gap-2">
			{#each roleConfigs as role (role.name)}
				<div class="grid grid-cols-[minmax(0,1fr)_110px_auto] gap-2">
					<Input value={role.name} readonly class="h-8 font-mono text-xs" />
					<select
						class={controlClass}
						value={role.scope}
						onchange={(event) => {
							const scope = event.currentTarget.value === "shared" ? "shared" : "private";
							onRoleConfigsChange(
								roleConfigs.map((entry) =>
									entry.name === role.name ? { ...entry, scope } : entry,
								),
							);
						}}
					>
						<option value="private">Private</option>
						<option value="shared">Shared</option>
					</select>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="h-8 w-8 px-0"
						aria-label={`Remove ${role.name} role`}
						onclick={() =>
							onRoleConfigsChange(roleConfigs.filter((entry) => entry.name !== role.name))}
					>
						×
					</Button>
				</div>
			{/each}
		</div>
	</div>
	<div class="grid gap-2">
		<span class="font-mono text-[10px] font-medium text-muted-foreground">Add signer role</span>
		<div class="flex gap-2">
			<Input bind:value={newSignerRole} placeholder="Witness" class="h-8 font-mono text-xs" />
			<Button
				type="button"
				variant="outline"
				size="sm"
				class="h-8"
				onclick={() => {
					const role = newSignerRole.trim();
					if (!role || roleConfigs.some((entry) => entry.name === role)) {
						newSignerRole = "";
						return;
					}
					onRoleConfigsChange([...roleConfigs, { name: role, scope: "private" }]);
					newSignerRole = "";
				}}
			>
				Add
			</Button>
		</div>
	</div>
	<p class="border border-border bg-muted/20 px-3 py-2 font-mono text-[10px] text-muted-foreground">
		Shared roles appear across collaborative flows. Private roles stay unique per recipient copy.
	</p>
{/snippet}

<div class="flex h-full flex-col gap-4">
	{#if selectedField}
		<div>
			<div class="flex items-center gap-2 font-mono text-[10px] font-semibold">
				<span class="size-2 bg-primary"></span>
				{selectedField.type} Field
			</div>
			<p class="mt-1 font-mono text-[10px] text-muted-foreground">
				Page {selectedField.page + 1}
			</p>
		</div>
		<label class="flex flex-col gap-1.5">
			<span class="font-mono text-[10px] font-medium text-muted-foreground">Assigned to</span>
			<select
				class={controlClass}
				value={selectedField.assigneeRole}
				onchange={(event) =>
					onUpdate(selectedField!.id, { assigneeRole: event.currentTarget.value })}
			>
				<option value={UNASSIGNED_ROLE}>Unassigned</option>
				{#each roleConfigs as role (role.name)}
					<option value={role.name}>{role.name}</option>
				{/each}
			</select>
		</label>
	{:else}
		<div
			class="border border-dashed border-border bg-muted/20 p-5 text-center font-mono text-[10px] leading-5 text-muted-foreground"
		>
			Select a field to assign it to one of the roles above.
		</div>
	{/if}

	{#if selectedField}
		<div class="flex h-8 items-center justify-between border border-border bg-muted/20 px-3">
			<span class="font-mono text-[10px] font-medium">Required</span>
			<input
				type="checkbox"
				checked={selectedField.required}
				onchange={(event) =>
					onUpdate(selectedField!.id, { required: event.currentTarget.checked })}
			/>
		</div>
		<div class="grid grid-cols-2 gap-3">
			{#each ["x", "y", "width", "height"] as key (key)}
				<label class="flex flex-col gap-1.5">
					<span class="font-mono text-[10px] font-medium text-muted-foreground">{key} (%)</span>
					<Input
						type="number"
						value={Number(selectedField[key as keyof Field]).toFixed(2)}
						onchange={(event) =>
							onUpdate(selectedField!.id, {
								[key]: Number(event.currentTarget.value),
							} as Partial<Field>)}
						class="h-8 font-mono text-xs"
					/>
				</label>
			{/each}
		</div>
		<hr class="border-border" />
		{@render roleScopeSection()}
		<div class="mt-auto pt-2">
			<Button
				variant="destructive"
				size="sm"
				class="h-8 w-full"
				onclick={() => onDelete(selectedField!.id)}
			>
				Delete Field
			</Button>
		</div>
	{:else}
		{@render roleScopeSection()}
	{/if}
</div>
