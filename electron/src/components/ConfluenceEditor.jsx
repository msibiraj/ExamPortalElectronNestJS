import { useRef, useState, useCallback, useEffect } from 'react';

// ── Toolbar helpers ───────────────────────────────────────────────────────────
function Btn({ title, active, onMouseDown, children }) {
  return (
    <button
      title={title}
      onMouseDown={onMouseDown}
      className={`rounded px-2 py-1 text-xs font-medium select-none transition-colors ${
        active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-gray-300 mx-1 shrink-0" />;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ConfluenceEditor({ value, onChange, placeholder = 'Start writing your answer…' }) {
  const editorRef = useRef(null);
  const [states, setStates] = useState({});

  /* Run a document.execCommand and notify parent */
  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    onChange?.(editorRef.current?.innerHTML ?? '');
    refresh();
  }, [onChange]);

  /* Sync toolbar active-state indicators */
  const refresh = () => {
    try {
      setStates({
        bold:               document.queryCommandState('bold'),
        italic:             document.queryCommandState('italic'),
        underline:          document.queryCommandState('underline'),
        strikeThrough:      document.queryCommandState('strikeThrough'),
        insertUnorderedList:document.queryCommandState('insertUnorderedList'),
        insertOrderedList:  document.queryCommandState('insertOrderedList'),
      });
    } catch (_) {}
  };

  /* Populate editor with initial value only on first mount */
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value ?? '';
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Prevent default on toolbar buttons so the editor keeps focus */
  const md = (cmd, val = null) => (e) => { e.preventDefault(); exec(cmd, val); };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center flex-wrap gap-0.5 border-b border-gray-200 bg-[#f4f5f7] px-3 py-1.5 shrink-0">

        {/* Paragraph style */}
        <select
          className="rounded border border-gray-300 bg-white text-xs text-gray-700 px-2 py-1 focus:outline-none mr-1"
          onChange={(e) => { exec('formatBlock', e.target.value); e.target.value = ''; }}
          defaultValue=""
        >
          <option value="" disabled>Style</option>
          <option value="p">Normal text</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="pre">Code block</option>
          <option value="blockquote">Quote</option>
        </select>

        <Sep />

        {/* Inline formatting */}
        <Btn title="Bold (Ctrl+B)"      active={states.bold}          onMouseDown={md('bold')}>
          <strong>B</strong>
        </Btn>
        <Btn title="Italic (Ctrl+I)"    active={states.italic}        onMouseDown={md('italic')}>
          <em>I</em>
        </Btn>
        <Btn title="Underline (Ctrl+U)" active={states.underline}     onMouseDown={md('underline')}>
          <span className="underline">U</span>
        </Btn>
        <Btn title="Strikethrough"      active={states.strikeThrough} onMouseDown={md('strikeThrough')}>
          <span className="line-through">S</span>
        </Btn>

        <Sep />

        {/* Lists */}
        <Btn title="Bullet list"   active={states.insertUnorderedList} onMouseDown={md('insertUnorderedList')}>
          ≡
        </Btn>
        <Btn title="Numbered list" active={states.insertOrderedList}   onMouseDown={md('insertOrderedList')}>
          1.
        </Btn>

        <Sep />

        {/* Extras */}
        <Btn title="Indent"   active={false} onMouseDown={md('indent')}>→</Btn>
        <Btn title="Outdent"  active={false} onMouseDown={md('outdent')}>←</Btn>

        <Sep />

        <Btn title="Horizontal rule" active={false} onMouseDown={md('insertHorizontalRule')}>—</Btn>
        <Btn title="Remove formatting" active={false} onMouseDown={md('removeFormat')}>Tx</Btn>
      </div>

      {/* ── Page canvas ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] py-8 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded shadow-sm min-h-full px-12 py-10">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder={placeholder}
            className="cf-content"
            onInput={(e) => onChange?.(e.currentTarget.innerHTML)}
            onKeyUp={refresh}
            onMouseUp={refresh}
            onSelect={refresh}
          />
        </div>
      </div>

    </div>
  );
}
