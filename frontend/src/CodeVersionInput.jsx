function CodeVersionInput({ id, label, description, value, onChange, placeholder }) {
  return (
    <div className="editor-card">
      <label htmlFor={id}>{label}</label>
      <p className="editor-description" id={`${id}-description`}>
        {description}
      </p>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        spellCheck="false"
        aria-describedby={`${id}-description`}
      />
    </div>
  )
}

export default CodeVersionInput
