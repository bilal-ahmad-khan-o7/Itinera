/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API when the client is hosted separately (e.g. https://api.example.up.railway.app) */
  readonly VITE_API_URL?: string;
}
