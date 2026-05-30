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
  onDocumentLoad?: (pageCount: number) => void;
  onVisiblePageChange?: (pageIndex: number) => void;
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
  onDocumentLoad,
  onVisiblePageChange,
}: PdfCanvasViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onDocumentLoadRef = useRef(onDocumentLoad);
  const [documentState, setDocumentState] = useState<{
    fileUrl: string;
    pdf: PDFDocumentProxy | null;
    pageCount: number;
    error: string | null;
  }>({
    fileUrl: "",
    pdf: null,
    pageCount: 0,
    error: null,
  });
  const [hostWidth, setHostWidth] = useState(maxPageWidth);

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
    onDocumentLoadRef.current = onDocumentLoad;
  }, [onDocumentLoad]);

  useEffect(() => {
    let cancelled = false;

    const task = pdfjs.getDocument(fileUrl);
    task.promise
      .then((doc) => {
        if (cancelled) return;
        setDocumentState({
          fileUrl,
          pdf: doc,
          pageCount: doc.numPages,
          error: null,
        });
        onDocumentLoadRef.current?.(doc.numPages);
      })
      .catch(() => {
        if (!cancelled) {
          setDocumentState({
            fileUrl,
            pdf: null,
            pageCount: 0,
            error: "Unable to load this PDF.",
          });
        }
      });

    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [fileUrl]);

  const pdf = documentState.fileUrl === fileUrl ? documentState.pdf : null;
  const pageCount = documentState.fileUrl === fileUrl ? documentState.pageCount : 0;
  const error = documentState.fileUrl === fileUrl ? documentState.error : null;

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
              onVisiblePageChange={onVisiblePageChange}
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
  onVisiblePageChange,
}: {
  pdf: PDFDocumentProxy;
  pageIndex: number;
  targetWidth: number;
  pageClassName?: string;
  onPageClick?: PdfCanvasViewerProps["onPageClick"];
  renderOverlay?: PdfCanvasViewerProps["renderOverlay"];
  onVisiblePageChange?: PdfCanvasViewerProps["onVisiblePageChange"];
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metrics, setMetrics] = useState<PageMetrics | null>(null);
  const [shouldRender, setShouldRender] = useState(pageIndex === 0);

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      const page: PDFPageProxy = await pdf.getPage(pageIndex + 1);
      if (cancelled) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const scale = targetWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });
      setMetrics({
        width: viewport.width,
        height: viewport.height,
        scale,
      });
    }

    void loadMetrics();

    return () => {
      cancelled = true;
    };
  }, [pdf, pageIndex, targetWidth]);

  useEffect(() => {
    const node = pageRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldRender(true);
          }
          if (entry.intersectionRatio >= 0.55) {
            onVisiblePageChange?.(pageIndex);
          }
        }
      },
      {
        rootMargin: "1200px 0px",
        threshold: [0, 0.55],
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [onVisiblePageChange, pageIndex]);

  useEffect(() => {
    if (!metrics || !shouldRender) return;

    let cancelled = false;
    let renderTask: RenderTask | null = null;
    const nextMetrics = metrics;

    async function renderPage() {
      const page: PDFPageProxy = await pdf.getPage(pageIndex + 1);
      if (cancelled) return;

      const viewport = page.getViewport({ scale: nextMetrics.scale });
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
    }

    void renderPage();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [metrics, pageIndex, pdf, shouldRender]);

  return (
    <div
      ref={pageRef}
      className={pageClassName}
      data-pdf-page={pageIndex}
      style={{
        width: metrics?.width ?? targetWidth,
        height: metrics?.height ?? Math.max(targetWidth * 1.3, 420),
      }}
    >
      <canvas ref={canvasRef} className="block bg-white" />
      {!shouldRender ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/65 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : null}
      {metrics && shouldRender ? (
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
