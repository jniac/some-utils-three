# Three Contexts

Three Context exposes a simple API to create scenes with Three.js. They are meant
to be used across the application. They exposes core features (renderer, ticker, 
pipeline...) and useful utils related to threejs common operations (loaders...).

NOTE: Three Context is not a react context, but it works very well with it!

## Notes:

- Every object in the scene trees that has an `onTick` method will have it called 
before rendering.