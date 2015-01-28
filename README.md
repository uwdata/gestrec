# protractor
A JavaScript implementation of the Protractor gesture recognizer.

This package provides a JavaScript version of Yang Li's [Protractor](http://yangl.org/pdf/protractor-chi2010.pdf) gesture recognizer. The code is a close port of the [Java version](https://android.googlesource.com/platform/frameworks/base/+/master/core/java/android/gesture) that ships as part of the Google Android distribution.

### Build Process

To build the code, run the makefile (`make`) within the top directory. Running
the build process is only necessary if you want to modify the source code and
rebuild the `protractor.js` and `protractor.min.js` files.

The JavaScript build process depends on supporting node.js modules. First,
make sure you have node.js and npm (Node Package Manager) installed and
accessible from the command line. Run `make install` to install these modules
into a local node_modules folder. The make install command will create the
node_modules folder if it does not exist.

### Testing

A simple gesture training application is included for testing purposes under the `test` folder. Simply open the `test.html` file in a browser to run.
