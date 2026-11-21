import Head from 'expo-router/head';
import * as React from 'react';

const APP_NAME = 'HSTU Attendance Portal';

export function DocumentTitle({ page }: { page?: string }) {
  return (
    <Head>
      <title>{page ? `${page} · ${APP_NAME}` : APP_NAME}</title>
    </Head>
  );
}
