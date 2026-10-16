import { Phone } from "lucide-react"

export default function Telefon({ numara, className = "" }) {
  return (
    <p className={`readout text-sm text-murekkep/75 inline-flex items-center gap-1.5 ${className}`}>
      <Phone className="w-3.5 h-3.5 text-murekkep/50" />
      {numara}
    </p>
  )
}
