export default function FormInput({ label, id, type = "text", value, onChange, onBlur, error, placeholder, rightElement }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-white/80">{label}</label>
      <div className="relative">
        <input
          id={id} type={type} value={value}
          onChange={onChange} onBlur={onBlur} placeholder={placeholder}
          className={`w-full px-4 py-3 rounded-xl text-sm bg-white/10 backdrop-blur-sm text-white
            placeholder:text-white/30 border transition-all duration-200 focus:outline-none focus:ring-2
            ${error ? "border-red-400/60 focus:ring-red-400/30" : "border-white/20 focus:ring-blush/40 focus:border-blush/60"}
            ${rightElement ? "pr-14" : ""}`}
        />
        {rightElement && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>}
      </div>
      {error && <p className="text-xs text-red-300 mt-0.5">{error}</p>}
    </div>
  );
}