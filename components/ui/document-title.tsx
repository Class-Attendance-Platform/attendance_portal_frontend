import Head from 'expo-router/head';
import * as React from 'react';

/** The page's own <title> (app.json web.name); every page adds its name in front. */
const APP_NAME = 'HSTU Attendance Portal';

/**
 * The browser tab's title on the web and in the desktop app: "Courses · HSTU Attendance Portal",
 * so tabs and the browser history can be told apart. Only the screen in front sets it (expo-router's
 * Head); phones ignore it. PageHeader and PublicPage render it.
 */
export function DocumentTitle({ page }: { page?: string }) {
  return (
    <Head>
      <title>{page ? `${page} · ${APP_NAME}` : APP_NAME}</title>
    </Head>
  );
}
