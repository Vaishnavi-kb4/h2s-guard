import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Check, RotateCcw, X, ShieldAlert, BellRing, Siren } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, Panel, StatusBadge } from "@/components/h2s/common";
import { useApp } from "@/context/AppContext";
import type { ReviewAlert } from "@/types/h2s";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts & Review — H₂S GUARD" },
      { name: "description", content: "Operational safety review queue for high exposure alerts and badge exceptions." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { alerts, review } = useApp();
  const [cat, setCat] = useState("ALL");
  const [selected, setSelected] = useState<ReviewAlert | null>(null);

  const shown = alerts.filter((a) => cat === "ALL" || a.category === cat);
  const openCount = alerts.filter((a) => a.status === "Open").length;

  return (
    <>
      <PageHeader
        title="Alerts & HSE Review Queue"
        subtitle="Review, disposition, and resolve high exposure hazards, quality flags, and badge exceptions."
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["ALL", "HSE REVIEW", "MEASUREMENT", "IMAGE", "BADGE", "CALIBRATION"].map((c) => (
            <Button
              key={c}
              size="sm"
              variant={cat === c ? "default" : "outline"}
              onClick={() => setCat(c)}
              className="text-xs font-bold"
            >
              {c}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-muted-foreground">
          <BellRing className="size-4 text-amber-500" />
          <span>{openCount} Open Exceptions Pending Disposition</span>
        </div>
      </div>

      {shown.length === 0 ? (
        <Panel className="p-12 text-center">
          <Check className="mx-auto size-12 text-emerald-500 mb-3" />
          <h4 className="font-bold text-base">No Open Review Exceptions</h4>
          <p className="text-xs text-muted-foreground mt-1">All exposure measurements and badge records are within safe parameters.</p>
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((a) => {
            const isHighAlert = a.title.includes("HIGH") || a.category === "HSE REVIEW";

            return (
              <Panel
                key={a.id}
                className={`p-5 transition-all ${isHighAlert
                    ? "border-2 border-red-500/50 bg-red-500/5 dark:bg-red-950/20 shadow-md shadow-red-500/10"
                    : ""
                  }`}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`grid size-11 place-items-center rounded-xl font-bold shrink-0 text-white ${isHighAlert ? "bg-red-600 animate-pulse" : "bg-amber-500"
                      }`}
                  >
                    {isHighAlert ? <Siren className="size-6" /> : <AlertTriangle className="size-5" />}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-mono font-extrabold uppercase text-muted-foreground">
                          {a.category} · {a.id}
                        </div>
                        <h3 className="mt-0.5 font-bold text-sm leading-tight text-foreground">{a.title}</h3>
                      </div>
                      <StatusBadge status={a.status === "Open" ? "REVIEW REQUIRED" : a.status === "Approved" ? "VALID" : "INVALID"} />
                    </div>

                    <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">{a.subject}</p>
                    <div className="mt-1.5 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-900 dark:text-red-200 font-medium">
                      <b className="font-bold text-[10px] uppercase block text-muted-foreground mb-0.5">Exact Flag Reason:</b>
                      {a.reason}
                    </div>

                    {/* 4 Working Action Buttons: Review, Approve, Reject, Request Recapture */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button className="text-xs font-bold" variant={isHighAlert ? "default" : "outline"} size="sm" onClick={() => setSelected(a)}>
                        <ShieldAlert className="size-3.5 mr-1 text-primary" /> Review Evidence
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => review(a.id, "Approved")}
                        className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold"
                      >
                        <Check className="size-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => review(a.id, "Rejected")}
                        className="text-xs font-bold"
                      >
                        <X className="size-3.5 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => review(a.id, "Recapture Requested")}
                        className="text-xs font-bold"
                      >
                        <RotateCcw className="size-3.5 mr-1" /> Request Recapture
                      </Button>
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">{selected?.title}</DialogTitle>
            <DialogDescription className="text-xs">
              {selected?.subject} · Category: {selected?.category}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-red-200 bg-red-50/50 dark:bg-red-950/40 p-4 space-y-2 text-xs my-2">
            <div className="font-extrabold text-red-900 dark:text-red-300 uppercase tracking-wider text-[10px]">
              Exact Exception Reason:
            </div>
            <p className="text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">{selected?.reason}</p>
          </div>

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              variant="outline"
              onClick={() => {
                if (selected) review(selected.id, "Recapture Requested");
                setSelected(null);
              }}
              className="text-xs font-bold"
            >
              <RotateCcw className="size-3.5 mr-1" /> Request Recapture
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selected) review(selected.id, "Rejected");
                setSelected(null);
              }}
              className="text-xs font-bold"
            >
              <X className="size-3.5 mr-1" /> Reject Record
            </Button>
            <Button
              onClick={() => {
                if (selected) review(selected.id, "Approved");
                setSelected(null);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              <Check className="size-3.5 mr-1" /> Approve & Close Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
