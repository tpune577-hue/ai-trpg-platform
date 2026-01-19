import { auth } from "@/auth"
import { SignIn, SignOut } from "@/components/auth/AuthButton"
import { ClientHome } from "./client-page"

export default async function HomePage() {
  const session = await auth()
  const user = session?.user

  return (
    // ✅ เปลี่ยนสีพื้นหลังตรงนี้ครับ
    <div className="min-h-screen bg-[#0f172a] flex flex-col font-sans relative">

      {/* --- HEADER (AUTH BAR) --- */}
      <header className="absolute top-0 w-full p-6 flex justify-between items-center z-10">
        <div className="text-slate-500 text-xs tracking-widest font-mono hidden md:block">
          SANDORY BOX ALPHA
        </div>

        <div className="flex items-center gap-4 ml-auto">
          {user ? (
            <div className="flex items-center gap-3 bg-[#0f172a]/80 backdrop-blur-md p-1 pr-4 rounded-full border border-slate-800 shadow-[0_0_15px_rgba(88,28,135,0.2)]">
              <img
                src={user.image || `https://placehold.co/100x100?text=${user.name?.charAt(0)}`}
                className="w-8 h-8 rounded-full border border-[#f59e0b]"
                alt="Profile"
              />
              <div className="flex flex-col items-end">
                <span className="text-white text-xs font-bold">{user.name}</span>
                <div className="scale-75 origin-right">
                  <SignOut />
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-top-4 duration-700">
              <SignIn />
            </div>
          )}
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <ClientHome isLoggedIn={!!user} />

    </div>
  )
}