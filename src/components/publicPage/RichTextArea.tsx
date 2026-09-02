import { useEffect, useRef } from "react";

interface RichTextAreaProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  compact?: boolean;
  autoFocus?: boolean;
}

type FormatType = "bold" | "italic" | "heading" | "list";

export const RichTextArea = ({ id, value, onChange, rows = 6, placeholder, compact = false, autoFocus = false }: RichTextAreaProps) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!autoFocus || !ref.current) return;

    const animationFrame = requestAnimationFrame(() => {
      ref.current?.focus({ preventScroll: true });
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [autoFocus]);

  const applyFormatting = (type: FormatType) => {
    const el = ref.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);

    let newValue = value;
    let newStart = start;
    let newEnd = end;

    if (type === "bold") {
      const placeholder = selected || "texte en gras";
      const replacement = `**${placeholder}**`;
      newValue = value.slice(0, start) + replacement + value.slice(end);
      newStart = selected ? start : start + 2;
      newEnd = selected ? start + replacement.length : newStart + placeholder.length;
    } else if (type === "italic") {
      const placeholder = selected || "texte en italique";
      const replacement = `*${placeholder}*`;
      newValue = value.slice(0, start) + replacement + value.slice(end);
      newStart = selected ? start : start + 1;
      newEnd = selected ? start + replacement.length : newStart + placeholder.length;
    } else if (type === "heading") {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineEndIdx = value.indexOf("\n", start);
      const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
      const lineText = value.slice(lineStart, lineEnd);

      if (lineText.startsWith("## ")) {
        newValue = value.slice(0, lineStart) + lineText.slice(3) + value.slice(lineEnd);
        newStart = Math.max(lineStart, start - 3);
        newEnd = Math.max(lineStart, end - 3);
      } else {
        newValue = value.slice(0, lineStart) + "## " + value.slice(lineStart);
        newStart = start + 3;
        newEnd = end + 3;
      }
    } else if (type === "list") {
      // Toggle "- " on every selected line (or current line if no selection)
      const selStart = value.lastIndexOf("\n", start - 1) + 1;
      const selEndIdx = value.indexOf("\n", end > start ? end - 1 : end);
      const selEnd = selEndIdx === -1 ? value.length : selEndIdx;
      const block = value.slice(selStart, selEnd);
      const blockLines = block.split("\n");
      const allBulleted = blockLines.every((l) => l.startsWith("- "));
      const toggled = blockLines.map((l) => (allBulleted ? l.slice(2) : l.startsWith("- ") ? l : `- ${l}`)).join("\n");
      const delta = toggled.length - block.length;
      newValue = value.slice(0, selStart) + toggled + value.slice(selEnd);
      newStart = selStart;
      newEnd = selStart + toggled.length;
      // keep cursor near original position
      newStart = Math.min(start + (allBulleted ? -2 : 2), newEnd);
      newEnd = Math.max(newStart, end + delta);
    }

    onChange(newValue);

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(newStart, newEnd);
    });
  };

  return (
    <div className="rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <span className="ml-2 text-xs text-gray-400 hidden sm:inline">Sélectionnez du texte, puis cliquez pour ajouter la mise en forme :</span>
        {!compact && (
          <>
            <button
              type="button"
              title="Titre de section — place le curseur sur la ligne à transformer"
              onMouseDown={(e) => {
                e.preventDefault();
                applyFormatting("heading");
              }}
              className="flex items-center justify-center px-2 h-7 rounded text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors select-none"
            >
              Titre
            </button>
            <div className="w-px h-4 bg-gray-300 mx-0.5" />
          </>
        )}
        <button
          type="button"
          title="Liste à puces — sélectionnez plusieurs lignes ou placez le curseur"
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormatting("list");
          }}
          className="flex items-center justify-center px-2 h-7 rounded text-gray-700 text-sm hover:bg-gray-200 transition-colors select-none"
        >
          • Liste
        </button>
        <div className="w-px h-4 bg-gray-300 mx-0.5" />
        <button
          type="button"
          title="Gras — sélectionnez du texte puis cliquez"
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormatting("bold");
          }}
          className="flex items-center justify-center w-7 h-7 rounded text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors select-none"
        >
          G
        </button>
        <div className="w-px h-4 bg-gray-300 mx-0.5" />
        <button
          type="button"
          title="Italique — sélectionnez du texte puis cliquez"
          onMouseDown={(e) => {
            e.preventDefault();
            applyFormatting("italic");
          }}
          className="flex items-center justify-center w-7 h-7 rounded text-gray-700 italic text-sm hover:bg-gray-200 transition-colors select-none"
        >
          i
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="block w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none resize-y bg-white"
      />
    </div>
  );
};
