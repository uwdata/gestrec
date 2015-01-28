# See the README for installation instructions.

NODE_PATH ?= ./node_modules
JS_COMPILER = $(NODE_PATH)/uglify-js/bin/uglifyjs
LOCALE ?= en_US

.PHONY: all test clean install

all: \
	protractor.js \
	protractor.min.js

protractor.js: \
	js/RectF.js \
	js/OrientedBoundingBox.js \
	js/Prediction.js \
	js/GestureConstants.js \
	js/GesturePoint.js \
	js/GestureStroke.js \
	js/Gesture.js \
	js/GestureStore.js \
	js/GestureUtils.js \
	js/Instance.js \
	js/Learner.js \
	js/InstanceLearner.js

%.min.js: %.js Makefile
	@rm -f $@
	$(JS_COMPILER) < $< > $@

protractor.js: Makefile
	@rm -f $@
	cat $(filter %.js,$^) > $@
	@chmod a-w $@

install:
	mkdir -p node_modules
	npm install

test: all
	@npm test

clean:
	rm -f protractor*.js
