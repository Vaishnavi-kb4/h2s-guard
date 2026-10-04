import { AlertTriangle, ArrowLeft, Check, CircleDot, Clock3, CloudOff, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { SafetyStatus } from "@/types/h2s";
import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function PageHeader({ title, subtitle, action, actions }: { title: string; subtitle: string; action?: ReactNode; actions?: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isHome = path === "/";

  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase text-primary">
          {!isHome && (
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline mr-1"
            >
              <ArrowLeft className="size-3.5" /> Back
            </button>
          )}
          {!isHome && <span className="text-muted-foreground">•</span>}
          <span className="h-px w-5 bg-primary" />
          H₂S Guard / Occupational Safety System
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action || actions}
    </div>
  );
}
export function Panel({children,className}:{children:ReactNode;className?:string}){return <section className={cn("rounded-xl border border-border bg-card shadow-panel",className)}>{children}</section>}
export function PanelHeader({title,subtitle,action}:{title:string;subtitle?:string;action?:ReactNode}){return <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4"><div><h2 className="font-display text-base font-bold text-foreground">{title}</h2>{subtitle&&<p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}</div>{action}</div>}
const statusStyles:Record<string,string>={VALID:"border-success/30 bg-success-soft text-success","ACTIVE":"border-success/30 bg-success-soft text-success",LOW:"border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold",MODERATE:"border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold",HIGH:"border-red-600/40 bg-red-600/15 text-red-600 dark:text-red-400 font-extrabold animate-pulse",INVALID:"border-destructive/30 bg-destructive-soft text-destructive","REVIEW REQUIRED":"border-warning/30 bg-warning-soft text-warning-foreground",EXPIRED:"border-destructive/30 bg-destructive-soft text-destructive",PROCESSING:"border-primary/30 bg-primary-soft text-primary",OFFLINE:"border-muted-foreground/30 bg-muted text-muted-foreground","PENDING SYNC":"border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold",SYNCED:"border-success/30 bg-success-soft text-success","EXPIRING SOON":"border-warning/30 bg-warning-soft text-warning-foreground"};
export function StatusBadge({status,className}:{status:SafetyStatus|string;className?:string}){const Icon=status==="VALID"||status==="ACTIVE"||status==="SYNCED"||status==="LOW"?Check:status==="INVALID"||status==="EXPIRED"?X:status==="HIGH"?AlertTriangle:status==="MODERATE"?AlertTriangle:status==="PROCESSING"?LoaderCircle:status==="OFFLINE"||status==="PENDING SYNC"?CloudOff:status.includes("REVIEW")||status.includes("EXPIRING")?AlertTriangle:CircleDot;return <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase",statusStyles[status]||"border-border bg-muted text-muted-foreground",className)}><Icon className={cn("size-3",status==="PROCESSING"&&"animate-spin")}/>{status}</span>}
export function MetricCard({label,value,detail,icon:Icon,tone="primary"}:{label:string;value:string|number;detail:string;icon:typeof ShieldCheck;tone?:"primary"|"success"|"warning"|"danger"}){const tones={primary:"bg-primary-soft text-primary",success:"bg-success-soft text-success",warning:"bg-warning-soft text-warning-foreground",danger:"bg-destructive-soft text-destructive"};return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="rounded-xl border border-border bg-card p-4 shadow-panel"><div className="flex items-start justify-between"><span className="text-xs font-semibold text-muted-foreground">{label}</span><span className={cn("grid size-8 place-items-center rounded-lg",tones[tone])}><Icon className="size-4"/></span></div><div className="mt-3 font-mono text-3xl font-bold text-foreground">{value}</div><div className="mt-1 text-[11px] text-muted-foreground">{detail}</div></motion.div>}
export const workflowSteps=["CAPTURE","VALIDATE","NORMALIZE","ESTIMATE","RECORD","REVIEW"];
export function WorkflowStepper({current,onStep}:{current:number;onStep?:(index:number)=>void}){return <div className="mb-6 overflow-x-auto rounded-xl border border-border bg-card p-3 shadow-panel"><div className="flex min-w-[650px] items-center">{workflowSteps.map((step,i)=><div key={step} className="flex flex-1 items-center"><button disabled={!onStep||i>current} onClick={()=>onStep?.(i)} className={cn("flex items-center gap-2 text-left",i<=current&&onStep&&"cursor-pointer")}><span className={cn("grid size-7 place-items-center rounded-full border font-mono text-[10px] font-bold",i<current?"border-success bg-success text-success-foreground":i===current?"border-primary bg-primary text-primary-foreground":"border-border bg-muted text-muted-foreground")}>{i<current?<Check className="size-3"/>:String(i+1).padStart(2,"0")}</span><span className={cn("text-[10px] font-bold",i===current?"text-primary":i<current?"text-success":"text-muted-foreground")}>{step}</span></button>{i<workflowSteps.length-1&&<span className={cn("mx-3 h-px flex-1",i<current?"bg-success":"bg-border")}/>}</div>)}</div></div>}
export function EmptyState({title,description,icon:Icon=Clock3}:{title:string;description:string;icon?:typeof Clock3}){return <div className="grid min-h-48 place-items-center p-8 text-center"><div><Icon className="mx-auto mb-3 size-8 text-muted-foreground"/><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div></div>}
