import { Crypto } from '@peculiar/webcrypto';

// Polyfill for crypto which isn't present globally in jsdom
(window.crypto as any) = new Crypto();
