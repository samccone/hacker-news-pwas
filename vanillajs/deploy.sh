set -e
set -o pipefail

cp app/app.js app/tmp.js

echo "compiling code \o/"
./node_modules/.bin/google-closure-compiler --externs=app/externs.js --js=app/tmp.js --language_in=ECMASCRIPT_2019 --language_out=ECMASCRIPT_2019 --compilation_level ADVANCED_OPTIMIZATIONS --browser_featureset_year=2020 --rewrite_polyfills=false > app/cc.js
ls -la app/cc.js
#echo "deploying"
#yarn run deploy-now

#echo "cleaning up"
#git reset --hard
