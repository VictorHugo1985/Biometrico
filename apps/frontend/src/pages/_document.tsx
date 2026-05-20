import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        <link rel="stylesheet" href="https://unpkg.com/primereact/resources/themes/lara-light-blue/theme.css" />
        <link rel="stylesheet" href="https://unpkg.com/primereact/resources/primereact.min.css" />
        <link rel="stylesheet" href="https://unpkg.com/primeicons/primeicons.css" />
        <link rel="stylesheet" href="https://unpkg.com/primeflex/primeflex.css" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
