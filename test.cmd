@echo off
pushd output
call ..\node_modules\.bin\mocha --ui tdd --colors %*
popd