import * as React from 'react';

import { PlaceholderPage } from '@/components/layout/PlaceholderPage';

/** /admin/students/import: CSV / XLSX import with a dry run. */
export default function AdminStudentImport() {
  return (
    <PlaceholderPage
      title="Import students"
      breadcrumb={[
        { label: 'Students', href: '/admin/students' },
        { label: 'Import' },
      ]}
    />
  );
}
