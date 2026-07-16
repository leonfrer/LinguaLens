export type TextRange = {
  start: number;
  end: number;
};

export function findTextRange(context: string, selectedText: string): TextRange | undefined {
  if (!context || !selectedText) {
    return undefined;
  }

  const exactStart = context.indexOf(selectedText);

  if (exactStart >= 0) {
    return {
      start: exactStart,
      end: exactStart + selectedText.length
    };
  }

  const caseInsensitiveStart = context.toLocaleLowerCase().indexOf(selectedText.toLocaleLowerCase());

  if (caseInsensitiveStart < 0) {
    return undefined;
  }

  return {
    start: caseInsensitiveStart,
    end: caseInsensitiveStart + selectedText.length
  };
}
