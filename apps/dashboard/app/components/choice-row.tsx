import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ownlane/ui/components/select';

import { CHOICE_LABELS } from '../lib/profiles';

type ChoiceRowProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  hint?: string;
  dirty?: boolean;
};

/** A row whose value comes from a fixed set rather than free text. */
export function ChoiceRow({ label, value, options, onChange, hint, dirty }: ChoiceRowProps) {
  return (
    <div className="flex items-start gap-6 px-5 py-3">
      <span className="w-[104px] shrink-0 pt-2 text-[13px] text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1">
        <Select onValueChange={onChange} value={value || options[0]}>
          <SelectTrigger className="h-9 w-full text-[13.5px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem className="text-[13.5px]" key={option} value={option}>
                {CHOICE_LABELS[option] ?? option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hint ? <p className="mt-1.5 text-[12px] text-muted-foreground">{hint}</p> : null}
      </div>
      {dirty ? (
        <span
          className="mt-3 size-1.5 shrink-0 rounded-full bg-ownlane-orange"
          title="Unsaved change"
        />
      ) : null}
    </div>
  );
}
