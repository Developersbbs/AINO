export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3c6e] via-[#2a5298] to-[#1e3c6e] flex items-center justify-center p-4">
      <div className="text-center text-white">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-[#1e3c6e] font-black text-2xl">A</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">AINO Real Estate</h1>
        <p className="text-white/60">
          Use a share link provided by your agent to view property details.
        </p>
      </div>
    </div>
  )
}
