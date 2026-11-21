import * as React from 'react';
import { View } from 'react-native';

import { FormHeading } from '@/components/auth/forms';
import { PublicPage } from '@/components/layout/PublicPage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import {
  builtInServerAddress,
  clearServerAddress,
  getServerAddress,
  normalizeServerAddress,
  readSavedServerAddress,
  saveServerAddress,
} from '@/lib/server-address';

function reload() {
  if (typeof window !== 'undefined') window.location.reload();
}

export default function ServerAddressScreen() {
  const [value, setValue] = React.useState(() => getServerAddress());
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const isSaved = readSavedServerAddress() !== '';
  const fallback = builtInServerAddress();

  function save() {
    const normalized = normalizeServerAddress(value);
    if (!normalized) {
      setError('Enter a full address, starting with http:// or https://.');
      return;
    }
    setError(null);
    saveServerAddress(normalized);
    setValue(normalized);
    setSaved(true);
    setTimeout(reload, 600);
  }

  function useDefault() {
    clearServerAddress();
    setSaved(true);
    setTimeout(reload, 300);
  }

  return (
    <PublicPage title="Server address" width="wide">
      <Card className="gap-5">
        <FormHeading
          title="Server address"
          lead="The web address of the attendance server this app talks to. Leave empty to use the one it was set up with."
        />

        {saved ? <Notice tone="success" message="Saved. The app is starting again…" live /> : null}
        {error ? <Notice tone="error" message={error} live /> : null}

        <View className="gap-4">
          <TextField
            label="Server address"
            value={value}
            onChangeText={(text) => setValue(text)}
            placeholder="https://attendanceportal.example.com"
            keyboardType="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect={false}
            error={error}
            disabled={saved}
            onSubmitEditing={save}
            returnKeyType="go"
          />
          <Text variant="small" tone="muted">
            {fallback ? `Built-in address: ${fallback}` : 'Built-in address: this page’s own address'}
            {isSaved ? ' · Currently overridden by a saved address.' : ''}
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-3">
          <Button label="Save and restart" variant="primary" onPress={save} disabled={saved} />
          <Button label="Use built-in address" variant="secondary" onPress={useDefault} disabled={saved || !isSaved} />
          <Button label="Cancel" variant="quiet" onPress={reload} disabled={saved} />
        </View>
      </Card>
    </PublicPage>
  );
}
