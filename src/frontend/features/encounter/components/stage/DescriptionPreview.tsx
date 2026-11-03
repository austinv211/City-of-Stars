import { useQuickView, type QuickViewSubject } from "../../context/QuickViewContext";
import { renderInline } from "./renderInline";

/**
 * An ability's text on its card: two lines, with "More" opening the full text
 * in the quick view. Without a quick view the whole text shows, as before.
 */
export function DescriptionPreview({
  text,
  subject,
  name,
}: {
  text: string;
  subject: QuickViewSubject;
  /** The ability, for the button's accessible name. */
  name: string;
}) {
  const quickView = useQuickView();
  if (!quickView) {
    return <p className="text-xs leading-relaxed text-muted-foreground">{renderInline(text)}</p>;
  }
  return (
    <div className="flex items-end gap-1.5">
      <p className="line-clamp-2 min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
        {renderInline(text)}
      </p>
      <button
        type="button"
        className="shrink-0 text-xs font-medium text-primary underline-offset-2 hover:underline"
        aria-label={`More about ${name}`}
        onClick={() => {
          quickView.open(subject);
        }}
      >
        More
      </button>
    </div>
  );
}
