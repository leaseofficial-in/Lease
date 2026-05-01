import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#1A56FF" />
        <meta name="description" content="Flatvio — Renting made trustworthy. Manage rent, deposits, move-in proof, and repairs in one place." />
        <meta property="og:title" content="Flatvio" />
        <meta property="og:description" content="The all-in-one app for landlords and tenants." />
        <meta property="og:type" content="website" />
        <title>Flatvio — Renting made trustworthy</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{
          __html: `
            html, body { height: 100%; margin: 0; padding: 0; }
            body { background-color: #E8EAED; -webkit-font-smoothing: antialiased; }
            #root { height: 100%; display: flex; }
            * { box-sizing: border-box; }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
