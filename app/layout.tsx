import { Metadata } from 'next';
import Script from 'next/script';
import '../styles/styles.css';

const meta = {
  description: 'Hugo Striedinger is a Colombian born Software Engineer who currently resides in New York, NY.',
  title: 'Hugo Striedinger - Software Engineer',
};

export const metadata: Metadata = {
  ...meta,
  icons: {
    apple: '/apple-touch-icon.png',
    icon: '/favicon-16x16.png',
    shortcut: '/favicon-32x32.png',
  },
  openGraph: {
    ...meta,
    images: [{
      url: 'https://striedinger.co/social.png' ,
    }],
    type: 'website',
    url: 'https://striedinger.co',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <head>
        <Script src='https://www.googletagmanager.com/gtag/js?id=UA-66744227-1' />
        <Script id='google-analytics'>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'UA-66744227-1');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
