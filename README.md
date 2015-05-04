# protractor

A JavaScript implementation of the Protractor gesture recognizer.

This package provides a JavaScript version of Yang Li's [Protractor](http://yangl.org/pdf/protractor-chi2010.pdf) gesture recognizer. The code is a close port of the [Java version](https://android.googlesource.com/platform/frameworks/base/+/master/core/java/android/gesture) that ships as part of the Google Android distribution.

## Usage

Protractor can be used both server-side and client-side. For use in node.js,
simply `npm install protractor` or include protractor as a dependency in your package.json file. For use on the client, simply import protractor.min.js in the browser.

### Usage

```javascript

```

### Gesture Training Application

A gesture training application is available online at [http://uwdata.github.io/protractor/](http://uwdata.github.io/protractor/).

The application is intended to work with both mouse and touch input. The code for the training application is included in this repository under the `trainer` folder. Simply open the `index.html` file in a browser to run locally.

## Build Process

We use the [gulp](http://gulpjs.com/) build system along with [browserify](http://browserify.org/) to build protractor.min.js.

1. Install gulp, as needed. Follow [step 1 on the Gulp Getting Started guide](https://github.com/gulpjs/gulp/blob/master/docs/getting-started.md).
2. Run `npm install` in the protractor folder to install dependencies.
3. Run `gulp`.

