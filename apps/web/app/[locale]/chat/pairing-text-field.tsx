import { IosListSection } from "../../../components/ios/ios-list-section";

interface PairingTextFieldProps {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}

/** A grouped cell for pasting a pairing code received from another device. */
export function PairingTextField({ id, label, onChange, value }: PairingTextFieldProps) {
  return (
    <IosListSection className="px-0" header={<label htmlFor={id}>{label}</label>}>
      <li className="flex">
        <textarea
          id={id}
          value={value}
          onChange={function updateValue(event) {
            onChange(event.currentTarget.value);
          }}
          placeholder="nearby1c.…"
          rows={3}
          autoCapitalize="off"
          autoComplete="off"
          spellCheck={false}
          className="min-h-24 w-full resize-none bg-transparent px-4 py-3 font-mono text-[16px] leading-[21px] break-all text-(--ios-label) outline-none placeholder:text-(--ios-tertiary-label)"
        />
      </li>
    </IosListSection>
  );
}
