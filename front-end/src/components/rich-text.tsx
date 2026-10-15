import type { RichNode } from "@/lib/rich-text";

import { Media } from "@/components/media";
import { isUploadedPhoto, safeHref } from "@/lib/rich-text";
import { photoUrl } from "@/lib/photos";

/** A photo attribute is a library slug or an uploaded data URL; anything else is dropped. */
function photoOf(node: RichNode): string | undefined {
  const photo = node.attrs?.photo;

  return typeof photo === "string" &&
    (isUploadedPhoto(photo) || photoUrl(photo))
    ? photo
    : undefined;
}

function Marked({ node }: { node: RichNode }) {
  let out: React.ReactNode = node.text ?? "";

  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        out = <strong className="font-semibold">{out}</strong>;
        break;
      case "italic":
        out = <em>{out}</em>;
        break;
      case "underline":
        out = <u>{out}</u>;
        break;
      case "strike":
        out = <s>{out}</s>;
        break;
      case "link": {
        const href = safeHref(mark.attrs?.href);

        if (href)
          out = (
            <a
              className="underline underline-offset-4"
              href={href}
              rel="noopener noreferrer"
              target="_blank"
            >
              {out}
            </a>
          );
        break;
      }
    }
  }

  return out;
}

function Inline({ nodes }: { nodes?: RichNode[] }) {
  return (nodes ?? []).map((node, i) =>
    node.type === "hardBreak" ? (
      <br key={i} />
    ) : node.type === "text" ? (
      <Marked key={i} node={node} />
    ) : null,
  );
}

function Blocks({ nodes }: { nodes?: RichNode[] }) {
  return (nodes ?? []).map((node, i) => <Block key={i} node={node} />);
}

function Block({ node }: { node: RichNode }) {
  switch (node.type) {
    case "paragraph":
      return node.content?.length ? (
        <p className="text-body leading-7">
          <Inline nodes={node.content} />
        </p>
      ) : null;
    case "heading":
      return (
        <h3 className="pt-2 font-serif text-title text-balance">
          <Inline nodes={node.content} />
        </h3>
      );
    case "bulletList":
      return (
        <ul className="flex list-disc flex-col gap-1 ps-6 text-body leading-7">
          <Blocks nodes={node.content} />
        </ul>
      );
    case "orderedList":
      return (
        <ol
          className="flex list-decimal flex-col gap-1 ps-6 text-body leading-7"
          start={
            typeof node.attrs?.start === "number" ? node.attrs.start : undefined
          }
        >
          <Blocks nodes={node.content} />
        </ol>
      );
    case "listItem":
      return (
        <li className="[&>p]:inline">
          <Blocks nodes={node.content} />
        </li>
      );
    case "blockquote":
      return (
        <blockquote className="flex flex-col gap-3 border-s-2 border-separator ps-4 font-serif text-lg italic">
          <Blocks nodes={node.content} />
        </blockquote>
      );
    case "image": {
      const photo = photoOf(node);

      return photo ? (
        <Media
          alt={typeof node.attrs?.alt === "string" ? node.attrs.alt : ""}
          className="aspect-[4/3] rounded-3xl"
          photo={photo}
        />
      ) : null;
    }
    case "horizontalRule":
      return <hr className="border-separator" />;
    default:
      return <Blocks nodes={node.content} />;
  }
}

/**
 * Renders a long story (Tiptap JSON) for guests from a fixed list of nodes and marks, in the
 * story sheet's typography: serif headings, body text, rounded 4:3 photos. Nothing is
 * injected as HTML; links keep only http(s) and mailto.
 */
export function RichText({ doc }: { doc: RichNode }) {
  return (
    <div className="flex flex-col gap-4">
      <Blocks nodes={doc.content} />
    </div>
  );
}
