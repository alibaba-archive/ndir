TESTS =
TIMEOUT = 5000
REPORTER = spec
MOCHAOPTS=

build:
	@node ./node_modules/jscexc/ -i ./lib/ndir.js -o ./lib/ndir_.js

test: build
	@NODE_ENV=test ./node_modules/mocha/bin/mocha \
		--reporter $(REPORTER) --timeout $(TIMEOUT) $(MOCHAOPTS) $(TESTS)

test-cov: lib-cov
	@NDIR_COV=1 $(MAKE) test
	@NDIR_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html

lib-cov:
	@rm -rf lib-cov
	@jscoverage lib lib-cov

clean:
	@rm -rf lib-cov
	@rm -f coverage.html

.PHONY: build test test-cov lib-cov clean
