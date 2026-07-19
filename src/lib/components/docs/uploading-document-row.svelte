<script lang="ts">
  import type { DocumentRecord } from "$lib/components/docs/types";
  import { getDocumentType } from "$lib/components/docs/types";

  let {
    document,
    variant,
  }: {
    document: DocumentRecord;
    variant: "documents" | "shared";
  } = $props();

  const progress = $derived(
    Math.max(0, Math.min(100, document.uploadProgress || 0)),
  );
  const characters = $derived(Array.from(document.name));
  const resolvedCount = $derived(
    Math.floor(characters.length * (progress / 100)),
  );
</script>

{#snippet animatedText(text: string, indexOffset: number, label: string)}
  {@const glyphs = Array.from(text)}
  {@const stableGlyphs = Math.floor(glyphs.length * (progress / 100))}
  <span aria-label={label}>
    {#each glyphs as glyph, index (`${text}-${index}`)}
      <span
        aria-hidden="true"
        class:upload-letter-pending={index >= stableGlyphs}
        class="upload-letter whitespace-pre"
        style={`--letter-index: ${index + indexOffset}`}
      >{glyph}</span>
    {/each}
  </span>
{/snippet}

<tr class="cursor-progress border-b border-border/50" aria-busy="true">
  <td class="py-2.5">
    <div class="min-w-0">
      <p
        class="truncate text-[13px] font-medium text-foreground"
        aria-label={`${document.name}, uploading ${progress}%`}
      >
        {#each characters as character, index (`${document.id}-${index}`)}
          <span
            aria-hidden="true"
            class:upload-letter-pending={index >= resolvedCount}
            class="upload-letter whitespace-pre text-foreground"
            style={`--letter-index: ${index}`}
          >{character}</span>
        {/each}
      </p>
    </div>
  </td>

  {#if variant === "documents"}
    <td class="py-2.5 text-[13px] text-muted-foreground">
      <div class="w-fit">
        {@render animatedText(
          getDocumentType(document.name),
          4,
          getDocumentType(document.name),
        )}
      </div>
    </td>
  {/if}

  <td class="py-2.5 text-[13px] text-muted-foreground">
    <div class="w-fit">
      {@render animatedText("Uploading", 8, "Uploading")}
    </div>
  </td>

  <td class="py-2.5 text-[13px] tabular-nums text-muted-foreground">
    <div class="w-fit">
      {@render animatedText("—", 12, "No fields yet")}
    </div>
  </td>

  <td class="py-2.5 text-[13px] tabular-nums text-muted-foreground">
    <div class="w-fit">
      {@render animatedText(`${progress}%`, 16, `${progress}% uploaded`)}
    </div>
  </td>

  <td class="py-2.5 text-right text-[13px] text-muted-foreground">
    <div class="ml-auto w-fit tracking-widest">
      {@render animatedText("•••", 20, "Upload in progress")}
    </div>
  </td>
</tr>

<style>
  .upload-letter {
    opacity: 1;
    transition:
      opacity 180ms ease-out,
      color 180ms ease-out;
  }

  .upload-letter-pending {
    opacity: 0.22;
    animation: upload-letter-breathe 1.8s ease-in-out infinite;
    animation-delay: calc(var(--letter-index) * 45ms);
  }

  @keyframes upload-letter-breathe {
    0%,
    100% {
      opacity: 0.18;
    }
    50% {
      opacity: 0.42;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .upload-letter-pending {
      animation: none;
    }

    .upload-letter {
      transition: none;
    }
  }
</style>
