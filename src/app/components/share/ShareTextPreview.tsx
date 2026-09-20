/** Deck chrome + read-only preview of the plaintext used by copy / mail / SMS. */
export function ShareTextPreview({
  heading,
  subtitle,
  text,
}: {
  /** UI-only — not included in the shared message. */
  heading: string;
  /** Scope / step line under the heading — also UI-only. */
  subtitle: string;
  text: string;
}) {
  return (
    <div className="share-text-preview-block">
      <header className="share-text-preview-block__intro">
        <h2 className="share-text-preview-block__heading">{heading}</h2>
        <p className="share-text-preview-block__subtitle">{subtitle}</p>
      </header>
      <pre className="share-text-preview" aria-readonly>
        {text}
      </pre>
    </div>
  );
}
