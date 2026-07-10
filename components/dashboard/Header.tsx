"use client";

import { Bell, Search } from "lucide-react";

export default function Header() {
  return (
    <header className="flex items-center justify-between border-b bg-white px-8 py-4">
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

        <input
          type="text"
          placeholder="Search projects..."
          className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 outline-none focus:border-blue-500"
        />
      </div>

      <div className="flex items-center gap-6">
        <button className="relative">
          <Bell className="h-6 w-6 text-gray-600" />
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-blue-600"></span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
            Y
          </div>

          <div>
            <p className="font-semibold">Yasin</p>
            <p className="text-sm text-gray-500">Founder</p>
          </div>
        </div>
      </div>
    </header>
  );
}