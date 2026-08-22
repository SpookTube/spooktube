"use client";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theaterEnabled: boolean;
  setTheaterEnabled: (v: boolean) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  theaterEnabled,
  setTheaterEnabled,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#111",
          border: "1px solid #333",
          padding: 24,
          borderRadius: 8,
          minWidth: 280,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 18, margin: 0, borderBottom: "1px solid #333", paddingBottom: 8 }}>
          ⚙️ Player Settings
        </h2>

        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
          <span>🎬 Theater Mode</span>
          <input
            type="checkbox"
            checked={theaterEnabled}
            onChange={(e) => setTheaterEnabled(e.target.checked)}
          />
        </label>

        <button className="btn" onClick={onClose} style={{ marginTop: 8 }}>
          Close
        </button>
      </div>
    </div>
  );
}