import React from "react";

export default function ManagerSectionPlaceholder({ title }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
        Manager Portal
      </p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        This section is not available yet.
      </p>
    </section>
  );
}
