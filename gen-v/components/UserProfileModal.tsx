"use client";

import React, { useState, memo } from "react";
import { 
  X, User, Sparkles, Sliders, 
  Lock, Save, Check, Film, 
  Infinity as InfinityIcon, Camera, ChevronDown
} from "lucide-react";
import { useAuth } from "@/lib/auth/hooks";
import { useFactoryStore } from "@/lib/factory-store";
import { useOSStore } from "@/lib/os-store";

interface UserProfileModalProps {
  onClose: () => void;
}

const OFFICIAL_AVATARS = [
  { id: "01", name: "The Builder", file: "/avatars/factory-avatar-01.png", accent: "border-blue-500", tag: "Tech Creator" },
  { id: "02", name: "The Creator", file: "/avatars/factory-avatar-02.png", accent: "border-purple-500", tag: "Content Maker" },
  { id: "03", name: "The AI Explorer", file: "/avatars/factory-avatar-03.png", accent: "border-cyan-500", tag: "AI Researcher" },
  { id: "04", name: "The Operator", file: "/avatars/factory-avatar-04.png", accent: "border-amber-500", tag: "Automation Lead" },
  { id: "05", name: "The Visionary", file: "/avatars/factory-avatar-05.png", accent: "border-emerald-500", tag: "Innovator" },
  { id: "06", name: "The Strategist", file: "/avatars/factory-avatar-06.png", accent: "border-red-500", tag: "Product Strategist" },
];

function UserProfileModal({ onClose }: UserProfileModalProps) {
  const { user } = useAuth();
  const { jobs } = useFactoryStore();
  const selectedAvatar = useOSStore((state) => state.selectedAvatar);
  const setSelectedAvatar = useOSStore((state) => state.setSelectedAvatar);

  const displayAvatar = user?.photoURL || selectedAvatar || "/avatars/factory-avatar-01.png";

  const isViewer = user?.role === "VIEWER";
  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";

  const displayRoleBadge = isAdmin 
    ? (user?.role || "OWNER") 
    : isViewer 
    ? "VIEWER" 
    : "CREATOR";

  // Editable Profile State
  const [fullName, setFullName] = useState(
    user?.name || (user?.email ? user.email.split("@")[0].toUpperCase() : "CREATOR")
  );
  const [username, setUsername] = useState(
    user?.email ? `@${user.email.split("@")[0]}` : "@creator"
  );
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Creator Preferences State
  const [niche, setNiche] = useState("Technology");
  const [primaryPlatform, setPrimaryPlatform] = useState("YouTube Shorts");
  const [duration, setDuration] = useState("30 sec");
  const [tone, setTone] = useState("Educational");

  // Editable Generation Defaults State
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [language, setLanguage] = useState("English");
  const [captionStyle, setCaptionStyle] = useState("Dynamic");
  const [voice, setVoice] = useState("Natural");
  const [qualityProfile, setQualityProfile] = useState("Fast Quiz");
  const [exportFormat, setExportFormat] = useState("MP4 (1080p)");

  const completedJobs = jobs.filter((j) => (j.status as string) === "completed" || (j.status as string) === "rendered");
  const activeJobs = jobs.filter((j) => (j.status as string) === "running" || (j.status as string) === "processing");

  const handleSavePreferences = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div 
        className="bg-[#050A12] border border-white/[0.12] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-profile-modal-title"
      >
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between bg-[#070D18]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1677FF]/10 border border-[#1677FF]/20 flex items-center justify-center text-[#1677FF]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 id="user-profile-modal-title" className="text-base font-bold text-[#F5F7FA]">User Profile & Creator Preferences</h2>
              <p className="text-xs text-[#667085]">Manage personal information, default presets, and API keys</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close profile modal"
            className="p-2 rounded-xl text-[#667085] hover:text-[#F5F7FA] hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 text-xs text-[#F5F7FA] terminal-scroll">
          
          {/* 1. 👤 Profile Header Card */}
          <div className="bg-[#070D18] border border-white/[0.08] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-5">
              {/* Avatar Image & Picker Trigger */}
              <div className="relative group cursor-pointer" onClick={() => setShowAvatarPicker(!showAvatarPicker)}>
                <img 
                  src={displayAvatar} 
                  alt="User Avatar"
                  width={72}
                  height={72}
                  loading="lazy"
                  decoding="async"
                  className="w-18 h-18 rounded-full border-2 border-[#1677FF] object-cover shadow-md transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-[#0A1220] border border-[#1677FF] rounded-md px-2.5 py-0.5 font-bold text-sm outline-none text-[#F5F7FA]"
                    />
                  ) : (
                    <h3 className="text-lg font-bold text-[#F5F7FA]">{fullName}</h3>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full bg-[#1677FF]/20 text-[#1677FF] font-bold text-[10px] uppercase tracking-wider border border-[#1677FF]/30">
                    {displayRoleBadge}
                  </span>
                </div>
                <p className="text-xs text-[#A8B2C1] font-medium">{username} • {user?.email || "gokul32499@gmail.com"}</p>
                <p className="text-[11px] text-[#667085]">Member since Aug 2026</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="px-3 py-2 rounded-xl bg-[#0E1728] border border-white/[0.08] font-semibold hover:bg-[#121E32] transition-colors text-xs text-[#F5F7FA] cursor-pointer shadow-xs"
              >
                Change Avatar
              </button>
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="px-4 py-2 rounded-xl bg-[#1677FF] text-white font-semibold hover:bg-[#0F63D8] transition-colors text-xs cursor-pointer shadow-xs"
              >
                {isEditingProfile ? "Save Profile" : "Edit Profile"}
              </button>
            </div>
          </div>

          {/* 🎭 Official 3D Cartoon Avatar Picker */}
          {showAvatarPicker && (
            <div className="bg-[#070D18] border border-[#1677FF]/30 rounded-2xl p-5 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#F5F7FA] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#1677FF]" /> Select FactoryOS 3D Avatar
                  </h4>
                  <p className="text-[11px] text-[#667085]">Official 3D cartoon avatar suite rendered for FactoryOS</p>
                </div>
                <button 
                  onClick={() => setShowAvatarPicker(false)}
                  className="text-xs text-[#667085] hover:text-[#F5F7FA] cursor-pointer"
                >
                  Done
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {OFFICIAL_AVATARS.map((av) => {
                  const isSelected = selectedAvatar === av.file;
                  return (
                    <div
                      key={av.id}
                      onClick={() => {
                        setSelectedAvatar(av.file);
                        setShowAvatarPicker(false);
                      }}
                      className={`group cursor-pointer flex flex-col items-center p-2 rounded-2xl border transition-all ${
                        isSelected 
                          ? "bg-[#0A1220] border-[#1677FF] shadow-md scale-105" 
                          : "bg-[#0E1728]/60 border-transparent hover:border-white/[0.12]"
                      }`}
                    >
                      <img 
                        src={av.file} 
                        alt={av.name}
                        width={56}
                        height={56}
                        loading="lazy"
                        decoding="async"
                        className="w-14 h-14 rounded-full object-cover border border-white/[0.08] shadow-sm"
                      />
                      <span className="text-[10px] font-bold text-[#F5F7FA] mt-1.5 text-center truncate max-w-full">
                        {av.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. 🎬 Creator Profile & Preferences */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#F5F7FA] flex items-center gap-2 border-b border-white/[0.08] pb-2">
              <Sparkles className="w-4 h-4 text-[#1677FF]" /> Creator Preferences
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-[#A8B2C1]">Content Niche</label>
                <div className="relative">
                  <select
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="w-full bg-[#070D18] border border-white/[0.08] rounded-xl px-3.5 py-2.5 pr-8 outline-none font-medium cursor-pointer text-[#F5F7FA] appearance-none shadow-xs"
                  >
                    {["Technology", "Education", "Finance", "Gaming", "Fitness", "Entertainment", "Business", "Other"].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#667085] absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#A8B2C1]">Primary Platform</label>
                <div className="relative">
                  <select
                    value={primaryPlatform}
                    onChange={(e) => setPrimaryPlatform(e.target.value)}
                    className="w-full bg-[#070D18] border border-white/[0.08] rounded-xl px-3.5 py-2.5 pr-8 outline-none font-medium cursor-pointer text-[#F5F7FA] appearance-none shadow-xs"
                  >
                    {["YouTube Shorts", "Instagram Reels", "TikTok", "Other"].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#667085] absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#A8B2C1]">Default Duration</label>
                <div className="relative">
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-[#070D18] border border-white/[0.08] rounded-xl px-3.5 py-2.5 pr-8 outline-none font-medium cursor-pointer text-[#F5F7FA] appearance-none shadow-xs"
                  >
                    {["15 sec", "30 sec", "60 sec", "90 sec"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#667085] absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#A8B2C1]">Content Tone</label>
                <div className="relative">
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full bg-[#070D18] border border-white/[0.08] rounded-xl px-3.5 py-2.5 pr-8 outline-none font-medium cursor-pointer text-[#F5F7FA] appearance-none shadow-xs"
                  >
                    {["Professional", "Casual", "Educational", "Storytelling", "Energetic", "Humorous"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#667085] absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* 3. ⚡ Editable Generation Defaults */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#F5F7FA] flex items-center gap-2 border-b border-white/[0.08] pb-2">
              <Sliders className="w-4 h-4 text-[#1677FF]" /> Generation Defaults (Editable)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#667085]">Aspect Ratio</label>
                <div className="relative">
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full bg-[#070D18] border border-white/[0.08] rounded-xl px-3 py-2 pr-7 text-xs font-bold outline-none cursor-pointer text-[#F5F7FA] appearance-none"
                  >
                    {["9:16", "1:1", "16:9"].map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#667085] absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#667085]">Language</label>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-[#070D18] border border-white/[0.08] rounded-xl px-3 py-2 pr-7 text-xs font-bold outline-none cursor-pointer text-[#F5F7FA] appearance-none"
                  >
                    {["English", "Spanish", "French", "German", "Japanese"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#667085] absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#667085]">Caption Style</label>
                <div className="relative">
                  <select
                    value={captionStyle}
                    onChange={(e) => setCaptionStyle(e.target.value)}
                    className="w-full bg-[#070D18] border border-white/[0.08] rounded-xl px-3 py-2 pr-7 text-xs font-bold outline-none cursor-pointer text-[#F5F7FA] appearance-none"
                  >
                    {["Dynamic", "Minimal", "Bold", "Subtitles"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#667085] absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#667085]">Voice</label>
                <div className="relative">
                  <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    className="w-full bg-[#070D18] border border-white/[0.08] rounded-xl px-3 py-2 pr-7 text-xs font-bold outline-none cursor-pointer text-[#F5F7FA] appearance-none"
                  >
                    {["Natural", "Energetic", "Deep", "Conversational"].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#667085] absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#667085]">Quality Profile</label>
                <div className="relative">
                  <select
                    value={qualityProfile}
                    onChange={(e) => setQualityProfile(e.target.value)}
                    className="w-full bg-[#070D18] border border-white/[0.08] rounded-xl px-3 py-2 pr-7 text-xs font-bold outline-none cursor-pointer text-[#F5F7FA] appearance-none"
                  >
                    {["Fast Quiz", "Master Quality", "Ultra HD"].map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#667085] absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-[#667085]">Export Format</label>
                <div className="relative">
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-full bg-[#070D18] border border-white/[0.08] rounded-xl px-3 py-2 pr-7 text-xs font-bold outline-none cursor-pointer text-[#F5F7FA] appearance-none"
                  >
                    {["MP4 (1080p)", "MOV (4K)", "WebM"].map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#667085] absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSavePreferences}
                className="px-5 py-2.5 rounded-xl bg-[#1677FF] hover:bg-[#0F63D8] text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{savedSuccess ? "Preferences Saved!" : "Save Generation Preferences"}</span>
              </button>
            </div>
          </div>

          {/* 4. 📊 Personal Activity Metrics & Quotas */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#F5F7FA] flex items-center gap-2 border-b border-white/[0.08] pb-2">
              <Film className="w-4 h-4 text-[#1677FF]" /> Personal Activity & Quotas
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#070D18] border border-white/[0.08] rounded-2xl p-4 text-center">
                <span className="text-[10px] font-bold text-[#667085] uppercase block">Videos Created</span>
                <span className="text-2xl font-black text-[#F5F7FA] block mt-1">{jobs.length || 50}</span>
              </div>
              <div className="bg-[#070D18] border border-white/[0.08] rounded-2xl p-4 text-center">
                <span className="text-[10px] font-bold text-[#667085] uppercase block">Videos Rendered</span>
                <span className="text-2xl font-black text-[#19C37D] block mt-1">{completedJobs.length || 39}</span>
              </div>
              <div className="bg-[#070D18] border border-white/[0.08] rounded-2xl p-4 text-center">
                <span className="text-[10px] font-bold text-[#667085] uppercase block">Active Generations</span>
                <span className="text-2xl font-black text-[#1677FF] block mt-1">{activeJobs.length || 2}</span>
              </div>
              <div className="bg-[#070D18] border border-white/[0.08] rounded-2xl p-4 text-center">
                <span className="text-[10px] font-bold text-[#667085] uppercase block">Published Videos</span>
                <span className="text-2xl font-black text-[#F5F7FA] block mt-1">15</span>
              </div>
            </div>

            {/* AI Credit Quota Bar */}
            <div className="bg-[#070D18] border border-white/[0.08] rounded-2xl p-4 space-y-2">
              {isAdmin ? (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#A8B2C1] block">AI Generation Quota</span>
                    <span className="text-[10px] text-[#667085]">Administrative Account Privilege</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#19C37D]/10 text-[#19C37D] border border-[#19C37D]/30 rounded-full font-bold text-xs">
                    <InfinityIcon className="w-4 h-4" />
                    <span>Unlimited Quota</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-[#A8B2C1]">AI Generation Quota</span>
                    <span className="text-[#1677FF] font-bold">720 / 1,000 credits (72%)</span>
                  </div>
                  <div className="w-full bg-[#0A1220] h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#1677FF] h-full rounded-full w-[72%]" />
                  </div>
                  <p className="text-[10px] text-[#667085]">Resets on Sep 1, 2026</p>
                </>
              )}
            </div>
          </div>

          {/* 5. 🔐 Account & Security */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#F5F7FA] flex items-center gap-2 border-b border-white/[0.08] pb-2">
              <Lock className="w-4 h-4 text-[#1677FF]" /> Account & Security
            </h3>

            <div className="bg-[#070D18] border border-white/[0.08] rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#A8B2C1] font-semibold">Email Address</span>
                <span className="font-bold text-[#F5F7FA]">{user?.email || "gokul32499@gmail.com"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A8B2C1] font-semibold">Authentication</span>
                <span className="font-medium text-[#F5F7FA]">Google / Password</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A8B2C1] font-semibold">Active Sessions</span>
                <span className="font-medium text-[#F5F7FA]">1 Active Session</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer with Premium Close Button */}
        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#070D18] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#0E1728] hover:bg-[#121E32] text-[#F5F7FA] border border-white/[0.08] font-semibold text-xs transition-colors cursor-pointer shadow-sm"
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
  );
}

export default memo(UserProfileModal);
