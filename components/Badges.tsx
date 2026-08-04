import {
  STATUS_COLORS,
  STATUS_LABELS,
  SOURCE_LABELS,
  type LeadStatus,
} from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const color =
    STATUS_COLORS[status as LeadStatus] ?? "bg-slate-100 text-slate-600";
  const label = STATUS_LABELS[status as LeadStatus] ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {label}
    </span>
  );
}

export function SourceBadge({ source }: { source: string }) {
  const label = SOURCE_LABELS[source] ?? source;
  const inbound = source === "inbound_form";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        inbound ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {label}
    </span>
  );
}

export function ChannelBadge({ channel }: { channel: string }) {
  const inbound = channel === "inbound";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
        inbound ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"
      }`}
    >
      {inbound ? "Inbound" : "Outbound"}
    </span>
  );
}
