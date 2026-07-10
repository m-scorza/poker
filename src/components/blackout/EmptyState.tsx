export interface EmptyStateCta {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface EmptyStateProps {
  folio: string;
  message: string;
  cta?: EmptyStateCta;
}

export function EmptyState({ folio, message, cta }: EmptyStateProps) {
  return (
    <div className="bk-empty">
      <span className="bk-empty-folio">{folio}</span>
      <p className="bk-empty-msg">{message}</p>
      {cta &&
        (cta.href ? (
          <a className="bk-cta bk-empty-cta" href={cta.href}>
            <span>{cta.label}</span>
            <span className="arr">→</span>
          </a>
        ) : (
          <button type="button" className="bk-cta bk-empty-cta" onClick={cta.onClick}>
            <span>{cta.label}</span>
            <span className="arr">→</span>
          </button>
        ))}
    </div>
  );
}
