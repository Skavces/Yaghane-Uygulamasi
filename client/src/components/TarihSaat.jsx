import { CalendarDays, Clock } from "lucide-react"

export default function TarihSaat({ tarih, saat, className = "" }) {
  return (
    <p className={`readout text-base text-murekkep flex flex-wrap items-center gap-x-3 gap-y-0.5 ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays className="w-4 h-4 text-murekkep/50" />
        {tarih}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-murekkep/50" />
        {saat}
      </span>
    </p>
  )
}
