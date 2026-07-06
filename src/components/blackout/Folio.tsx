/**
 * Folio — the dossier section header. Every BLACKOUT page numbers its sections
 * like a case file: `01 · The focus` + a hairline rule + a mono process tag.
 * See docs/design/BLACKOUT_ROLLOUT.md (signature 3: the dossier grammar).
 */

interface FolioProps {
  index: string;
  title: string;
  tag?: string;
}

export function Folio({ index, title, tag }: FolioProps) {
  return (
    <div className="bk-folio">
      <span className="num">{index}</span>
      <h2>{title}</h2>
      <div className="rule" />
      {tag && <span className="tag">{tag}</span>}
    </div>
  );
}
