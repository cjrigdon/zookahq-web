import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

export type AddressKeys = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
};

export const leadAddressKeys: AddressKeys = {
  line1: 'account_address',
  line2: 'account_address_2',
  city: 'account_city',
  state: 'account_state',
  zip: 'account_postal_code',
};

export const accountAddressKeys: AddressKeys = {
  line1: 'billing_address',
  line2: 'address_2',
  city: 'city',
  state: 'state',
  zip: 'postal_code',
};

type Suggestion = {
  label: string;
  address: string;
  address_2: string;
  city: string;
  state: string;
  zip: string;
};

const inputClass = 'w-full rounded-md border border-slate-300 px-3 py-2';

export function formatAddressLines(
  record: Record<string, unknown>,
  keys: AddressKeys,
  country?: string | null,
): string[] {
  const line1 = String(record[keys.line1] ?? '').trim();
  const line2 = String(record[keys.line2] ?? '').trim();
  const city = String(record[keys.city] ?? '').trim();
  const state = String(record[keys.state] ?? '').trim();
  const zip = String(record[keys.zip] ?? '').trim();
  const countryLine = (country ?? '').trim();

  const cityStateZip = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  return [line1, line2, cityStateZip, countryLine].filter(Boolean);
}

export function AddressFields({
  values,
  keys,
  onChange,
  disabled,
  groupLabel = 'Address',
}: {
  values: Record<string, string>;
  keys: AddressKeys;
  onChange: (patch: Record<string, string>) => void;
  disabled?: boolean;
  groupLabel?: string;
}) {
  const line1 = values[keys.line1] ?? '';
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const skipSearch = useRef(false);

  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }

    const q = line1.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const handle = window.setTimeout(() => {
      api<{ data: Suggestion[] }>(`/public/address-suggestions?q=${encodeURIComponent(q)}`)
        .then((res) => {
          setSuggestions(res.data ?? []);
          setOpen((res.data ?? []).length > 0);
        })
        .catch(() => {
          setSuggestions([]);
          setOpen(false);
        });
    }, 300);

    return () => window.clearTimeout(handle);
  }, [line1]);

  function apply(suggestion: Suggestion) {
    skipSearch.current = true;
    onChange({
      [keys.line1]: suggestion.address,
      [keys.city]: suggestion.city,
      [keys.state]: suggestion.state,
      [keys.zip]: suggestion.zip,
    });
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className="space-y-2 md:col-span-2">
      {groupLabel ? (
        <span className="block text-sm text-slate-600">{groupLabel}</span>
      ) : null}
      <div className="relative">
        <input
          className={inputClass}
          value={line1}
          disabled={disabled}
          autoComplete="off"
          placeholder="Street address"
          aria-label="Street address"
          onChange={(e) => onChange({ [keys.line1]: e.target.value })}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {suggestions.map((suggestion) => (
              <li key={suggestion.label}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-support/60"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => apply(suggestion)}
                >
                  {suggestion.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <input
        className={inputClass}
        value={values[keys.line2] ?? ''}
        disabled={disabled}
        placeholder="Apt, suite, etc."
        aria-label="Address line 2"
        onChange={(e) => onChange({ [keys.line2]: e.target.value })}
      />
      <div className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem]">
        <input
          className={inputClass}
          value={values[keys.city] ?? ''}
          disabled={disabled}
          placeholder="City"
          aria-label="City"
          onChange={(e) => onChange({ [keys.city]: e.target.value })}
        />
        <input
          className={inputClass}
          value={values[keys.state] ?? ''}
          disabled={disabled}
          placeholder="State"
          aria-label="State"
          onChange={(e) => onChange({ [keys.state]: e.target.value })}
        />
        <input
          className={inputClass}
          value={values[keys.zip] ?? ''}
          disabled={disabled}
          placeholder="ZIP"
          aria-label="ZIP"
          onChange={(e) => onChange({ [keys.zip]: e.target.value })}
        />
      </div>
    </div>
  );
}

export function addressFieldValues(record: Record<string, unknown>, keys: AddressKeys) {
  const lines = formatAddressLines(record, keys);
  return [{ label: 'Address', value: lines.length ? lines.join('\n') : null }];
}
