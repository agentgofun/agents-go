import { CodeCopy } from "./Copyable";

export function CodeBlock({
  label,
  code,
  children,
}: {
  label: string;
  code: string;
  children: React.ReactNode;
}) {
  return (
    <div className="code">
      <div className="code-head">
        <span>{label}</span>
        <CodeCopy text={code} />
      </div>
      <pre>{children}</pre>
    </div>
  );
}
