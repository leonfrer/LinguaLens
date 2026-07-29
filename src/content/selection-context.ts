import { extractSentenceContext, type ExtractedSentenceContext } from '../shared/text';

/**
 * Block-level (or sectioning) elements that usually contain a full sentence.
 * Prefer these over a bare text node so inline markup does not truncate context.
 */
const CONTEXT_CONTAINER_TAGS = new Set([
  'P',
  'DIV',
  'LI',
  'TD',
  'TH',
  'TR',
  'BLOCKQUOTE',
  'PRE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'ARTICLE',
  'SECTION',
  'MAIN',
  'ASIDE',
  'HEADER',
  'FOOTER',
  'NAV',
  'FIGURE',
  'FIGCAPTION',
  'DD',
  'DT',
  'SUMMARY',
  'DETAILS',
  'BODY'
]);

function findContextContainer(node: Node): Node {
  let current: Node | null = node.nodeType === Node.ELEMENT_NODE ? node : node.parentNode;

  while (current && current !== document.documentElement) {
    if (
      current.nodeType === Node.ELEMENT_NODE &&
      CONTEXT_CONTAINER_TAGS.has((current as Element).tagName)
    ) {
      return current;
    }

    current = current.parentNode;
  }

  return node;
}

/**
 * Build sentence context for the current DOM selection.
 *
 * Uses the nearest block ancestor (not just `anchorNode`) so sentences that span
 * inline elements stay intact, and passes the selection's start offset so repeated
 * words resolve to the occurrence the user actually highlighted.
 */
export function getSentenceContextFromSelection(
  selection: Selection,
  selectedText: string
): ExtractedSentenceContext | undefined {
  if (!selection.rangeCount) {
    return undefined;
  }

  const range = selection.getRangeAt(0);
  if (range.collapsed) {
    return undefined;
  }

  const container = findContextContainer(range.commonAncestorContainer);
  const containerRange = document.createRange();

  try {
    containerRange.selectNodeContents(container);
  } catch {
    return extractSentenceContext(container.textContent ?? '', selectedText);
  }

  const sourceText = containerRange.toString();
  if (!sourceText) {
    return undefined;
  }

  let preferredStart: number | undefined;
  try {
    const prefixRange = containerRange.cloneRange();
    prefixRange.setEnd(range.startContainer, range.startOffset);
    preferredStart = prefixRange.toString().length;
  } catch {
    preferredStart = undefined;
  }

  return extractSentenceContext(sourceText, selectedText, preferredStart);
}
