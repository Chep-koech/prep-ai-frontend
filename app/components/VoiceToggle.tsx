"use client";

type Props = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  speaking?: boolean;
  onStopSpeaking?: () => void;
  voices?: SpeechSynthesisVoice[];
  selectedVoiceName?: string | null;
  onSelectVoice?: (name: string) => void;
  onPreviewVoice?: () => void;
};

export default function VoiceToggle({
  enabled,
  onChange,
  speaking,
  onStopSpeaking,
  voices = [],
  selectedVoiceName,
  onSelectVoice,
  onPreviewVoice,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {enabled && voices.length > 0 && onSelectVoice && (
        <>
          <select
            value={selectedVoiceName ?? ""}
            onChange={(e) => onSelectVoice(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 max-w-[200px]"
            title="Pick a voice for Q"
          >
            <option value="">Best available</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
          {onPreviewVoice && (
            <button
              onClick={onPreviewVoice}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Preview
            </button>
          )}
        </>
      )}
      {speaking && (
        <button
          onClick={onStopSpeaking}
          className="text-xs text-amber-400 hover:text-amber-300 underline"
        >
          Stop talking
        </button>
      )}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <span className="text-sm text-gray-300">Voice mode</span>
        <span
          className={`relative inline-block h-6 w-11 rounded-full transition ${
            enabled ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
              enabled ? "left-5" : "left-0.5"
            }`}
          />
        </span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
      </label>
    </div>
  );
}
