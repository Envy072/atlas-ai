"use client";

import { Bell, Search } from "lucide-react";

export default function Topbar() {
  return (
    <header className="flex h-20 items-center justify-between border-b border-gray-200 bg-white px-8">

      <div className="relative w-[420px]">

        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

        <input
          placeholder="Search projects..."
          className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-12 pr-4 outline-none transition focus:border-blue-600"
        />

      </div>

      <div className="flex items-center gap-5">

        <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 hover:bg-gray-100">
          <Bell className="h-5 w-5" />
        </button>

        <div className="text-right">

          <p className="font-semibold">
            Yasin
          </p>

          <p className="text-sm text-gray-500">
            Founder
          </p>

        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
          Y
        </div>

      </div>

    </header>
  );
}