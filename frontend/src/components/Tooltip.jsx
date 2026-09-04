export function Tooltip({ text, label = 'More info' }) {
  return (
    <span className="tooltip">
      <button
        type="button"
        className="tooltip__trigger"
        aria-label={label}
        title={text}
      >
        ?
      </button>
      <span className="tooltip__bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}
