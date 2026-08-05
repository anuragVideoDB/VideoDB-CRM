// Pipeline stages (also the kanban columns) in display order.
export const LEAD_STATUSES = [
  "new",
  "enriching",
  "scored",
  "sequenced",
  "engaged",
  "replied",
  "qualified",
  "meeting_booked",
  "won",
  "lost",
  "unqualified",
  "suppressed",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  enriching: "Enriching",
  scored: "Scored",
  sequenced: "Sequenced",
  engaged: "Engaged",
  replied: "Replied",
  qualified: "Qualified",
  meeting_booked: "Meeting Booked",
  won: "Won",
  lost: "Lost",
  unqualified: "Unqualified",
  suppressed: "Suppressed",
};

// Columns shown on the kanban board (terminal states live in the list view).
export const PIPELINE_COLUMNS: LeadStatus[] = [
  "new",
  "enriching",
  "scored",
  "sequenced",
  "engaged",
  "replied",
  "qualified",
  "meeting_booked",
  "won",
];

export const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-slate-100 text-slate-700",
  enriching: "bg-amber-100 text-amber-700",
  scored: "bg-orange-100 text-orange-700",
  sequenced: "bg-blue-100 text-blue-700",
  engaged: "bg-violet-100 text-violet-700",
  replied: "bg-teal-100 text-teal-700",
  qualified: "bg-cyan-100 text-cyan-700",
  meeting_booked: "bg-fuchsia-100 text-fuchsia-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-rose-100 text-rose-700",
  unqualified: "bg-gray-100 text-gray-500",
  suppressed: "bg-rose-50 text-rose-600",
};

export const SOURCE_LABELS: Record<string, string> = {
  inbound_form: "Website Form",
  smartlead: "Smartlead",
  heyreach: "HeyReach",
  clay: "Clay",
  manual: "Manual",
  import: "Import",
};

export const ACTIVITY_LABELS: Record<string, string> = {
  form_submitted: "Submitted the website form",
  email_sent: "Email sent",
  email_opened: "Opened an email",
  email_clicked: "Clicked a link",
  email_replied: "Replied to an email",
  email_bounced: "Email bounced",
  email_unsubscribed: "Unsubscribed",
  li_connection_sent: "LinkedIn connection request sent",
  li_connected: "Accepted LinkedIn connection",
  li_message_sent: "LinkedIn message sent",
  li_replied: "Replied on LinkedIn",
  enriched: "Enriched by Clay",
  note: "Note",
  status_changed: "Stage changed",
  meeting_booked: "Meeting booked",
  task: "Task",
  assigned: "Assigned",
};

export const ACTIVITY_ICONS: Record<string, string> = {
  form_submitted: "📝",
  email_sent: "📧",
  email_opened: "👀",
  email_clicked: "🔗",
  email_replied: "↩️",
  email_bounced: "⚠️",
  email_unsubscribed: "🚫",
  li_connection_sent: "🤝",
  li_connected: "✅",
  li_message_sent: "💬",
  li_replied: "↩️",
  enriched: "✨",
  note: "🗒️",
  status_changed: "🔀",
  meeting_booked: "📅",
  task: "☑️",
  assigned: "👤",
};
