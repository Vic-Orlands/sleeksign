"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as pdfjs from "pdfjs-dist/build/pdf";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { Loader2 } from "lucide-react";

type PageMetrics = {
  width: number;
  height: number;
  scale: number;
};

type PdfCanvasViewerProps = {
  fileUrl: string;
  maxPageWidth?: number;
  className?: string;
  pageClassName?: string;
  onPageClick?: (pageIndex: number, point: { x: number; y: number }) => void;
  renderOverlay?: (pageIndex: number, metrics: PageMetrics) => ReactNode;
};

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.js",
    import.meta.url,
  ).toString();
}

export function PdfCanvasViewer({
  fileUrl,
  maxPageWidth = 780,
  className,
  pageClassName,
  onPageClick,
  renderOverlay,
}: PdfCanvasViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [hostWidth, setHostWidth] = useState(maxPageWidth);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const observer = new ResizeObserver(([entry]) => {
      setHostWidth(Math.min(maxPageWidth, entry.contentRect.width));
    });

    observer.observe(host);
    return () => observer.disconnect();
  }, [maxPageWidth]);

  useEffect(() => {
    let cancelled = false;

    const task = pdfjs.getDocument(fileUrl);
    task.promise
      .then((doc) => {
        if (cancelled) return;
        setPdf(doc);
        setPageCount(doc.numPages);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load this PDF.");
      });

    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [fileUrl]);

  const pages = useMemo(
    () => Array.from({ length: pageCount }, (_, index) => index),
    [pageCount],
  );

  return (
    <div ref={hostRef} className={className}>
      {error ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed border-destructive/30 bg-destructive/5 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : !pdf ? (
        <div className="flex min-h-[420px] items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="mx-auto flex w-full flex-col items-center gap-8">
          {pages.map((pageIndex) => (
            <PdfPageCanvas
              key={`${fileUrl}-${pageIndex}-${hostWidth}`}
              pdf={pdf}
              pageIndex={pageIndex}
              targetWidth={hostWidth}
              pageClassName={pageClassName}
              onPageClick={onPageClick}
              renderOverlay={renderOverlay}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PdfPageCanvas({
  pdf,
  pageIndex,
  targetWidth,
  pageClassName,
  onPageClick,
  renderOverlay,
}: {
  pdf: PDFDocumentProxy;
  pageIndex: number;
  targetWidth: number;
  pageClassName?: string;
  onPageClick?: PdfCanvasViewerProps["onPageClick"];
  renderOverlay?: PdfCanvasViewerProps["renderOverlay"];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metrics, setMetrics] = useState<PageMetrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: RenderTask | null = null;

    async function renderPage() {
      const page: PDFPageProxy = await pdf.getPage(pageIndex + 1);
      if (cancelled) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const scale = targetWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;

      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      renderTask = page.render({ canvasContext: context, viewport });
      await renderTask.promise;

      if (!cancelled) {
        setMetrics({
          width: viewport.width,
          height: viewport.height,
          scale,
        });
      }
    }

    renderPage();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageIndex, targetWidth]);

  return (
    <div
      className={pageClassName}
      data-pdf-page={pageIndex}
      style={{
        width: metrics?.width ?? targetWidth,
        height: metrics?.height,
      }}
    >
      <canvas ref={canvasRef} className="block bg-white" />
      {metrics ? (
        <div
          className="absolute inset-0"
          onClick={(event) => {
            if (!onPageClick || event.target !== event.currentTarget) return;
            const rect = event.currentTarget.getBoundingClientRect();
            onPageClick(pageIndex, {
              x: ((event.clientX - rect.left) / rect.width) * 100,
              y: ((event.clientY - rect.top) / rect.height) * 100,
            });
          }}
        >
          {renderOverlay?.(pageIndex, metrics)}
        </div>
      ) : null}
      <div className="absolute -left-12 top-0 rounded-md border bg-background px-2 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
        {pageIndex + 1}
      </div>
    </div>
  );
}
