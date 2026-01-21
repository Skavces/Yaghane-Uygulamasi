import { useState } from "react"
import { ClipboardList, Factory, PackageCheck, Leaf } from "lucide-react"

export default function Login({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState("")
  const [error, setError] = useState("")

  const handleLogin = (role) => {
    setError("")
    if (!role) {
      setError("Bir rol seçmen lazım.")
      return
    }
    onLogin(role)
  }

  const roles = [
    {
      id: "girisci",
      title: "Girişçi",
      icon: ClipboardList,
      description: "Zeytin teslim alma",
      gradient: "from-blue-500 to-blue-600",
      hoverGradient: "from-blue-600 to-blue-700",
      bgGlow: "bg-blue-200/40",
      shadowColor: "shadow-blue-500/30 hover:shadow-blue-500/50",
      iconColor: "text-blue-700",
      headerBg: "from-blue-100 to-blue-50",
      ringColor: "ring-blue-400",
      patternColor: "#3b82f6"
    },
    {
      id: "yagci",
      title: "Yağcı",
      icon: Factory,
      description: "Yağ üretim süreci",
      gradient: "from-emerald-500 to-emerald-600",
      hoverGradient: "from-emerald-600 to-emerald-700",
      bgGlow: "bg-emerald-200/40",
      shadowColor: "shadow-emerald-500/30 hover:shadow-emerald-500/50",
      iconColor: "text-emerald-700",
      headerBg: "from-emerald-100 to-emerald-50",
      ringColor: "ring-emerald-400",
      patternColor: "#059669"
    },
    {
      id: "cikisci",
      title: "Çıkışçı",
      icon: PackageCheck,
      description: "Ürün teslimat",
      gradient: "from-amber-500 to-amber-600",
      hoverGradient: "from-amber-600 to-amber-700",
      bgGlow: "bg-amber-200/40",
      shadowColor: "shadow-amber-500/30 hover:shadow-amber-500/50",
      iconColor: "text-amber-700",
      headerBg: "from-amber-100 to-amber-50",
      ringColor: "ring-amber-400",
      patternColor: "#f59e0b"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, #059669 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-200/40 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="w-full max-w-6xl relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full blur-2xl opacity-30 animate-pulse"></div>
              <span className="text-7xl relative z-10 inline-block transform hover:scale-110 transition-transform duration-300">🫒</span>
            </div>
          </div>

          <div className="space-y-2 mb-3">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 tracking-tight pb-1">
              KAYA KARDEŞLER
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-wide">
              ZEYTİNYAĞI FABRİKASI
            </h2>
          </div>

          <p className="text-slate-600 text-base font-medium">Devam etmek için rolünüzü seçin</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {roles.map((role, index) => (
            <div
              key={role.id}
              className={`relative group cursor-pointer transition-all duration-500 ${index === 1 ? 'md:-translate-y-8' : ''
                }`}
              onClick={() => {
                setSelectedRole(role.id)
                handleLogin(role.id)
              }}
            >
              <div className={`relative bg-white rounded-3xl overflow-hidden transition-all duration-500 ${selectedRole === role.id
                ? `shadow-2xl ring-4 ${role.ringColor} scale-105`
                : 'shadow-xl hover:shadow-2xl hover:scale-105'
                }`}>

                <div className={`h-32 relative overflow-hidden bg-gradient-to-br ${role.headerBg}`}>
                  {index === 0 && (
                    <div className="absolute inset-0" style={{
                      backgroundImage: `radial-gradient(circle, ${role.patternColor} 1px, transparent 1px)`,
                      backgroundSize: '20px 20px',
                      opacity: 0.2
                    }}></div>
                  )}
                  {index === 1 && (
                    <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path d="M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z" fill={role.patternColor} />
                      <path d="M0,60 Q25,40 50,60 T100,60 L100,100 L0,100 Z" fill={role.patternColor} opacity="0.5" />
                    </svg>
                  )}
                  {index === 2 && (
                    <div className="absolute inset-0" style={{
                      backgroundImage: `linear-gradient(${role.patternColor} 1px, transparent 1px), linear-gradient(90deg, ${role.patternColor} 1px, transparent 1px)`,
                      backgroundSize: '20px 20px',
                      opacity: 0.2
                    }}></div>
                  )}

                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="transition-all duration-500 group-hover:scale-125 group-hover:rotate-12">
                      <role.icon className={`w-16 h-16 ${role.iconColor}`} strokeWidth={1.5} />
                    </div>
                  </div>
                </div>

                <div className="p-8 relative">
                  <div className="text-center mb-6">
                    <h3 className={`text-3xl font-black mb-2 tracking-tight ${role.iconColor}`}
                      style={{ fontFamily: "'Georgia', serif" }}>
                      {role.title}
                    </h3>
                    <p className="text-slate-600 font-medium text-base">
                      {role.description}
                    </p>
                  </div>

                  <button className={`w-full py-4 rounded-2xl font-bold text-lg tracking-wide transition-all duration-300 relative overflow-hidden bg-gradient-to-r ${role.gradient} hover:${role.hoverGradient} text-white shadow-lg ${role.shadowColor}`}>
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      <span>Giriş Yap</span>
                      <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                  </button>
                </div>

                {selectedRole === role.id && (
                  <div className="absolute top-4 right-4 animate-bounce">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-r ${role.gradient}`}>
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              <div className={`absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-3/4 h-4 ${role.bgGlow} blur-xl opacity-50 rounded-full`}></div>
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center justify-center gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-2xl animate-shake max-w-md mx-auto mb-8">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-700 font-semibold">{error}</p>
          </div>
        )}

        <div className="text-center opacity-80">
          <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/70 border border-slate-200 shadow-sm backdrop-blur-sm">
            <span className="text-xs text-slate-500 font-medium">
              Made by
            </span>
            <span className="text-sm font-bold text-slate-700">
              Selim Kavaklıçeşme
            </span>
            <span className="text-slate-300">•</span>
            <a
              href="tel:+905516021021"
              className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition"
            >
              0551 602 1021
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}