"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const components = {
  h1: (p) => <h1 className="text-xl font-bold text-white mt-4 mb-2 border-b border-gray-700 pb-1" {...p} />,
  h2: (p) => <h2 className="text-base font-semibold text-emerald-400 uppercase tracking-wider mt-4 mb-2" {...p} />,
  h3: (p) => <h3 className="text-sm font-semibold text-gray-200 mt-3 mb-1" {...p} />,
  p: (p) => <p className="text-sm text-gray-300 leading-relaxed mb-2" {...p} />,
  ul: (p) => <ul className="list-disc list-outside ml-5 text-sm text-gray-300 space-y-1 mb-2" {...p} />,
  ol: (p) => <ol className="list-decimal list-outside ml-5 text-sm text-gray-300 space-y-1 mb-2" {...p} />,
  li: (p) => <li className="text-sm text-gray-300 marker:text-gray-600" {...p} />,
  strong: (p) => <strong className="text-white font-semibold" {...p} />,
  em: (p) => <em className="text-gray-200 italic" {...p} />,
  code: (p) => (
    <code className="text-amber-300 bg-gray-800 rounded px-1 py-0.5 text-xs font-mono" {...p} />
  ),
  hr: () => <hr className="border-gray-800 my-3" />,
  table: (p) => (
    <div className="overflow-x-auto my-2">
      <table className="text-xs text-gray-300 border border-gray-800 w-full" {...p} />
    </div>
  ),
  thead: (p) => <thead className="bg-gray-800" {...p} />,
  th: (p) => <th className="border border-gray-800 px-2 py-1 text-left text-emerald-300 font-semibold" {...p} />,
  td: (p) => <td className="border border-gray-800 px-2 py-1 align-top" {...p} />,
  blockquote: (p) => (
    <blockquote className="border-l-2 border-amber-500 pl-3 text-gray-400 italic my-2" {...p} />
  ),
};

export default function Markdown({ children }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
