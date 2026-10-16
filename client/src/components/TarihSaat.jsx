import { CalendarDays, Clock } from "lucide-react"

export default function TarihSaat({ tarih, saat, className = "" }) {
  return (
    <p className={`readout text-sm text-murekkep flex flex-wrap items-center gap-x-2.5 gap-y-0.5 ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays className="w-3.5 h-3.5 text-murekkep/50" />
        {tarih}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-murekkep/50" />
        {saat}
      </span>
    </p>
  )
}
