import 'react/jsx-runtime';

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicAttributes {
      key?: string | number | bigint | null | undefined;
    }
  }
}
