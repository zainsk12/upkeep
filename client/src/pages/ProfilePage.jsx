import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "../utils/toast";
import { useAuth } from "../context/AuthContext";
import { updateProfileApi } from "../services/authApi";
import { User, Mail, Phone, MapPin, Save, CheckCircle2, ChevronRight } from "lucide-react";

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ProfileField({ label, id, icon: Icon, value, onChange, disabled = false, placeholder, type = "text", disabledNote }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-semibold text-text flex items-center gap-1.5"
      >
        <Icon size={13} className="text-primary/70" strokeWidth={2.2} />
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl text-sm border transition-all duration-200
          focus:outline-none focus:ring-2
          ${disabled
            ? "bg-bg text-muted border-border cursor-not-allowed select-none"
            : "bg-card text-text border-border focus:ring-primary/20 focus:border-primary/50 hover:border-border"
          }`}
      />
      {disabled && disabledNote && (
        <p className="text-xs text-muted mt-0.5 pl-0.5 flex items-center gap-1">
          <CheckCircle2 size={10} className="text-muted" />
          {disabledNote}
        </p>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Phone is display-only (not editable yet), so it is NOT part of the editable
  // form — only name + address are submitted. Phone is shown from `user.phone`.
  const [form, setForm]       = useState({ name: "", address: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name:    user.name    || "",
        address: user.address || "",
      });
    }
  }, [user]);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.id]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    setLoading(true);
    try {
      const res = await updateProfileApi(form);
      if (res.data?.token) login(res.data.token);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg py-10 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        {/* Back link — Update Profile is reached via Avatar → Account, so it
            returns to the Account menu (mirrors Change Password). */}
        <button
          onClick={() => navigate("/settings/account")}
          className="flex items-center gap-1.5 text-primary/60 hover:text-primary text-sm font-medium mb-4 transition-colors group"
        >
          <ChevronRight
            size={14}
            strokeWidth={2.2}
            className="rotate-180 group-hover:-translate-x-0.5 transition-transform"
          />
          Back to Account
        </button>

        {/* Page title */}
        <div>
          <h1
            className="text-2xl font-bold text-text leading-tight font-display"
          >
            Profile
          </h1>
          <p className="text-muted text-sm mt-1">
            Update your personal information
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-card rounded-2xl border border-border overflow-hidden"
          style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)" }}
        >
          {/* Card header */}
          <div className="px-5 py-4 border-b border-border">
            <p className="text-text font-bold text-sm">Personal Information</p>
            <p className="text-muted text-xs mt-0.5">Update your name, phone, and address</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            <ProfileField
              label="Full Name"
              id="name"
              icon={User}
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
            />
            <ProfileField
              label="Email Address"
              id="email"
              icon={Mail}
              value={user?.email || ""}
              onChange={() => {}}
              disabled
              disabledNote="Email cannot be changed."
              placeholder="your@email.com"
            />
            <ProfileField
              label="Phone Number"
              id="phone"
              icon={Phone}
              value={user?.phone || ""}
              onChange={() => {}}
              disabled
              disabledNote="Phone number cannot be changed."
              placeholder="10-digit mobile number"
            />
            <ProfileField
              label="Address"
              id="address"
              icon={MapPin}
              value={form.address}
              onChange={handleChange}
              placeholder="Your address in Nashik"
            />

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2
                  px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white
                  text-sm font-bold transition-all hover:-translate-y-0.5
                  shadow-md shadow-primary/25 disabled:opacity-60
                  disabled:cursor-not-allowed disabled:translate-y-0
                  focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save size={15} strokeWidth={2.2} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}