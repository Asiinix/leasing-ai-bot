/** Only paragraphs and emphasis from assistant templates; HTML stays escaped by React. */
export function AssistantMessage({ text }: { text: string }) {
  return (
    <div className="assistant-message-text">
      {text.split(/\n\n+/).map((paragraph, paragraphIndex) => (
        <p key={paragraphIndex}>
          {paragraph
            .split(/(\*\*[^*]+\*\*)/g)
            .map((part, partIndex) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={partIndex}>{part.slice(2, -2)}</strong>
              ) : (
                part
              ),
            )}
        </p>
      ))}
    </div>
  );
}
