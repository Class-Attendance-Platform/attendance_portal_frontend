import Head from 'expo-router/head';
import * as React from 'react';

const APP_NAME = 'HSTU Attendance Portal';

export function DocumentTitle(_props: { page?: string }) {
  return (
    <Head>
      <title>{APP_NAME}</title>
    </Head>
  );
}
