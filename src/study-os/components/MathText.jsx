/**
 * Renders text with LaTeX math: $...$ (inline) and $$...$$ (display).
 * Uses KaTeX so formulas show correctly instead of raw $...$ markup.
 */
import katex from 'katex'
import 'katex/dist/katex.min.css'

function renderLatex(latex, displayMode) {
  try {
    return katex.renderToString(latex.trim(), {
      throwOnError: false,
      displayMode,
      output: 'html',
    })
  } catch (_) {
    return latex
  }
}

/**
 * @param {string} text - Raw text possibly containing $...$ and $$...$$
 * @param {string} [className] - Optional class for the wrapper
 * @param {boolean} [block] - If true, wrapper is block (div); otherwise inline (span)
 */
export function MathText({ text, className, block: isBlock }) {
  if (text == null || typeof text !== 'string') return null

  const Wrapper = isBlock ? 'div' : 'span'
  const parts = []
  let lastIndex = 0

  // Match $$...$$ first (display), then $...$ (inline). Inline uses [^$]* so content has no $.
  const combined = /\$\$([\s\S]*?)\$\$|\$([^$]*?)\$/g
  let match
  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    if (match[1] !== undefined) {
      parts.push({ type: 'display', content: renderLatex(match[1], true) })
    } else {
      parts.push({ type: 'inline', content: renderLatex(match[2], false) })
    }
    lastIndex = combined.lastIndex
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) })
  }

  if (parts.length === 0) return <Wrapper className={className}>{text}</Wrapper>
  if (parts.length === 1 && parts[0].type === 'text') {
    return <Wrapper className={className}>{parts[0].content}</Wrapper>
  }

  return (
    <Wrapper className={className}>
      {parts.map((part, i) => {
        if (part.type === 'text') return <span key={i}>{part.content}</span>
        if (part.type === 'display') {
          return (
            <span
              key={i}
              className="so-math-display"
              dangerouslySetInnerHTML={{ __html: part.content }}
            />
          )
        }
        return (
          <span
            key={i}
            className="so-math-inline"
            dangerouslySetInnerHTML={{ __html: part.content }}
          />
        )
      })}
    </Wrapper>
  )
}

export default MathText
