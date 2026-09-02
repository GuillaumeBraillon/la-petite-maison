import { Fragment } from "react";

interface MarkdownContentProps {
  text: string;
  className?: string;
}

// Parses **gras** and *italique* within a single line
const parseInline = (text: string, lineKey: number): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|(https?:\/\/[^\s<]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<Fragment key={`${lineKey}-t${i++}`}>{text.slice(lastIndex, match.index)}</Fragment>);
    }
    if (match[1] !== undefined) {
      parts.push(
        <strong key={`${lineKey}-b${i++}`} className="font-semibold text-gray-900">
          {match[1]}
        </strong>
      );
    } else if (match[2] !== undefined) {
      parts.push(<em key={`${lineKey}-i${i++}`}>{match[2]}</em>);
    } else {
      const url = match[3].replace(/[),.!?;:]+$/, "");
      parts.push(
        <a
          key={`${lineKey}-u${i++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-primary-700 underline hover:text-primary-900"
        >
          {url}
        </a>
      );
      const trailingText = match[3].slice(url.length);
      if (trailingText) {
        parts.push(trailingText);
      }
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(<Fragment key={`${lineKey}-t${i++}`}>{text.slice(lastIndex)}</Fragment>);
  }

  return <>{parts}</>;
};

// Groups consecutive "- " lines into a <ul>
type Block =
  | { type: "heading"; text: string; key: number }
  | { type: "blank"; key: number }
  | { type: "paragraph"; text: string; key: number }
  | { type: "list"; items: { text: string; key: number }[] };

const buildBlocks = (lines: string[]): Block[] => {
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      blocks.push({ type: "heading", text: line.slice(3), key: i });
      i++;
    } else if (line.startsWith("- ")) {
      const items: { text: string; key: number }[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push({ text: lines[i].slice(2), key: i });
        i++;
      }
      blocks.push({ type: "list", items });
    } else if (line.trim() === "") {
      blocks.push({ type: "blank", key: i });
      i++;
    } else {
      blocks.push({ type: "paragraph", text: line, key: i });
      i++;
    }
  }
  return blocks;
};

export const MarkdownContent = ({ text, className }: MarkdownContentProps) => {
  const blocks = buildBlocks(text.split("\n"));

  return (
    <div className={className}>
      {blocks.map((block, bi) => {
        if (block.type === "heading") {
          return (
            <h3 key={block.key} className="text-base font-semibold text-gray-900 mt-4 mb-0.5 first:mt-0">
              {parseInline(block.text, block.key)}
            </h3>
          );
        }
        if (block.type === "blank") {
          return <div key={block.key} className="h-1.5" />;
        }
        if (block.type === "list") {
          return (
            <ul key={`list-${bi}`} className="space-y-0.5 my-1">
              {block.items.map((item) => (
                <li key={item.key} className="flex items-start gap-2 text-gray-700 leading-relaxed">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>{parseInline(item.text, item.key)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={block.key} className="text-gray-700 leading-relaxed">
            {parseInline(block.text, block.key)}
          </p>
        );
      })}
    </div>
  );
};
