import { Construction } from 'lucide-react-native';
import * as React from 'react';

import { Card } from '@/components/ui/card';
import { PageHeader, type Crumb } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/states';
import { Page } from './Page';

/** A route that exists but whose screen is still being rebuilt in the new design. */
export function PlaceholderPage({ title, breadcrumb, meta }: { title: string; breadcrumb?: Crumb[]; meta?: string }) {
  return (
    <Page>
      <PageHeader title={title} breadcrumb={breadcrumb} meta={meta} />
      <Card>
        <EmptyState
          icon={Construction}
          title="This screen is being rebuilt"
          message="It is coming back soon in the new design. Everything already saved is safe."
        />
      </Card>
    </Page>
  );
}
